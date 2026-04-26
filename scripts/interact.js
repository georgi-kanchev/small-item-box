let isPanning = false;
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let resizeStart = null;
let dragOffset = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let hoveredBox = null;
let hoveredHandle = null;
let activeSnapX = null;
let activeSnapY = null;

const MIN_BOX_SIZE = 4;
const SNAP_PX = 8; // screen-space snap threshold

const HANDLE_CURSORS = {
    nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
    e: 'e-resize', se: 'se-resize', s: 's-resize',
    sw: 'sw-resize', w: 'w-resize',
};

function getResizeHandles(box) {
    const r = resolveBox(box);
    return {
        nw: { x: r.x,         y: r.y         },
        n:  { x: r.x + r.w/2, y: r.y         },
        ne: { x: r.x + r.w,   y: r.y         },
        e:  { x: r.x + r.w,   y: r.y + r.h/2 },
        se: { x: r.x + r.w,   y: r.y + r.h   },
        s:  { x: r.x + r.w/2, y: r.y + r.h   },
        sw: { x: r.x,         y: r.y + r.h   },
        w:  { x: r.x,         y: r.y + r.h/2 },
    };
}

function getHandleAt(world, box) {
    const hitRadius = 7 / camera.zoom;
    const handles = getResizeHandles(box);
    for (const [name, pos] of Object.entries(handles)) {
        if (Math.abs(world.x - pos.x) <= hitRadius && Math.abs(world.y - pos.y) <= hitRadius)
            return name;
    }
    return null;
}

function applyResize(box, handle, dx, dy, start) {
    let { x, y, w, h } = start;

    if (handle.includes('w')) { x += dx; w -= dx; }
    if (handle.includes('e')) { w += dx; }
    if (handle.includes('n')) { y += dy; h -= dy; }
    if (handle.includes('s')) { h += dy; }

    if (w < MIN_BOX_SIZE) {
        if (handle.includes('w')) x = start.x + start.w - MIN_BOX_SIZE;
        w = MIN_BOX_SIZE;
    }
    if (h < MIN_BOX_SIZE) {
        if (handle.includes('n')) y = start.y + start.h - MIN_BOX_SIZE;
        h = MIN_BOX_SIZE;
    }

    box.x = x; box.y = y; box.w = w; box.h = h;
}

function getSnapTargets(excludeBox) {
    const xs = [], ys = [];
    const forbidden = new Set([excludeBox]);
    for (const b of boxes) {
        if (b === excludeBox) continue;
        if (!b.visible && !b.isScreen) continue;
        const r = resolveBox(b, 0, forbidden);
        xs.push(r.x, r.x + r.w / 2, r.x + r.w);
        ys.push(r.y, r.y + r.h / 2, r.y + r.h);
    }
    return { xs, ys };
}

function findBestSnap(candidates, targets, threshold) {
    let bestDist = threshold;
    let best = null;
    for (const c of candidates) {
        for (const t of targets) {
            const dist = Math.abs(c - t);
            if (dist < bestDist) { bestDist = dist; best = { delta: t - c, snapAt: t }; }
        }
    }
    return best;
}

function snapDrag(box) {
    const threshold = SNAP_PX / camera.zoom;
    const { xs, ys } = getSnapTargets(box);
    const r = resolveBox(box);

    const sx = findBestSnap([r.x, r.x + r.w / 2, r.x + r.w], xs, threshold);
    const sy = findBestSnap([r.y, r.y + r.h / 2, r.y + r.h], ys, threshold);

    activeSnapX = sx ? sx.snapAt : null;
    activeSnapY = sy ? sy.snapAt : null;

    if (sx) box.x += sx.delta;
    if (sy) box.y += sy.delta;
}

function snapResize(box, handle) {
    const threshold = SNAP_PX / camera.zoom;
    const { xs, ys } = getSnapTargets(box);
    const r = resolveBox(box);

    const snapX = handle.includes('w') ? findBestSnap([r.x], xs, threshold)
                : handle.includes('e') ? findBestSnap([r.x + r.w], xs, threshold)
                : null;
    const snapY = handle.includes('n') ? findBestSnap([r.y], ys, threshold)
                : handle.includes('s') ? findBestSnap([r.y + r.h], ys, threshold)
                : null;

    activeSnapX = snapX ? snapX.snapAt : null;
    activeSnapY = snapY ? snapY.snapAt : null;

    if (snapX) {
        if (handle.includes('w')) {
            const newX = box.x + snapX.delta;
            const newW = box.w - snapX.delta;
            if (newW >= MIN_BOX_SIZE) { box.x = newX; box.w = newW; }
        } else {
            const newW = box.w + snapX.delta;
            if (newW >= MIN_BOX_SIZE) box.w = newW;
        }
    }
    if (snapY) {
        if (handle.includes('n')) {
            const newY = box.y + snapY.delta;
            const newH = box.h - snapY.delta;
            if (newH >= MIN_BOX_SIZE) { box.y = newY; box.h = newH; }
        } else {
            const newH = box.h + snapY.delta;
            if (newH >= MIN_BOX_SIZE) box.h = newH;
        }
    }
}

function clampBoxScroll(box) {
    if (!box.items?.length) return;
    const b = getScrollBounds(box);
    if (!b) { box.scrollX = 0; box.scrollY = 0; return; }
    box.scrollX = Math.max(0, Math.min(b.maxScrollX, box.scrollX ?? b.maxScrollX * b.alignX));
    box.scrollY = Math.max(0, Math.min(b.maxScrollY, box.scrollY ?? b.maxScrollY * b.alignY));
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
        isPanning = true;
    } else if (e.button === 0) {
        const world = screenToWorld(e.clientX, e.clientY, canvas);
        const selectedItem = document.querySelector('.box-item.selected');
        const selectedBox = selectedItem?._box ?? null;

        const handle = selectedBox && !selectedBox.isScreen ? getHandleAt(world, selectedBox) : null;
        if (handle) {
            isResizing = true;
            resizeHandle = handle;
            resizeStart = { mouseX: world.x, mouseY: world.y, box: { ...selectedBox } };
        } else {
            const hit = boxes.findLast(b => {
                if (b.isScreen || !b.visible) return false;
                const r = resolveBox(b);
                return world.x >= r.x && world.x <= r.x + r.w &&
                       world.y >= r.y && world.y <= r.y + r.h;
            });
            if (hit) {
                const item = [...boxList.querySelectorAll('.box-item')].find(i => i._box === hit);
                if (item) select(item);
                isDragging = true;
                const hr = resolveBox(hit);
                dragOffset = { x: world.x - hr.x, y: world.y - hr.y };
                canvas.style.cursor = 'grabbing';
            } else {
                select(null);
            }
        }
    }
    lastMousePos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        camera.x += e.clientX - lastMousePos.x;
        camera.y += e.clientY - lastMousePos.y;
        lastMousePos = { x: e.clientX, y: e.clientY };
        drawView();
    } else if (isResizing) {
        const world = screenToWorld(e.clientX, e.clientY, canvas);
        const selectedItem = document.querySelector('.box-item.selected');
        if (selectedItem?._box) {
            const box = selectedItem._box;
            const dx = world.x - resizeStart.mouseX;
            const dy = world.y - resizeStart.mouseY;
            applyResize(box, resizeHandle, dx, dy, resizeStart.box);
            snapResize(box, resizeHandle);
            canvas.style.cursor = HANDLE_CURSORS[resizeHandle];
            updateInspectorDimensions();
            drawView();
        }
    } else if (isDragging) {
        const world = screenToWorld(e.clientX, e.clientY, canvas);
        const selectedItem = document.querySelector('.box-item.selected');
        if (selectedItem?._box) {
            const box = selectedItem._box;
            const r = resolveBox(box);
            box.x += (world.x - dragOffset.x) - r.x;
            box.y += (world.y - dragOffset.y) - r.y;
            snapDrag(box);
            updateInspectorDimensions();
            drawView();
        }
    }
    lastMousePos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning || isResizing || isDragging) return;

    const world = screenToWorld(e.clientX, e.clientY, canvas);
    const selectedItem = document.querySelector('.box-item.selected');
    const selectedBox = selectedItem?._box ?? null;

    const handle = selectedBox && !selectedBox.isScreen ? getHandleAt(world, selectedBox) : null;
    if (handle !== hoveredHandle) { hoveredHandle = handle; drawView(); }

    if (handle) {
        canvas.style.cursor = HANDLE_CURSORS[handle];
    } else {
        const hit = boxes.findLast(b => {
            if (b.isScreen || !b.visible) return false;
            const r = resolveBox(b);
            return world.x >= r.x && world.x <= r.x + r.w &&
                   world.y >= r.y && world.y <= r.y + r.h;
        }) ?? null;
        canvas.style.cursor = hit ? 'pointer' : 'default';
        if (hit !== hoveredBox) {
            hoveredBox = hit;
            boxList.querySelectorAll('.box-item').forEach(i =>
                i.classList.toggle('list-hovered', i._box === hoveredBox)
            );
            drawView();
        }
    }
});

canvas.addEventListener('mouseleave', () => {
    if (isPanning || isResizing || isDragging) return;
    hoveredBox = null;
    hoveredHandle = null;
    boxList.querySelectorAll('.box-item').forEach(i => i.classList.remove('list-hovered'));
    canvas.style.cursor = 'default';
    drawView();
});

canvas.addEventListener('wheel', (e) => {
    const hov = hoveredBox;
    if (hov && hov.items?.length) {
        const b = getScrollBounds(hov);
        if (b) {
            const hasX = b.maxScrollX > 0.5;
            const hasY = b.maxScrollY > 0.5;
            const scrollH = e.shiftKey ? hasX : (!hasY && hasX);
            if (scrollH) {
                e.preventDefault();
                hov.scrollX = Math.max(0, Math.min(b.maxScrollX, (hov.scrollX ?? b.maxScrollX * b.alignX) + e.deltaY * 0.05));
                drawView();
                return;
            }
            if (hasY && !e.shiftKey) {
                e.preventDefault();
                hov.scrollY = Math.max(0, Math.min(b.maxScrollY, (hov.scrollY ?? b.maxScrollY * b.alignY) + e.deltaY * 0.05));
                drawView();
                return;
            }
        }
    }
    handleZoom(e, canvas);
    drawView();
}, { passive: false });

window.addEventListener('mouseup', () => {
    isPanning = false;
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
    resizeStart = null;
    activeSnapX = null;
    activeSnapY = null;
    hoveredBox = null;
    boxList.querySelectorAll('.box-item').forEach(i => i.classList.remove('list-hovered'));
    canvas.style.cursor = 'default';
    drawView();
});

window.addEventListener('resize', updateSize);
updateSize();
resetView();
