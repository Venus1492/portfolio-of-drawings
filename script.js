// Full-screen drawing board: black pen only, no controls.

var canvas = document.querySelector("canvas");
var context = canvas.getContext("2d");
var drawing = false;
var last = null;

function getCanvasPoint(event) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

// Make the canvas match the window size (and stay sharp on retina screens).
// Resizing a canvas wipes it, so we copy the drawing and put it back.
function resize() {
  var ratio = window.devicePixelRatio || 1;
  var saved = document.createElement("canvas");
  saved.width = canvas.width;
  saved.height = canvas.height;
  saved.getContext("2d").drawImage(canvas, 0, 0);

  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  context.drawImage(saved, 0, 0, saved.width / ratio, saved.height / ratio);

  // Pen settings (reset every time the canvas size changes)
  context.strokeStyle = "#000";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.lineJoin = "round";
}

resize();
window.addEventListener("resize", resize);

// Pointer events cover mouse, touch and pen with the same code
canvas.addEventListener("pointerdown", function (e) {
  drawing = true;
  last = getCanvasPoint(e);
  canvas.setPointerCapture(e.pointerId); // keep drawing even if the pointer leaves the window
  // Draw a dot for a simple click
  context.beginPath();
  context.moveTo(last.x, last.y);
  context.lineTo(last.x + 0.01, last.y);
  context.stroke();
});

canvas.addEventListener("pointermove", function (e) {
  if (!drawing) return;
  var point = getCanvasPoint(e);
  context.beginPath();
  context.moveTo(last.x, last.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  last = point;
});

function stop() {
  drawing = false;
}
canvas.addEventListener("pointerup", stop);
canvas.addEventListener("pointercancel", stop);
