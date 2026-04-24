const ratioSlider = document.getElementById('ratioSlider');
document.getElementById('resetViewBtn').addEventListener('click', resetView);
const ratioVal = document.getElementById('ratioVal');
const presetBtns = document.querySelectorAll('.preset-btn');
const flipBtn = document.getElementById('flipBtn');

let flipped = false;

function setSliderFromRatio(ratio) {
    ratioSlider.value = Math.log10(ratio);
    ratioVal.textContent = ratio.toFixed(2);
}

function applyRatio(value) {
    aspectRatio = flipped ? 1 / value : value;
    setSliderFromRatio(aspectRatio);
    resetView();
}

presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyRatio(parseFloat(btn.dataset.ratio));
    });
});

flipBtn.addEventListener('click', () => {
    flipped = !flipped;
    flipBtn.classList.toggle('active', flipped);
    aspectRatio = 1 / aspectRatio;
    setSliderFromRatio(aspectRatio);
    resetView();
});

ratioSlider.addEventListener('input', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    flipped = false;
    flipBtn.classList.remove('active');
    aspectRatio = Math.pow(10, parseFloat(ratioSlider.value));
    ratioVal.textContent = aspectRatio.toFixed(2);
    resetView();
});
