let isPanning = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let hoveredBox = null;

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
        isPanning = true;
    } else if (e.button === 0) {
        const world = screenToWorld(e.clientX, e.clientY, canvas);
        const hit = boxes.find(b =>
            world.x >= b.x && world.x <= b.x + b.w &&
            world.y >= b.y && world.y <= b.y + b.h
        );
        if (hit) {
            const item = [...boxList.querySelectorAll('.box-item')].find(i => i._box === hit);
            if (item) select(item);
            isDragging = true;
            dragOffset = { x: world.x - hit.x, y: world.y - hit.y };
            canvas.style.cursor = 'grabbing';
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
    } else if (isDragging) {
        const world = screenToWorld(e.clientX, e.clientY, canvas);
        const selectedItem = document.querySelector('.box-item.selected');
        if (selectedItem?._box) {
            selectedItem._box.x = world.x - dragOffset.x;
            selectedItem._box.y = world.y - dragOffset.y;
            drawView();
        }
    } else {
        const world = screenToWorld(e.clientX, e.clientY, canvas);
        const hit = boxes.find(b =>
            world.x >= b.x && world.x <= b.x + b.w &&
            world.y >= b.y && world.y <= b.y + b.h
        ) ?? null;
        canvas.style.cursor = hit ? 'pointer' : 'default';
        if (hit !== hoveredBox) {
            hoveredBox = hit;
            drawView();
        }
    }
    lastMousePos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('wheel', (e) => {
    handleZoom(e, canvas);
    drawView();
}, { passive: false });

window.addEventListener('mouseup', () => {
    isPanning = false;
    isDragging = false;
    canvas.style.cursor = 'default';
});

window.addEventListener('resize', updateSize);

updateSize();

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

    for (const box of [...boxes].reverse()) {
        if (!box.visible) continue;

        ctx.fillStyle = box === hoveredBox && box !== selectedBox ? '#282828' : '#232323';
        ctx.fillRect(box.x, box.y, box.w, box.h);

        ctx.strokeStyle = box === selectedBox ? '#666' : box === hoveredBox ? '#444' : '#333';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        ctx.fillStyle = '#555';
        ctx.font = `${11 / camera.zoom}px 'Segoe UI', sans-serif`;
        ctx.fillText(box.name, box.x + 4 / camera.zoom, box.y + 14 / camera.zoom);
    }

    ctx.restore();
}
