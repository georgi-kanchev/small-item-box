const addItemBtn = document.getElementById('addItemBtn');
const itemsSection = document.getElementById('itemsSection');
const itemGapInput = document.getElementById('itemGap');
const itemWidthInput = document.getElementById('itemWidth');
const itemHeightInput = document.getElementById('itemHeight');
const itemSpacingXInput = document.getElementById('itemSpacingX');
const itemSpacingYInput = document.getElementById('itemSpacingY');
const itemAlignXGroup = document.getElementById('itemAlignXGroup');
const itemAlignYGroup = document.getElementById('itemAlignYGroup');
const itemBreakInput = document.getElementById('itemBreak');
const itemInspector = document.getElementById('itemInspector');
const itemInspName = document.getElementById('itemInspName');
const itemInspId = document.getElementById('itemInspId');
const itemVisBtn = document.getElementById('itemVisBtn');
const itemBreakBtn = document.getElementById('itemBreakBtn');
const itemBreakInp = document.getElementById('itemBreakInp');

let selectedItemState = null;

function syncAllItemIds() {
    let idx = 0;
    boxList.querySelectorAll('.box-group').forEach(group => {
        group.querySelectorAll('.item-row').forEach(row => {
            row.querySelector('.item-index').textContent = idx++;
        });
    });
    if (selectedItemState) {
        const { row } = selectedItemState;
        itemInspId.textContent = `Item #${row.querySelector('.item-index').textContent} in Box #${boxes.indexOf(row._box)}`;
    }
}

function createItemRow(boxData, group, itemData) {
    if (!itemData.formulas) itemData.formulas = {};
    if (itemData.visible === undefined) itemData.visible = true;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<button class="eye-btn">👁️</button><span class="item-index"></span><span class="item-name">${itemData.name}</span><button class="del-item-btn">✖️</button>`;
    row._item = itemData;
    row._box = boxData;

    const eyeBtn = row.querySelector('.eye-btn');
    eyeBtn.classList.toggle('hidden-state', !itemData.visible);
    row.classList.toggle('invisible', !itemData.visible);
    eyeBtn.addEventListener('click', e => {
        e.stopPropagation();
        itemData.visible = !itemData.visible;
        eyeBtn.classList.toggle('hidden-state', !itemData.visible);
        row.classList.toggle('invisible', !itemData.visible);
        if (selectedItemState?.row === row)
            itemVisBtn.classList.toggle('hidden-state', !itemData.visible);
        drawView();
    });

    row.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') return;
        selectItemRow(row);
    });

    row.querySelector('.del-item-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (selectedItemState?.row === row) selectItemRow(null);
        boxData.items.splice(boxData.items.indexOf(itemData), 1);
        row.remove();
        syncAllItemIds();
        drawView();
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
    itemInspId.textContent = `Item #${row.querySelector('.item-index').textContent} in Box #${boxes.indexOf(row._box)}`;
    itemVisBtn.classList.toggle('hidden-state', !row._item.visible);
    itemBreakBtn.classList.toggle('active', !!row._item.break);
    itemBreakInp.style.display = row._item.break ? '' : 'none';
    updateItemInspectorDimensions();
    drawView();
}

function updateAlignBtns(group, val) {
    group.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.val) === val);
    });
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

for (const [group, key] of [[itemAlignXGroup, 'itemAlignX'], [itemAlignYGroup, 'itemAlignY']]) {
    group.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = getSelected();
            if (!item || item._box.isScreen) return;
            item._box[key] = Number(btn.dataset.val);
            updateAlignBtns(group, item._box[key]);
            drawView();
        });
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
    syncAllItemIds();
    drawView();
});
