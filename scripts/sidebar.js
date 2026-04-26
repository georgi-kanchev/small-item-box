function setupFormulaHelp(btnId, panelId) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel.classList.contains('visible')) {
            panel.classList.remove('visible');
            return;
        }
        const rect = btn.getBoundingClientRect();
        const panelW = parseInt(getComputedStyle(panel).width) || 380;
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
        panel.style.left = left + 'px';
        panel.style.top = (rect.top - 6) + 'px';
        panel.style.transform = 'translateY(-100%)';
        panel.classList.add('visible');
    });
}

setupFormulaHelp('formulaHelpBtn', 'formulaHelp');
setupFormulaHelp('itemFormulaHelpBtn', 'itemFormulaHelp');
setupFormulaHelp('sharedHelpBtn', 'sharedHelp');

document.addEventListener('click', () => {
    document.querySelectorAll('.formula-help-panel.visible').forEach(p => p.classList.remove('visible'));
});

dragbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
});

function resize(e) {
    let newWidth = e.clientX; 
    newWidth = Math.max(newWidth, 280);
    newWidth = Math.min(800, newWidth);
    sidebar.style.width = newWidth + 'px';
}

function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = 'default';
}