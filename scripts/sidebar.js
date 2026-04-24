dragbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
});

function resize(e) {
    let newWidth = e.clientX; 
    newWidth = Math.max(newWidth, 210);
    newWidth = Math.min(800, newWidth);
    sidebar.style.width = newWidth + 'px';
}

function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = 'default';
}