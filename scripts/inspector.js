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
            listItem.closest('.box-group')._children.querySelectorAll('.item-row').forEach(row => {
                row.classList.toggle('box-hidden', !newVisible);
            });
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

const LABEL_POS_CYCLE = ['tl', 'tr', 'br', 'bl'];
const LABEL_POS_ICON = { tl: '↖', tr: '↗', br: '↘', bl: '↙' };

function updateLabelPosBtn(box) {
    labelPosBtn.textContent = LABEL_POS_ICON[box.labelPos ?? 'bl'];
}

labelPosBtn.addEventListener('click', () => {
    const item = getSelected();
    if (!item || item._box.isScreen) return;
    const cur = item._box.labelPos ?? 'bl';
    const next = LABEL_POS_CYCLE[(LABEL_POS_CYCLE.indexOf(cur) + 1) % LABEL_POS_CYCLE.length];
    item._box.labelPos = next;
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
