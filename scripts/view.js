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

// param order must stay in sync with the args array in evalFormula
const FORMULA_PARAMS = [
    'mx','my','mw','mh','mlx','mly','mrx','mry','mux','muy','mdx','mdy',
    'sx','sy','sw','sh','slx','sly','srx','sry','sux','suy','sdx','sdy',
    'tx','ty','tw','th','tv','tlx','tly','trx','tRY','tux','tuy','tdx','tdy',
];
const formulaCache = new Map();

function compileFormula(expr) {
    const sanitized = String(expr).trim().replace(/\btry\b/gi, 'tRY');
    try {
        return new Function(...FORMULA_PARAMS, '"use strict"; return (' + sanitized + ')');
    } catch {
        return null;
    }
}

function evalFormula(expr, box, targetBox, depth = 0, forbidden = null) {
    if (depth > 8) return null;
    if (expr === null || expr === undefined || String(expr).trim() === '') return null;
    if (typeof expr === 'number') return expr;

    const key = String(expr).trim();
    if (!formulaCache.has(key)) formulaCache.set(key, compileFormula(key));
    const fn = formulaCache.get(key);
    if (!fn) return null;

    const { w: sw, h: sh } = getViewSize();
    const effectiveTarget = forbidden?.has(targetBox) ? null : targetBox;
    let t = { x: 0, y: 0, w: 0, h: 0, visible: false };
    if (effectiveTarget) {
        const tr = resolveBox(effectiveTarget, depth + 1, forbidden);
        t = { x: tr.x, y: tr.y, w: tr.w, h: tr.h, visible: !!effectiveTarget.visible };
    }

    const mx = box.x ?? 0, my = box.y ?? 0, mw = box.w ?? 0, mh = box.h ?? 0;
    try {
        const result = fn(
            mx, my, mw, mh,
            mx, my + mh/2, mx + mw, my + mh/2,
            mx + mw/2, my, mx + mw/2, my + mh,
            0, 0, sw, sh,
            0, sh/2, sw, sh/2,
            sw/2, 0, sw/2, sh,
            t.x, t.y, t.w, t.h, t.visible ? 1 : 0,
            t.x, t.y + t.h/2, t.x + t.w, t.y + t.h/2,
            t.x + t.w/2, t.y, t.x + t.w/2, t.y + t.h,
        );
        return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
        return null;
    }
}

function resolveBox(box, depth = 0, forbidden = null) {
    const f = box.formulas ?? {};
    return {
        x: evalFormula(f.x, box, box.targets?.x, depth, forbidden) ?? box.x,
        y: evalFormula(f.y, box, box.targets?.y, depth, forbidden) ?? box.y,
        w: evalFormula(f.w, box, box.targets?.w, depth, forbidden) ?? box.w,
        h: evalFormula(f.h, box, box.targets?.h, depth, forbidden) ?? box.h,
    };
}

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

// --- snapping ---

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

// --- input ---

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

function updateSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawView();
}

function resetView() {
    const { w, h } = getViewSize();
    const editorRect = document.querySelector('.editor-view').getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    camera.zoom = Math.min(editorRect.width / w, editorRect.height / h) * 0.85;
    camera.x = (editorRect.left - canvasRect.left) + (editorRect.width - w * camera.zoom) / 2;
    camera.y = (editorRect.top - canvasRect.top) + (editorRect.height - h * camera.zoom) / 2;
    drawView();
}

function getViewSize() {
    const base = 512;
    return {
        w: Math.round(base * Math.sqrt(aspectRatio)),
        h: Math.round(base / Math.sqrt(aspectRatio))
    };
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawView() {
    const { w, h } = getViewSize();

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    const selectedItem = document.querySelector('.box-item.selected');
    const selectedBox = selectedItem?._box ?? null;

    // pass 1: bodies
    for (const box of boxes) {
        const isSelected = box === selectedBox;
        const r = resolveBox(box);

        if (box.isScreen) {
            ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(r.x, r.y, r.w, r.h);
            continue;
        }

        const c = box.color ?? '#5b9bd9';
        const isHovered = box === hoveredBox;

        if (!box.visible) continue;

        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.fillStyle = hexToRgba(c, isSelected && isHovered ? 0.28 : isSelected ? 0.2 : isHovered ? 0.14 : 0.1);
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : hexToRgba(c, isHovered ? 0.7 : 0.45);
        ctx.lineWidth = (isSelected ? 1.5 : 1) / camera.zoom;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
    }

    // pass 2: labels always on top
    for (const box of boxes) {
        if (box.isScreen || !box.visible) continue;
        const r = resolveBox(box);
        const c = box.color ?? '#5b9bd9';
        const isSelected = box === selectedBox;
        const labelY = box.labelBottom
            ? r.y + r.h - 4 / camera.zoom
            : r.y + 14 / camera.zoom;
        ctx.fillStyle = hexToRgba(c, isSelected ? 0.9 : 0.6);
        ctx.font = `${11 / camera.zoom}px 'Segoe UI', sans-serif`;
        ctx.fillText(box.name, r.x + 4 / camera.zoom, labelY);
    }

    // snap lines
    if (activeSnapX !== null || activeSnapY !== null) {
        ctx.save();
        ctx.strokeStyle = 'rgba(80, 180, 255, 0.75)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom]);
        if (activeSnapX !== null) {
            ctx.beginPath(); ctx.moveTo(activeSnapX, 0); ctx.lineTo(activeSnapX, h); ctx.stroke();
        }
        if (activeSnapY !== null) {
            ctx.beginPath(); ctx.moveTo(0, activeSnapY); ctx.lineTo(w, activeSnapY); ctx.stroke();
        }
        ctx.restore();
    }

    // resize handles
    if (selectedBox && !selectedBox.isScreen) {
        const hs = 5 / camera.zoom;
        const handles = getResizeHandles(selectedBox);
        ctx.lineWidth = 1 / camera.zoom;
        for (const [name, pos] of Object.entries(handles)) {
            ctx.fillStyle = hoveredHandle === name ? '#ffffff' : '#c8c8d8';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs);
            ctx.strokeRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs);
        }
    }

    ctx.restore();
}
