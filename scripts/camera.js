const camera = {x: 350, y: 180, zoom: 1.3};

function screenToWorld(clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - camera.x) / camera.zoom;
    const y = (clientY - rect.top - camera.y) / camera.zoom;
    return { x, y };
}

function handleZoom(e, canvas) {
    const oldZoom = camera.zoom;
    camera.zoom *= e.deltaY < 0 ? 1.1 : 0.9;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    camera.x -= (mouseX - camera.x) * (camera.zoom / oldZoom - 1);
    camera.y -= (mouseY - camera.y) * (camera.zoom / oldZoom - 1);
}