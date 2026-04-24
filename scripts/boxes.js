const boxList = document.getElementById('palette');
const addBtn = document.getElementById('addBtn');
const inspectorName = document.getElementById('inspectorName');
const inspector = document.getElementById('inspector');
const focusBtn = document.getElementById('focusBtn');

let boxCount = 0;
let draggedItem = null;

function createItem(boxData) {
    const item = document.createElement('div');
    item.className = 'box-item';
    item.setAttribute('draggable', true);
    item.innerHTML = `<button>👁️</button><span>${boxData.name}</span><button>✖️</button>`;
    item._box = boxData;

    item.querySelector('button:last-child').addEventListener('click', () => {
        const wasSelected = item.classList.contains('selected');
        boxes.splice(boxes.indexOf(item._box), 1);
        item.remove();
        updateVisibility();
        drawView();
        if (wasSelected) select(boxList.querySelector('.box-item'));
    });

    item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.textContent = boxData.name;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 10);
        setTimeout(() => {
            item.classList.add('dragging');
            document.body.removeChild(ghost);
        }, 0);
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        boxList.querySelectorAll('.box-item').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
        draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (item === draggedItem) return;
        boxList.querySelectorAll('.box-item').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
        const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
        item.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem || item === draggedItem) return;
        const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
        if (e.clientY < mid) item.before(draggedItem);
        else item.after(draggedItem);
        syncBoxesOrder();
    });

    return item;
}

function syncBoxesOrder() {
    const items = [...boxList.querySelectorAll('.box-item')];
    boxes.length = 0;
    items.forEach(item => boxes.push(item._box));
    drawView();
}

function getSelected() {
    return boxList.querySelector('.box-item.selected');
}

function updateVisibility() {
    inspector.style.display = boxList.children.length > 0 ? '' : 'none';
}

function select(item) {
    boxList.querySelectorAll('.box-item').forEach(b => b.classList.remove('selected'));
    if (item) {
        item.classList.add('selected');
        inspectorName.value = item._box.name;
        inspectorName.disabled = false;
    } else {
        inspectorName.value = '';
        inspectorName.disabled = true;
    }
    drawView();
}

focusBtn.addEventListener('click', () => {
    const item = getSelected();
    if (!item) return;
    const box = item._box;
    const editorRect = document.querySelector('.editor-view').getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    camera.x = (editorRect.left - canvasRect.left) + editorRect.width / 2 - (box.x + box.w / 2) * camera.zoom;
    camera.y = (editorRect.top - canvasRect.top) + editorRect.height / 2 - (box.y + box.h / 2) * camera.zoom;
    drawView();
});

inspectorName.addEventListener('input', () => {
    const item = getSelected();
    if (!item) return;
    item._box.name = inspectorName.value;
    item.querySelector('span').textContent = inspectorName.value;
    drawView();
});

boxList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const item = e.target.closest('.box-item');
    if (item) select(item);
});

addBtn.addEventListener('click', () => {
    boxCount++;
    const { w, h } = getViewSize();
    const maxOffset = Math.min(w - 120, h - 80) - 40;
    const offset = maxOffset > 0 ? (boxes.length * 20) % maxOffset : 0;
    const boxData = { name: `Box ${boxCount}`, x: 20 + offset, y: 20 + offset, w: 120, h: 80, visible: true };
    boxes.unshift(boxData);
    const item = createItem(boxData);
    boxList.prepend(item);
    updateVisibility();
    select(item);
});
