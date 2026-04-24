let aspectRatio = 16 / 9;
let boxes = [];

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const sidebar = document.getElementById('sidebar');
const dragbar = document.getElementById('dragbar');

document.addEventListener('contextmenu', e => e.preventDefault());
