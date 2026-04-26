document.getElementById('save').addEventListener('click', exportXml);

let savedFileHandle = null;

document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (savedFileHandle) {
            const writable = await savedFileHandle.createWritable();
            await writable.write(buildXml());
            await writable.close();
        } else {
            exportXml();
        }
    }
});

document.getElementById('load').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => importXml(ev.target.result);
        reader.readAsText(file);
    });
    input.click();
});

function importXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) return;

    const boxEls = [...doc.querySelectorAll('boxes > box')];
    const itemEls = [...doc.querySelectorAll('items > item')];

    // build box data objects (targets resolved in second pass)
    const newBoxes = boxEls.map(el => {
        const rect = el.getAttribute('rect')?.split(' ') ?? [];
        const expr = el.getAttribute('expr')?.split(' ') ?? [];
        const itemSz = el.getAttribute('itSz')?.split(' ') ?? [];
        const itemSp = el.getAttribute('itSp')?.split(' ') ?? [];
        const itemAl = el.getAttribute('itAl')?.split(' ') ?? [];
        const formulas = {};
        ['x','y','w','h'].forEach((dim, i) => { if (expr[i]) formulas[dim] = expr[i]; });
        return {
            name:        el.getAttribute('name') ?? '',
            labelPos:    el.getAttribute('namePos') ?? 'bl',
            color:       el.getAttribute('col') ?? BOX_COLORS[0],
            visible:     el.getAttribute('vis') !== '0',
            x:           parseFloat(rect[0]) || 0,
            y:           parseFloat(rect[1]) || 0,
            w:           parseFloat(rect[2]) || 120,
            h:           parseFloat(rect[3]) || 80,
            formulas,
            targets:     {},
            items:       [],
            itemWidth:   itemSz[0] ?? '40',
            itemHeight:  itemSz[1] ?? '20',
            itemSpacingX: parseFloat(itemSp[0]) || 0,
            itemSpacingY: parseFloat(itemSp[1]) || 0,
            itemGap:     parseFloat(el.getAttribute('itGap')) || 0,
            itemBreak:   parseFloat(el.getAttribute('itBr')) || 0,
            itemAlignX:  parseFloat(itemAl[0]) || 0,
            itemAlignY:  parseFloat(itemAl[1]) || 0,
        };
    });

    // resolve target references
    boxEls.forEach((el, i) => {
        const parts = el.getAttribute('tar')?.split(' ') ?? [];
        ['x','y','w','h'].forEach((dim, j) => {
            const t = parts[j]?.trim();
            if (t !== '' && t !== undefined) {
                const idx = parseInt(t);
                if (!isNaN(idx) && newBoxes[idx]) newBoxes[i].targets[dim] = newBoxes[idx];
            }
        });
    });

    // assign items to their boxes
    itemEls.forEach(el => {
        const box = newBoxes[parseInt(el.getAttribute('boxId'))];
        if (!box) return;
        const expr = el.getAttribute('expr')?.split(' ') ?? [];
        const hasBreak = el.getAttribute('br') === '1';
        const formulas = {};
        ['x','y','w','h'].forEach((dim, i) => { if (expr[i]) formulas[dim] = expr[i]; });
        if (hasBreak) formulas.break = el.getAttribute('brFormula') ?? '';
        box.items.push({
            name:    el.getAttribute('name') ?? '',
            visible: el.getAttribute('vis') !== '0',
            break:   hasBreak,
            formulas,
        });
    });

    // rebuild DOM
    select(null);
    boxList.querySelectorAll('.box-group').forEach(g => g.remove());
    boxes.length = 0;
    boxes.push(screenBox);
    boxCount = newBoxes.length;

    newBoxes.forEach(boxData => {
        boxes.push(boxData);
        const group = createItem(boxData);
        if (boxData.items.length) {
            group._item.querySelector('.expand-btn').style.display = '';
            boxData.items.forEach(it => group._children.append(createItemRow(boxData, group, it)));
        }
        boxList.append(group);
    });

    syncAllItemIds();
    drawView();
}

async function exportXml() {
    const content = buildXml();

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'layout.xml',
                types: [{ description: 'XML File', accept: { 'application/xml': ['.xml'] } }],
            });
            savedFileHandle = handle;
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
    }

    const name = prompt('Save as:', 'layout.xml');
    if (!name) return;
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

function buildXml() {
    const realBoxes = boxes.filter(b => !b.isScreen);
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<layout>'];

    lines.push('  <boxes>');
    realBoxes.forEach((box, i) => {
        const f = box.formulas ?? {};
        const t = box.targets ?? {};
        const r = resolveBox(box);
        const tid = b => b ? realBoxes.indexOf(b) : '';
        lines.push(
            `    <box id="${i}" name=${xmlAttr(box.name)} namePos="${box.labelPos ?? 'bl'}" col="${box.color ?? ''}" vis="${box.visible ? 1 : 0}"`,
            `        rect="${fmt(r.x)} ${fmt(r.y)} ${fmt(r.w)} ${fmt(r.h)}" expr=${xmlAttr(`${fmtF(f.x)} ${fmtF(f.y)} ${fmtF(f.w)} ${fmtF(f.h)}`)} tar="${tid(t.x)} ${tid(t.y)} ${tid(t.w)} ${tid(t.h)}"`,
            `        itSz=${xmlAttr(`${fmtF(box.itemWidth ?? 40)} ${fmtF(box.itemHeight ?? 20)}`)} itSp="${box.itemSpacingX ?? 0} ${box.itemSpacingY ?? 0}" itGap="${box.itemGap ?? 0}" itBr="${box.itemBreak ?? 0}" itAl="${box.itemAlignX ?? 0} ${box.itemAlignY ?? 0}" />`,
        );
    });
    lines.push('  </boxes>');

    lines.push('  <items>');
    let itemId = 0;
    realBoxes.forEach((box, boxId) => {
        const br = resolveBox(box);
        resolveItems(box).forEach(({ item, x, y, w, h }) => {
            const f = item.formulas ?? {};
            lines.push(
                `    <item id="${itemId++}" boxId="${boxId}" name=${xmlAttr(item.name)} vis="${item.visible !== false ? 1 : 0}" rect="${fmt(x - br.x)} ${fmt(y - br.y)} ${fmt(w)} ${fmt(h)}" expr=${xmlAttr(`${fmtF(f.x)} ${fmtF(f.y)} ${fmtF(f.w)} ${fmtF(f.h)}`)} br="${item.break ? 1 : 0}" brFormula=${xmlAttr(fmtF(f.break))} />`,
            );
        });
    });
    lines.push('  </items>');

    lines.push('</layout>');
    return lines.join('\n');
}

function fmt(v) { return Math.round(v * 100) / 100; }
function fmtF(v) { return String(v ?? '').replace(/\s+/g, ''); }

function xmlAttr(v) {
    return `"${String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"`;
}
