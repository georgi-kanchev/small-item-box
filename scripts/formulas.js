// param order must stay in sync with the args array in evalFormula
const FORMULA_PARAMS = [
    'mx','my','mw','mh','mlx','mly','mrx','mry','mux','muy','mdx','mdy',
    'sx','sy','sw','sh','slx','sly','srx','sry','sux','suy','sdx','sdy',
    'tx','ty','tw','th','tv','tlx','tly','trx','tRY','tux','tuy','tdx','tdy',
];
const formulaCache = new Map();

const ITEM_FORMULA_PARAMS = ['ow', 'oh', 'ov', 'osx', 'osy', 'og', 'mb', 'mx', 'my', 'mw', 'mh'];
const itemFormulaCache = new Map();

function compileItemFormula(expr) {
    try {
        return new Function(...ITEM_FORMULA_PARAMS, '"use strict"; return (' + String(expr).trim() + ')');
    } catch {
        return null;
    }
}

function evalItemFormula(expr, ow, oh, ov, osx, osy, og, mb, mx, my, mw, mh) {
    if (expr === null || expr === undefined || String(expr).trim() === '') return null;
    if (typeof expr === 'number') return expr;
    const key = String(expr).trim();
    if (!itemFormulaCache.has(key)) itemFormulaCache.set(key, compileItemFormula(key));
    const fn = itemFormulaCache.get(key);
    if (!fn) return null;
    try {
        const result = fn(ow, oh, ov, osx, osy, og, mb, mx, my, mw, mh);
        return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
        return null;
    }
}

function resolveItems(box) {
    if (!box.items?.length) return [];
    const r = resolveBox(box);
    const ow = r.w, oh = r.h, ov = box.visible ? 1 : 0;
    const osx = box.itemSpacingX ?? 0;
    const osy = box.itemSpacingY ?? 0;
    const og = box.itemGap ?? 0;
    const mb = box.itemBreak ?? 0;

    const defW = evalItemFormula(box.itemWidth, ow, oh, ov, osx, osy, og, mb, 0, 0, 0, 0) ?? 40;
    const defH = evalItemFormula(box.itemHeight, ow, oh, ov, osx, osy, og, mb, 0, 0, 0, 0) ?? 20;

    let curX = r.x + osx;
    let curY = r.y + osy;
    let rowMaxH = 0;

    return box.items.map(item => {
        if (item.break) {
            const effectiveMb = mb > 0 ? mb : rowMaxH;
            const brkVal = evalItemFormula(item.formulas?.break, ow, oh, ov, osx, osy, og, effectiveMb, curX, curY, defW, defH) ?? effectiveMb;
            curY += brkVal + og;
            curX = r.x + osx;
            rowMaxH = 0;
        }
        const mx = curX, my = curY;
        const f = item.formulas ?? {};
        const w = evalItemFormula(f.w, ow, oh, ov, osx, osy, og, mb, mx, my, defW, defH) ?? defW;
        const h = evalItemFormula(f.h, ow, oh, ov, osx, osy, og, mb, mx, my, defW, defH) ?? defH;
        const x = evalItemFormula(f.x, ow, oh, ov, osx, osy, og, mb, mx, my, defW, defH) ?? mx;
        const y = evalItemFormula(f.y, ow, oh, ov, osx, osy, og, mb, mx, my, defW, defH) ?? my;
        if (item.visible !== false) {
            curX += w + og;
            if (h > rowMaxH) rowMaxH = h;
        }
        return { item, x, y, w, h };
    });
}

function compileFormula(expr) {
    const sanitized = String(expr).trim().replace(/\btry\b/gi, 'tRY');
    try {
        return new Function(...FORMULA_PARAMS, '"use strict"; return (' + sanitized + ')');
    } catch {
        return null;
    }
}

function evalFormula(expr, box, targetBox, depth = 0, forbidden = null) {
    if (depth > 8) return null;
    if (expr === null || expr === undefined || String(expr).trim() === '') return null;
    if (typeof expr === 'number') return expr;

    const key = String(expr).trim();
    if (!formulaCache.has(key)) formulaCache.set(key, compileFormula(key));
    const fn = formulaCache.get(key);
    if (!fn) return null;

    const { w: sw, h: sh } = getViewSize();
    const effectiveTarget = forbidden?.has(targetBox) ? null : targetBox;
    let t = { x: 0, y: 0, w: 0, h: 0, visible: false };
    if (effectiveTarget) {
        const tr = resolveBox(effectiveTarget, depth + 1, forbidden);
        t = { x: tr.x, y: tr.y, w: tr.w, h: tr.h, visible: !!effectiveTarget.visible };
    }

    const mx = box.x ?? 0, my = box.y ?? 0, mw = box.w ?? 0, mh = box.h ?? 0;
    try {
        const result = fn(
            mx, my, mw, mh,
            mx, my + mh/2, mx + mw, my + mh/2,
            mx + mw/2, my, mx + mw/2, my + mh,
            0, 0, sw, sh,
            0, sh/2, sw, sh/2,
            sw/2, 0, sw/2, sh,
            t.x, t.y, t.w, t.h, t.visible ? 1 : 0,
            t.x, t.y + t.h/2, t.x + t.w, t.y + t.h/2,
            t.x + t.w/2, t.y, t.x + t.w/2, t.y + t.h,
        );
        return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
        return null;
    }
}

function resolveBox(box, depth = 0, forbidden = null) {
    const f = box.formulas ?? {};
    return {
        x: evalFormula(f.x, box, box.targets?.x, depth, forbidden) ?? box.x,
        y: evalFormula(f.y, box, box.targets?.y, depth, forbidden) ?? box.y,
        w: evalFormula(f.w, box, box.targets?.w, depth, forbidden) ?? box.w,
        h: evalFormula(f.h, box, box.targets?.h, depth, forbidden) ?? box.h,
    };
}

function getScrollBounds(box) {
    const r = resolveBox(box);
    const laid = resolveItems(box);
    const visible = laid.filter(i => i.item.visible !== false);
    if (!visible.length) return null;
    const contentW = Math.max(...visible.map(i => i.x + i.w)) - r.x;
    const contentH = Math.max(...visible.map(i => i.y + i.h)) - r.y;
    return {
        r,
        contentW, contentH,
        maxScrollX: Math.max(0, contentW - r.w),
        maxScrollY: Math.max(0, contentH - r.h),
        alignX: box.itemAlignX ?? 0,
        alignY: box.itemAlignY ?? 0,
    };
}

function getViewSize() {
    const base = 512;
    return {
        w: Math.round(base * Math.sqrt(aspectRatio)),
        h: Math.round(base / Math.sqrt(aspectRatio))
    };
}
