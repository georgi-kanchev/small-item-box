const boxList = document.getElementById('palette');
const addBtn = document.getElementById('addBtn');
const inspectorName = document.getElementById('inspectorName');
const inspector = document.getElementById('inspector');
const dupBtn = document.getElementById('dupBtn');
const visibilityBtn = document.getElementById('visibilityBtn');
const colorSwatches = document.getElementById('colorSwatches');
const labelPosBtn = document.getElementById('labelPosBtn');

const BOX_COLORS = [
    '#909098', // gray
    '#e84040', // red
    '#f07820', // orange
    '#d4c018', // yellow
    '#7cc820', // lime
    '#18b850', // green
    '#18a8a0', // teal
    '#2080f0', // blue
    '#6848e0', // indigo
    '#a028cc', // purple
];

BOX_COLORS.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    swatch.dataset.color = color;
    swatch.addEventListener('click', () => {
        const item = getSelected();
        if (!item || item._box.isScreen) return;
        item._box.color = color;
        item.style.setProperty('--item-color', color);
        setActiveSwatch(color);
        drawView();
    });
    colorSwatches.appendChild(swatch);
});

function setActiveSwatch(color) {
    colorSwatches.querySelectorAll('.color-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.color === color)
    );
}

let boxCount = 0;
let draggedItem = null;

function createItem(boxData) {
    const item = document.createElement('div');
    item.className = 'box-item';
    item.setAttribute('draggable', true);
    item.innerHTML = `<button>👁️</button><span>${boxData.name}</span><button>✖️</button>`;
    item._box = boxData;
    item.style.setProperty('--item-color', boxData.color);

    const eyeBtn = item.querySelector('button:first-child');
    eyeBtn.addEventListener('click', () => {
        boxData.visible = !boxData.visible;
        item.classList.toggle('hidden', !boxData.visible);
        eyeBtn.classList.toggle('hidden-state', !boxData.visible);
        if (item.classList.contains('selected'))
            visibilityBtn.classList.toggle('hidden-state', !boxData.visible);
        syncVisibilityTargets();
        drawView();
    });

    item.querySelector('button:last-child').addEventListener('click', () => {
        const wasSelected = item.classList.contains('selected');
        boxes.splice(boxes.indexOf(item._box), 1);
        item.remove();

        drawView();
        if (wasSelected) select(boxList.querySelector('.box-item'));
    });

    item.addEventListener('mouseenter', () => { hoveredBox = boxData; drawView(); });
    item.addEventListener('mouseleave', () => { hoveredBox = null; drawView(); });

    item.addEventListener('dblclick', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        focusBox(boxData);
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

function createScreenItem() {
    const item = document.createElement('div');
    item.className = 'box-item screen-item';
    item.innerHTML = `<span>Screen</span>`;
    item._box = screenBox;
    item.addEventListener('click', () => select(item));
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

function select(item) {
    boxList.querySelectorAll('.box-item').forEach(b => b.classList.remove('selected'));
    if (item) {
        dupBtn.style.display = item._box.isScreen ? 'none' : '';
        item.classList.add('selected');
        inspectorName.value = item._box.name;
        inspectorName.disabled = !!item._box.isScreen;
        if (item._box.isScreen) {
            setActiveSwatch(null);
            colorSwatches.style.display = 'none';
            labelPosBtn.style.display = 'none';
        } else {
            setActiveSwatch(item._box.color);
            colorSwatches.style.display = '';
            labelPosBtn.style.display = '';
            visibilityBtn.classList.toggle('hidden-state', !item._box.visible);
            visibilityBtn.disabled = !!item._box.targets?.v;
            updateLabelPosBtn(item._box);
            populateDimTargets(item._box);
            updateInspectorDimensions();
        }
        inspector.style.display = item._box.isScreen ? 'none' : '';
    } else {
        dupBtn.style.display = 'none';
        inspectorName.value = '';
        inspectorName.disabled = true;
        setActiveSwatch(null);
        colorSwatches.style.display = '';
        labelPosBtn.style.display = '';
        inspector.style.display = 'none';
    }
    drawView();
}

function focusBox(box) {
    const r = resolveBox(box);
    const editorRect = document.querySelector('.editor-view').getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    camera.x = (editorRect.left - canvasRect.left) + editorRect.width / 2 - (r.x + r.w / 2) * camera.zoom;
    camera.y = (editorRect.top - canvasRect.top) + editorRect.height / 2 - (r.y + r.h / 2) * camera.zoom;
    drawView();
}

visibilityBtn.addEventListener('click', () => {
    const item = getSelected();
    if (!item || item._box.targets?.v) return;
    item._box.visible = !item._box.visible;
    item.classList.toggle('hidden', !item._box.visible);
    item.querySelector('button:first-child').classList.toggle('hidden-state', !item._box.visible);
    visibilityBtn.classList.toggle('hidden-state', !item._box.visible);
    syncVisibilityTargets();
    drawView();
});

const DIM_KEYS = ['X', 'Y', 'W', 'H'];

function populateDimTargets(selectedBox) {
    for (const dim of ['V', ...DIM_KEYS]) {
        const sel = document.getElementById('target' + dim);
        const current = selectedBox.targets?.[dim.toLowerCase()];
        sel.innerHTML = '';
        const none = document.createElement('option');
        none.textContent = '—';
        none._targetBox = null;
        sel.appendChild(none);
        for (const b of boxes) {
            if (b === selectedBox || b.isScreen) continue;
            const opt = document.createElement('option');
            opt.textContent = b.name;
            opt._targetBox = b;
            if (b === current) opt.selected = true;
            sel.appendChild(opt);
        }
    }
}

function syncVisibilityTargets() {
    for (const b of boxes) {
        if (!b.targets?.v) continue;
        const newVisible = b.targets.v.visible;
        if (b.visible === newVisible) continue;
        b.visible = newVisible;
        const listItem = [...boxList.querySelectorAll('.box-item')].find(i => i._box === b);
        if (listItem) {
            listItem.classList.toggle('hidden', !newVisible);
            const eyeBtn = listItem.querySelector('button:first-child');
            if (eyeBtn) eyeBtn.classList.toggle('hidden-state', !newVisible);
        }
    }
    const selected = getSelected();
    if (selected?._box && !selected._box.isScreen) {
        visibilityBtn.classList.toggle('hidden-state', !selected._box.visible);
    }
}

document.getElementById('targetV').addEventListener('change', e => {
    const item = getSelected();
    if (!item || item._box.isScreen) return;
    if (!item._box.targets) item._box.targets = {};
    const target = e.target.selectedOptions[0]._targetBox;
    item._box.targets.v = target;
    visibilityBtn.disabled = !!target;
    if (target) {
        item._box.visible = target.visible;
        item.classList.toggle('hidden', !item._box.visible);
        visibilityBtn.classList.toggle('hidden-state', !item._box.visible);
    }
    drawView();
});

function updateInspectorDimensions() {
    const item = getSelected();
    if (!item || item._box.isScreen) return;
    const b = item._box;
    const f = b.formulas ?? {};
    document.getElementById('inputX').value = f.x ?? Math.round(b.x);
    document.getElementById('inputY').value = f.y ?? Math.round(b.y);
    document.getElementById('inputW').value = f.w ?? Math.round(b.w);
    document.getElementById('inputH').value = f.h ?? Math.round(b.h);
    syncTargetVisibility(b);
}

function syncTargetVisibility(b) {
    const f = b.formulas ?? {};
    for (const dim of DIM_KEYS) {
        const formula = f[dim.toLowerCase()] ?? '';
        const show = /\bt[a-z]/i.test(formula);
        const sel = document.getElementById('target' + dim);
        const row = sel.closest('.dim-row');
        sel.style.display = show ? '' : 'none';
        row.classList.toggle('no-target', !show);
    }
}

for (const dim of DIM_KEYS) {
    document.getElementById('input' + dim).addEventListener('input', e => {
        const item = getSelected();
        if (!item || item._box.isScreen) return;
        const b = item._box;
        if (!b.formulas) b.formulas = {};
        b.formulas[dim.toLowerCase()] = e.target.value;
        syncTargetVisibility(b);
        drawView();
    });

    document.getElementById('target' + dim).addEventListener('change', e => {
        const item = getSelected();
        if (!item || item._box.isScreen) return;
        if (!item._box.targets) item._box.targets = {};
        item._box.targets[dim.toLowerCase()] = e.target.selectedOptions[0]._targetBox;
    });
}

function updateLabelPosBtn(box) {
    labelPosBtn.textContent = box.labelBottom ? '▼' : '▲';
}

labelPosBtn.addEventListener('click', () => {
    const item = getSelected();
    if (!item || item._box.isScreen) return;
    item._box.labelBottom = !item._box.labelBottom;
    updateLabelPosBtn(item._box);
    drawView();
});

inspectorName.addEventListener('input', () => {
    const item = getSelected();
    if (!item || item._box.isScreen) return;
    item._box.name = inspectorName.value;
    item.querySelector('span').textContent = inspectorName.value;
    drawView();
});

boxList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const item = e.target.closest('.box-item');
    if (item && !item.classList.contains('screen-item')) select(item);
});

addBtn.addEventListener('click', () => {
    boxCount++;
    const { w, h } = getViewSize();
    const maxOffset = Math.min(w - 120, h - 80) - 40;
    const offset = maxOffset > 0 ? (boxes.length * 20) % maxOffset : 0;
    const color = BOX_COLORS[0];
    const boxData = { name: `Box ${boxCount}`, x: 20 + offset, y: 20 + offset, w: 120, h: 80, visible: true, color, labelBottom: false, targets: {}, formulas: { x: 'mx', y: 'my', w: 'mw', h: 'mh' } };
    boxes.push(boxData);
    const item = createItem(boxData);
    boxList.append(item);
    select(item);
});

dupBtn.addEventListener('click', () => {
    const selectedItem = getSelected();
    if (!selectedItem || selectedItem._box.isScreen) return;
    boxCount++;
    const src = selectedItem._box;
    const boxData = { ...src, name: src.name + ' copy', x: src.x + 10, y: src.y + 10, formulas: src.formulas ? { ...src.formulas } : undefined, targets: { ...(src.targets ?? {}) } };
    const idx = boxes.indexOf(src);
    boxes.splice(idx + 1, 0, boxData);
    const item = createItem(boxData);
    selectedItem.after(item);
    select(item);
});

// screen box — always at the end of boxes (renders behind everything)
const screenBox = {
    name: 'Screen',
    get x() { return 0; },
    get y() { return 0; },
    get w() { return getViewSize().w; },
    get h() { return getViewSize().h; },
    visible: true,
    isScreen: true,
    color: '#909098',
};

boxes.unshift(screenBox);
boxList.prepend(createScreenItem());
