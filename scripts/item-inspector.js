function updateItemInspectorDimensions() {
    if (!selectedItemState) return;
    const f = selectedItemState.itemData.formulas ?? {};
    document.getElementById('itemInputX').value = f.x ?? '';
    document.getElementById('itemInputY').value = f.y ?? '';
    document.getElementById('itemInputW').value = f.w ?? '';
    document.getElementById('itemInputH').value = f.h ?? '';
    itemBreakInp.value = f.break ?? '';
}

itemInspName.addEventListener('input', () => {
    if (!selectedItemState) return;
    selectedItemState.itemData.name = itemInspName.value;
    selectedItemState.row.querySelector('.item-name').textContent = itemInspName.value;
    drawView();
});

itemVisBtn.addEventListener('click', () => {
    if (!selectedItemState) return;
    selectedItemState.itemData.visible = !selectedItemState.itemData.visible;
    selectedItemState.row.querySelector('.eye-btn').classList.toggle('hidden-state', !selectedItemState.itemData.visible);
    selectedItemState.row.classList.toggle('invisible', !selectedItemState.itemData.visible);
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
