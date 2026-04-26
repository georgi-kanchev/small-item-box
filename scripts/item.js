const addItemBtn = document.getElementById('addItemBtn');
const itemsSection = document.getElementById('itemsSection');
const itemGapInput = document.getElementById('itemGap');
const itemWidthInput = document.getElementById('itemWidth');
const itemHeightInput = document.getElementById('itemHeight');
const itemSpacingXInput = document.getElementById('itemSpacingX');
const itemSpacingYInput = document.getElementById('itemSpacingY');
const itemBreakInput = document.getElementById('itemBreak');
const itemInspector = document.getElementById('itemInspector');
const itemInspName = document.getElementById('itemInspName');
const itemInspId = document.getElementById('itemInspId');
const itemVisBtn = document.getElementById('itemVisBtn');
const itemBreakBtn = document.getElementById('itemBreakBtn');
const itemBreakInp = document.getElementById('itemBreakInp');

let selectedItemState = null;

function syncItemIds(group, boxData) {
    group._children.querySelectorAll('.item-row').forEach((row, i) => {
        row.querySelector('.item-index').textContent = i;
    });
}

function createItemRow(boxData, group, itemData) {
    if (!itemData.formulas) itemData.formulas = {};
    if (itemData.visible === undefined) itemData.visible = true;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<span class="item-index"></span><span class="item-name">${itemData.name}</span><button class="del-item-btn">✖️</button>`;
    row._item = itemData;
    row._box = boxData;

    row.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') return;
        selectItemRow(row);
    });

    row.querySelector('.del-item-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (selectedItemState?.row === row) selectItemRow(null);
        boxData.items.splice(boxData.items.indexOf(itemData), 1);
        row.remove();
        syncItemIds(group, boxData);
        if (!boxData.items.length) {
            group._item.querySelector('.expand-btn').style.display = 'none';
            group._children.hidden = true;
        }
    });

    return row;
}

function selectItemRow(row) {
    boxList.querySelectorAll('.item-row').forEach(r => r.classList.remove('selected'));
    boxList.querySelectorAll('.box-item').forEach(b => b.classList.remove('selected'));
    inspector.style.display = 'none';
    if (!row) {
        selectedItemState = null;
        itemInspector.style.display = 'none';
        dupBtn.style.display = 'none';
        drawView();
        return;
    }
    row.classList.add('selected');
    selectedItemState = { row, itemData: row._item, boxData: row._box };
    dupBtn.style.display = 'none';
    itemInspector.style.display = '';
    itemInspName.value = row._item.name;
    itemInspId.textContent = `Item #${row._box.items.indexOf(row._item)} in Box #${boxes.indexOf(row._box)}`;
    itemVisBtn.classList.toggle('hidden-state', !row._item.visible);
    itemBreakBtn.classList.toggle('active', !!row._item.break);
    itemBreakInp.style.display = row._item.break ? '' : 'none';
    updateItemInspectorDimensions();
    drawView();
}

function updateItemInspectorDimensions() {
    if (!selectedItemState) return;
    const f = selectedItemState.itemData.formulas ?? {};
    document.getElementById('itemInputX').value = f.x ?? '';
    document.getElementById('itemInputY').value = f.y ?? '';
    document.getElementById('itemInputW').value = f.w ?? '';
    document.getElementById('itemInputH').value = f.h ?? '';
    itemBreakInp.value = f.break ?? '';
}

for (const [input, key, numeric] of [
    [itemWidthInput, 'itemWidth', false],
    [itemHeightInput, 'itemHeight', false],
    [itemSpacingXInput, 'itemSpacingX', true],
    [itemSpacingYInput, 'itemSpacingY', true],
    [itemGapInput, 'itemGap', true],
    [itemBreakInput, 'itemBreak', true],
]) {
    input.addEventListener('input', () => {
        const item = getSelected();
        if (!item || item._box.isScreen) return;
        item._box[key] = numeric ? Number(input.value) : input.value;
        drawView();
    });
}

addItemBtn.addEventListener('click', () => {
    const selectedItem = getSelected();
    if (!selectedItem || selectedItem._box.isScreen) return;
    const box = selectedItem._box;
    if (!box.items) box.items = [];
    const itemData = { name: `Item ${box.items.length + 1}`, formulas: { x: 'mx', y: 'my', w: 'mw', h: 'mh' } };
    box.items.push(itemData);
    const group = selectedItem.closest('.box-group');
    const expandBtn = selectedItem.querySelector('.expand-btn');
    expandBtn.style.display = '';
    group._children.hidden = false;
    expandBtn.textContent = '▼';
    box.collapsed = false;
    group._children.append(createItemRow(box, group, itemData));
    syncItemIds(group, box);
    drawView();
});

itemInspName.addEventListener('input', () => {
    if (!selectedItemState) return;
    selectedItemState.itemData.name = itemInspName.value;
    selectedItemState.row.querySelector('.item-name').textContent = itemInspName.value;
    drawView();
});

itemVisBtn.addEventListener('click', () => {
    if (!selectedItemState) return;
    selectedItemState.itemData.visible = !selectedItemState.itemData.visible;
    selectedItemState.row.classList.toggle('hidden', !selectedItemState.itemData.visible);
    itemVisBtn.classList.toggle('hidden-state', !selectedItemState.itemData.visible);
    drawView();
});

itemBreakBtn.addEventListener('click', () => {
    if (!selectedItemState) return;
    const itemData = selectedItemState.itemData;
    itemData.break = !itemData.break;
    if (itemData.break && !itemData.formulas?.break) {
        if (!itemData.formulas) itemData.formulas = {};
        itemData.formulas.break = 'mb';
    }
    itemBreakBtn.classList.toggle('active', !!itemData.break);
    itemBreakInp.style.display = itemData.break ? '' : 'none';
    if (itemData.break) itemBreakInp.value = itemData.formulas.break;
    clampBoxScroll(selectedItemState.boxData);
    drawView();
});

itemBreakInp.addEventListener('input', e => {
    if (!selectedItemState) return;
    if (!selectedItemState.itemData.formulas) selectedItemState.itemData.formulas = {};
    selectedItemState.itemData.formulas.break = e.target.value;
    drawView();
});

for (const dim of DIM_KEYS) {
    document.getElementById('itemInput' + dim).addEventListener('input', e => {
        if (!selectedItemState) return;
        selectedItemState.itemData.formulas[dim.toLowerCase()] = e.target.value;
        drawView();
    });
}
