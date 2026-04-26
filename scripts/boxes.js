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
        item.closest('.box-group').style.setProperty('--item-color', color);
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
    item.innerHTML = `<button class="expand-btn">▶</button><button class="eye-btn">👁️</button><span class="box-name">${boxData.name}</span><button class="del-btn">✖️</button>`;
    item._box = boxData;
    group.style.setProperty('--item-color', boxData.color);

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
            row.classList.toggle('box-hidden', !boxData.visible);
        });
        syncVisibilityTargets();
        drawView();
    });

    item.querySelector('.del-btn').addEventListener('click', () => {
        const wasSelected = item.classList.contains('selected');
        if (selectedItemState?.boxData === boxData) selectItemRow(null);
        boxes.splice(boxes.indexOf(boxData), 1);
        group.remove();
        syncAllItemIds();
        if (!wasSelected) {
            const sel = getSelected();
            if (sel?._box && !sel._box.isScreen) inspectorId.textContent = `Box #${boxes.indexOf(sel._box)}`;
        }
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

function syncBoxesOrder() {
    const items = [...boxList.querySelectorAll('.box-item')];
    boxes.length = 0;
    items.forEach(item => boxes.push(item._box));
    syncAllItemIds();
    const sel = getSelected();
    if (sel?._box && !sel._box.isScreen) inspectorId.textContent = `Box #${boxes.indexOf(sel._box)}`;
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
            inspectorId.textContent = `Box #${boxes.indexOf(item._box)}`;
            setActiveSwatch(item._box.color);
            colorSwatches.style.display = '';
            labelPosBtn.style.display = '';
            itemsSection.style.display = '';
            const b = item._box;
            itemWidthInput.value = b.itemWidth ?? 40;
            itemHeightInput.value = b.itemHeight ?? 20;
            itemSpacingXInput.value = b.itemSpacingX ?? 0;
            itemSpacingYInput.value = b.itemSpacingY ?? 0;
            updateAlignBtns(itemAlignXGroup, b.itemAlignX ?? 0);
            updateAlignBtns(itemAlignYGroup, b.itemAlignY ?? 0);
            itemGapInput.value = b.itemGap ?? 0;
            itemBreakInput.value = b.itemBreak ?? 0;
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
        row.classList.toggle('box-hidden', !item._box.visible);
    });
    syncVisibilityTargets();
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
    const boxData = { name: `Box ${boxCount}`, x: 20 + offset, y: 20 + offset, w: 120, h: 80, visible: true, color, labelPos: 'bl', targets: {}, formulas: { x: 'mx', y: 'my', w: 'mw', h: 'mh' }, items: [], itemGap: 0, itemWidth: 40, itemHeight: 20, itemSpacingX: 0, itemSpacingY: 0, itemAlignX: 0, itemAlignY: 0, itemBreak: 0 };
    boxes.push(boxData);
    const group = createItem(boxData);
    boxList.append(group);
    select(group._item);
});

dupBtn.addEventListener('click', () => {
    const selectedItem = getSelected();
    if (!selectedItem || selectedItem._box.isScreen) return;
    boxCount++;
    const src = selectedItem._box;
    const dupedItems = (src.items ?? []).map(it => ({ ...it, formulas: it.formulas ? { ...it.formulas } : undefined }));
    const boxData = { ...src, name: src.name + ' copy', x: src.x + 10, y: src.y + 10, items: dupedItems, formulas: src.formulas ? { ...src.formulas } : undefined, targets: { ...(src.targets ?? {}) } };
    const idx = boxes.indexOf(src);
    boxes.splice(idx + 1, 0, boxData);
    const group = createItem(boxData);
    if (dupedItems.length) {
        group._item.querySelector('.expand-btn').style.display = '';
        group._children.hidden = !!boxData.collapsed;
        group._item.querySelector('.expand-btn').textContent = boxData.collapsed ? '▶' : '▼';
        dupedItems.forEach(it => group._children.append(createItemRow(boxData, group, it)));
    }
    selectedItem.closest('.box-group').after(group);
    syncAllItemIds();
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
