const boxList = document.getElementById('palette');
const addBtn = document.getElementById('addBtn');
const inspectorName = document.getElementById('inspectorName');
const inspectorId = document.getElementById('inspectorId');
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
    const group = document.createElement('div');
    group.className = 'box-group';
    group._box = boxData;

    const item = document.createElement('div');
    item.className = 'box-item';
    item.setAttribute('draggable', true);
    item.innerHTML = `<button class="expand-btn">▶</button><button class="eye-btn">👁️</button><span class="box-id"></span><span class="box-name">${boxData.name}</span><button class="del-btn">✖️</button>`;
    item._box = boxData;
    item.style.setProperty('--item-color', boxData.color);

    const expandBtn = item.querySelector('.expand-btn');
    expandBtn.style.display = 'none';

    const children = document.createElement('div');
    children.className = 'item-children';
    children.hidden = true;

    group._item = item;
    group._children = children;

    expandBtn.addEventListener('click', e => {
        e.stopPropagation();
        children.hidden = !children.hidden;
        expandBtn.textContent = children.hidden ? '▶' : '▼';
        boxData.collapsed = children.hidden;
    });

    const eyeBtn = item.querySelector('.eye-btn');
    eyeBtn.addEventListener('click', () => {
        boxData.visible = !boxData.visible;
        item.classList.toggle('hidden', !boxData.visible);
        eyeBtn.classList.toggle('hidden-state', !boxData.visible);
        if (item.classList.contains('selected'))
            visibilityBtn.classList.toggle('hidden-state', !boxData.visible);
        children.querySelectorAll('.item-row').forEach(row => {
            row.classList.toggle('hidden', !boxData.visible || row._item.visible === false);
        });
        syncVisibilityTargets();
        drawView();
    });

    item.querySelector('.del-btn').addEventListener('click', () => {
        const wasSelected = item.classList.contains('selected');
        boxes.splice(boxes.indexOf(boxData), 1);
        group.remove();
        syncBoxIds();
        drawView();
        if (wasSelected) select(boxList.querySelector('.box-item'));
    });

    item.addEventListener('mouseenter', () => { hoveredBox = boxData; drawView(); });
    item.addEventListener('mouseleave', () => { hoveredBox = null; drawView(); });

    item.addEventListener('dblclick', e => {
        if (e.target.tagName === 'BUTTON') return;
        focusBox(boxData);
    });

    item.addEventListener('dragstart', e => {
        draggedItem = group;
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

    item.addEventListener('dragover', e => {
        e.preventDefault();
        if (group === draggedItem) return;
        boxList.querySelectorAll('.box-item').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
        const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
        item.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
    });

    item.addEventListener('drop', e => {
        e.preventDefault();
        if (!draggedItem || group === draggedItem) return;
        const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
        if (e.clientY < mid) group.before(draggedItem);
        else group.after(draggedItem);
        syncBoxesOrder();
    });

    group.append(item, children);
    return group;
}

function createScreenItem() {
    const item = document.createElement('div');
    item.className = 'box-item screen-item';
    item.innerHTML = `<span class="box-name">Screen</span>`;
    item._box = screenBox;
    item.addEventListener('click', () => select(item));
    return item;
}

function syncBoxIds() {
    boxList.querySelectorAll('.box-item').forEach(item => {
        const span = item.querySelector('.box-id');
        if (span) span.textContent = boxes.indexOf(item._box);
    });
}

function syncBoxesOrder() {
    const items = [...boxList.querySelectorAll('.box-item')];
    boxes.length = 0;
    items.forEach(item => boxes.push(item._box));
    syncBoxIds();
    const sel = getSelected();
    if (sel?._box && !sel._box.isScreen) inspectorId.textContent = `#${boxes.indexOf(sel._box)}`;
    drawView();
}

function getSelected() {
    return boxList.querySelector('.box-item.selected');
}

function select(item) {
    boxList.querySelectorAll('.box-item').forEach(b => b.classList.remove('selected'));
    boxList.querySelectorAll('.item-row').forEach(r => r.classList.remove('selected'));
    selectedItemState = null;
    itemInspector.style.display = 'none';
    if (item) {
        dupBtn.style.display = item._box.isScreen ? 'none' : '';
        item.classList.add('selected');
        inspectorName.value = item._box.name;
        inspectorName.disabled = !!item._box.isScreen;
        if (item._box.isScreen) {
            setActiveSwatch(null);
            colorSwatches.style.display = 'none';
            labelPosBtn.style.display = 'none';
            itemsSection.style.display = 'none';
        } else {
            inspectorId.textContent = `#${boxes.indexOf(item._box)}`;
            setActiveSwatch(item._box.color);
            colorSwatches.style.display = '';
            labelPosBtn.style.display = '';
            itemsSection.style.display = '';
            const b = item._box;
            itemWidthInput.value = b.itemWidth ?? 40;
            itemHeightInput.value = b.itemHeight ?? 20;
            itemSpacingInput.value = b.itemSpacing ?? 0;
            itemGapInput.value = b.itemGap ?? 0;
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
        itemsSection.style.display = 'none';
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
    item.querySelector('.eye-btn').classList.toggle('hidden-state', !item._box.visible);
    visibilityBtn.classList.toggle('hidden-state', !item._box.visible);
    item.closest('.box-group')._children.querySelectorAll('.item-row').forEach(row => {
        row.classList.toggle('hidden', !item._box.visible || row._item.visible === false);
    });
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
            const eyeBtn = listItem.querySelector('.eye-btn');
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
    item.querySelector('.box-name').textContent = inspectorName.value;
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
    const boxData = { name: `Box ${boxCount}`, x: 20 + offset, y: 20 + offset, w: 120, h: 80, visible: true, color, labelBottom: false, targets: {}, formulas: { x: 'mx', y: 'my', w: 'mw', h: 'mh' }, items: [], itemGap: 0, itemWidth: 40, itemHeight: 20, itemSpacing: 0 };
    boxes.push(boxData);
    const group = createItem(boxData);
    boxList.append(group);
    syncBoxIds();
    select(group._item);
});

dupBtn.addEventListener('click', () => {
    const selectedItem = getSelected();
    if (!selectedItem || selectedItem._box.isScreen) return;
    boxCount++;
    const src = selectedItem._box;
    const boxData = { ...src, name: src.name + ' copy', x: src.x + 10, y: src.y + 10, items: [], formulas: src.formulas ? { ...src.formulas } : undefined, targets: { ...(src.targets ?? {}) } };
    const idx = boxes.indexOf(src);
    boxes.splice(idx + 1, 0, boxData);
    const group = createItem(boxData);
    selectedItem.closest('.box-group').after(group);
    syncBoxIds();
    select(group._item);
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
