const addItemBtn = document.getElementById('addItemBtn');
const itemsSection = document.getElementById('itemsSection');
const itemGapInput = document.getElementById('itemGap');
const itemWidthInput = document.getElementById('itemWidth');
const itemHeightInput = document.getElementById('itemHeight');
const itemMarginInput = document.getElementById('itemMargin');
const itemInspector = document.getElementById('itemInspector');
const itemInspName = document.getElementById('itemInspName');
const itemInspId = document.getElementById('itemInspId');
const itemVisBtn = document.getElementById('itemVisBtn');

let selectedItemState = null;

function syncItemIds(group, boxData) {
    group._children.querySelectorAll('.item-row').forEach((row, i) => {
        row.querySelector('.item-index').textContent = i;
    });
}

function createItemRow(boxData, group, itemData) {
    if (!itemData.formulas) itemData.formulas = {};
    if (!itemData.targets) itemData.targets = {};
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
    itemInspId.textContent = `#${row._box.items.indexOf(row._item)}`;
    itemVisBtn.classList.toggle('hidden-state', !row._item.visible);
    itemVisBtn.disabled = !!row._item.targets?.v;
    populateItemDimTargets(row._item);
    updateItemInspectorDimensions();
    drawView();
}

function populateItemDimTargets(itemData) {
    for (const dim of ['V', ...DIM_KEYS]) {
        const sel = document.getElementById('itemTarget' + dim);
        const current = itemData.targets?.[dim.toLowerCase()];
        sel.innerHTML = '';
        const none = document.createElement('option');
        none.textContent = '—';
        none._targetBox = null;
        sel.appendChild(none);
        for (const b of boxes) {
            if (b.isScreen) continue;
            const opt = document.createElement('option');
            opt.textContent = b.name;
            opt._targetBox = b;
            if (b === current) opt.selected = true;
            sel.appendChild(opt);
        }
    }
}

function updateItemInspectorDimensions() {
    if (!selectedItemState) return;
    const f = selectedItemState.itemData.formulas ?? {};
    document.getElementById('itemInputX').value = f.x ?? '';
    document.getElementById('itemInputY').value = f.y ?? '';
    document.getElementById('itemInputW').value = f.w ?? '';
    document.getElementById('itemInputH').value = f.h ?? '';
    syncItemTargetVisibility(selectedItemState.itemData);
}

function syncItemTargetVisibility(itemData) {
    const f = itemData.formulas ?? {};
    for (const dim of DIM_KEYS) {
        const formula = f[dim.toLowerCase()] ?? '';
        const show = /\bt[a-z]/i.test(formula);
        const sel = document.getElementById('itemTarget' + dim);
        const row = sel.closest('.dim-row');
        sel.style.display = show ? '' : 'none';
        row.classList.toggle('no-target', !show);
    }
}

for (const [input, key, numeric] of [
    [itemWidthInput, 'itemWidth', false],
    [itemHeightInput, 'itemHeight', false],
    [itemMarginInput, 'itemMargin', true],
    [itemGapInput, 'itemGap', true],
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
    const itemData = { name: `Item ${box.items.length + 1}` };
    box.items.push(itemData);
    const group = selectedItem.closest('.box-group');
    const expandBtn = selectedItem.querySelector('.expand-btn');
    expandBtn.style.display = '';
    group._children.hidden = false;
    expandBtn.textContent = '▼';
    box.collapsed = false;
    group._children.append(createItemRow(box, group, itemData));
    syncItemIds(group, box);
});

itemInspName.addEventListener('input', () => {
    if (!selectedItemState) return;
    selectedItemState.itemData.name = itemInspName.value;
    selectedItemState.row.querySelector('.item-name').textContent = itemInspName.value;
    drawView();
});

itemVisBtn.addEventListener('click', () => {
    if (!selectedItemState || selectedItemState.itemData.targets?.v) return;
    selectedItemState.itemData.visible = !selectedItemState.itemData.visible;
    selectedItemState.row.classList.toggle('hidden', !selectedItemState.itemData.visible);
    itemVisBtn.classList.toggle('hidden-state', !selectedItemState.itemData.visible);
    drawView();
});

document.getElementById('itemTargetV').addEventListener('change', e => {
    if (!selectedItemState) return;
    const target = e.target.selectedOptions[0]._targetBox;
    selectedItemState.itemData.targets.v = target;
    itemVisBtn.disabled = !!target;
    if (target) {
        selectedItemState.itemData.visible = target.visible;
        selectedItemState.row.classList.toggle('hidden', !selectedItemState.itemData.visible);
        itemVisBtn.classList.toggle('hidden-state', !selectedItemState.itemData.visible);
    }
    drawView();
});

for (const dim of DIM_KEYS) {
    document.getElementById('itemInput' + dim).addEventListener('input', e => {
        if (!selectedItemState) return;
        selectedItemState.itemData.formulas[dim.toLowerCase()] = e.target.value;
        syncItemTargetVisibility(selectedItemState.itemData);
        drawView();
    });
    document.getElementById('itemTarget' + dim).addEventListener('change', e => {
        if (!selectedItemState) return;
        selectedItemState.itemData.targets[dim.toLowerCase()] = e.target.selectedOptions[0]._targetBox;
    });
}
