function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawView() {
    const { w, h } = getViewSize();

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    const selectedItem = document.querySelector('.box-item.selected');
    const selectedBox = selectedItem?._box ?? null;

    // pass 1: bodies
    for (const box of boxes) {
        const isSelected = box === selectedBox;
        const r = resolveBox(box);

        if (box.isScreen) {
            ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(r.x, r.y, r.w, r.h);
            continue;
        }

        const c = box.color ?? '#5b9bd9';
        const isHovered = box === hoveredBox;

        if (!box.visible) continue;

        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.fillStyle = hexToRgba(c, isSelected && isHovered ? 0.28 : isSelected ? 0.2 : isHovered ? 0.14 : 0.1);
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : hexToRgba(c, isHovered ? 0.7 : 0.45);
        ctx.lineWidth = (isSelected ? 1.5 : 1) / camera.zoom;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        if (!box.items?.length) continue;
        const selItemState = typeof selectedItemState !== 'undefined' ? selectedItemState : null;
        const laid = resolveItems(box);
        const visibleItems = laid.filter(i => i.item.visible !== false);
        const osx = box.itemSpacingX ?? 0;
        const osy = box.itemSpacingY ?? 0;
        const alignX = box.itemAlignX ?? 0;
        const alignY = box.itemAlignY ?? 0;
        const naturalW = visibleItems.length ? Math.max(...visibleItems.map(i => i.x + i.w)) - (r.x + osx) : 0;
        const naturalH = visibleItems.length ? Math.max(...visibleItems.map(i => i.y + i.h)) - (r.y + osy) : 0;
        const offX = Math.max(0, r.w - osx - naturalW) * alignX;
        const offY = Math.max(0, r.h - osy - naturalH) * alignY;
        const scrollX = box.scrollX ?? 0;
        const scrollY = box.scrollY ?? 0;

        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.translate(-scrollX + offX, -scrollY + offY);
        for (const { item, x, y, w, h } of laid) {
            if (!item.visible) continue;
            const isSelectedItem = selItemState?.itemData === item;
            ctx.fillStyle = hexToRgba(c, isSelectedItem ? 0.35 : 0.18);
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = hexToRgba(c, isSelectedItem ? 1 : 0.6);
            ctx.lineWidth = (isSelectedItem ? 1.5 : 1) / camera.zoom;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = hexToRgba(c, isSelectedItem ? 1 : 0.9);
            ctx.font = `${10 / camera.zoom}px 'Segoe UI', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name, x + w / 2, y + h / 2);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }
        ctx.restore();

        // scroll handles — drawn after restore so they sit on top of the box, unclipped
        if (!visibleItems.length) continue;
        const contentW = Math.max(...visibleItems.map(i => i.x + i.w)) - r.x;
        const contentH = Math.max(...visibleItems.map(i => i.y + i.h)) - r.y;
        const ht = 3 / camera.zoom;
        const hm = 2 / camera.zoom;

        if (contentW > r.w + 0.5) {
            const maxSX = contentW - r.w;
            const sx = Math.min(scrollX, maxSX);
            const hw = r.w * (r.w / contentW);
            const handleX = r.x + (sx / maxSX) * (r.w - hw);
            if (isHovered) {
                ctx.fillStyle = hexToRgba(c, 0.12);
                ctx.fillRect(r.x, r.y + r.h - ht - hm, r.w, ht);
            }
            ctx.fillStyle = hexToRgba(c, isHovered ? 0.7 : isSelected ? 0.55 : 0.3);
            ctx.fillRect(handleX, r.y + r.h - ht - hm, hw, ht);
        }
        if (contentH > r.h + 0.5) {
            const maxSY = contentH - r.h;
            const sy = Math.min(scrollY, maxSY);
            const hh = r.h * (r.h / contentH);
            const handleY = r.y + (sy / maxSY) * (r.h - hh);
            if (isHovered) {
                ctx.fillStyle = hexToRgba(c, 0.12);
                ctx.fillRect(r.x + r.w - ht - hm, r.y, ht, r.h);
            }
            ctx.fillStyle = hexToRgba(c, isHovered ? 0.7 : isSelected ? 0.55 : 0.3);
            ctx.fillRect(r.x + r.w - ht - hm, handleY, ht, hh);
        }
    }

    // pass 2: labels always on top
    for (const box of boxes) {
        if (box.isScreen || !box.visible) continue;
        const r = resolveBox(box);
        const c = box.color ?? '#5b9bd9';
        const isSelected = box === selectedBox;
        ctx.fillStyle = hexToRgba(c, isSelected ? 1 : 0.85);
        ctx.font = `${11 / camera.zoom}px 'Segoe UI', sans-serif`;
        const lp = box.labelPos ?? 'bl';
        const labelX = lp === 'tr' || lp === 'br' ? r.x + r.w - 10 / camera.zoom : r.x + 4 / camera.zoom;
        const labelY = lp === 'tl' || lp === 'tr' ? r.y + 14 / camera.zoom : r.y + r.h - 8 / camera.zoom;
        ctx.textAlign = lp === 'tr' || lp === 'br' ? 'right' : 'left';
        ctx.fillText(box.name, labelX, labelY);
        ctx.textAlign = 'left';
    }

    // snap lines
    if (activeSnapX !== null || activeSnapY !== null) {
        ctx.save();
        ctx.strokeStyle = 'rgba(80, 180, 255, 0.75)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom]);
        if (activeSnapX !== null) {
            ctx.beginPath(); ctx.moveTo(activeSnapX, 0); ctx.lineTo(activeSnapX, h); ctx.stroke();
        }
        if (activeSnapY !== null) {
            ctx.beginPath(); ctx.moveTo(0, activeSnapY); ctx.lineTo(w, activeSnapY); ctx.stroke();
        }
        ctx.restore();
    }

    // resize handles
    if (selectedBox && !selectedBox.isScreen) {
        const hs = 5 / camera.zoom;
        const handles = getResizeHandles(selectedBox);
        ctx.lineWidth = 1 / camera.zoom;
        for (const [name, pos] of Object.entries(handles)) {
            ctx.fillStyle = hoveredHandle === name ? '#ffffff' : '#c8c8d8';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs);
            ctx.strokeRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs);
        }
    }

    ctx.restore();
}

function updateSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawView();
}

function resetView() {
    const { w, h } = getViewSize();
    const editorRect = document.querySelector('.editor-view').getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    camera.zoom = Math.min(editorRect.width / w, editorRect.height / h) * 0.85;
    camera.x = (editorRect.left - canvasRect.left) + (editorRect.width - w * camera.zoom) / 2;
    camera.y = (editorRect.top - canvasRect.top) + (editorRect.height - h * camera.zoom) / 2;
    drawView();
}
