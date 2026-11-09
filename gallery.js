
/* Gallery page: infinite draggable grid + full-screen viewer with a magnifier.
   (The theme toggle lives in theme.js.) */

gsap.registerPlugin(Observer);


/* ==========================================================================
   1. Images  (edit this list to add or change pictures)
   img(thumbnail, full, title, text)
     thumbnail -> images/thumbs/  square crop shown in the grid
     full      -> images/         the picture shown in the viewer
   ========================================================================== */
const THUMBS = "images/thumbs/";
const FULL = "images/";

const img = (thumb, full, title, text) => ({
  thumb: THUMBS + thumb,
  full: FULL + full,
  title,
  text,
});

const IMAGES = [
  img("brutalUK.jpg", "brutalUK.jpg", "Brutal UK", "M6 Service Station, UK. Ink on paper 2026."),
  img("busBuilding.jpg", "busBuilding.jpg", "Bus building", "Write your text for this image here."),
  img("carmel1.jpg", "carmel.jpg", "Carmel", "Write your text for this image here."),
  img("carmel2.jpg", "carmel.jpg", "Carmel", "Write your text for this image here."),
  img("port.jpg", "port.jpg", "Carmel", "Write your text for this image here."),
  img("tibidabo.jpg", "tibidabo.jpg", "Tibidabo", "texttext."),
  img("okupa.jpg", "okupa.jpg", "La casa Fantasma", "yeye."),
];


/* ==========================================================================
   2. Settings
   ========================================================================== */
const WHEEL_SPEED = 0.75;  // wheel / trackpad sensitivity
const DRAG_SPEED = 1.25;   // drag sensitivity
const DRIFT_MIN = 0.35;    // slowest automatic movement (px per frame)
const DRIFT_MAX = 0.5;     // fastest movement after "throwing" the gallery
const DRIFT_DECAY = 0.995; // how quickly a throw slows down (closer to 1 = slower)
const SMOOTH = 0.1;        // movement smoothing (lower = more inertia)

const MOBILE_BREAKPOINT = 700; // px: below this the grid uses 2 columns instead of 4
const IMG_RATIO_DESKTOP = 0.6; // thumbnail size as a share of its grid cell
const IMG_RATIO_MOBILE = 0.75; // bigger on phones, where the cells are small

const ZOOM = 2.5;     // magnifier strength (one level)
const PAD = 32;       // lightbox stage padding, both sides. Keep in sync with gallery.css
const DRAG_SLOP = 6;  // px a pointer may move and still count as a click / tap


/* ==========================================================================
   3. Infinite grid
   ========================================================================== */
const grid = document.getElementById("grid");
const pos = { x: 0, y: 0 };      // where the grid is now
const target = { x: 0, y: 0 };   // where it is heading
const drift = { x: -0.2, y: -0.1 }; // automatic movement (direction and speed)

let cells = [];
let wrapX;
let wrapY;
let dragging = false;

// Builds a grid slightly bigger than the screen (1 extra row and column)
function build() {
  const mobile = innerWidth < MOBILE_BREAKPOINT;
  const cellW = Math.round(innerWidth / (mobile ? 2 : 4));
  const cellH = cellW;
  const imgSize = Math.round(cellW * (mobile ? IMG_RATIO_MOBILE : IMG_RATIO_DESKTOP));
  const cols = Math.ceil(innerWidth / cellW) + 1;
  const rows = Math.ceil(innerHeight / cellH) + 1;

  // What leaves one side comes back in on the other
  wrapX = gsap.utils.wrap(-cellW, cols * cellW - cellW);
  wrapY = gsap.utils.wrap(-cellH, rows * cellH - cellH);

  grid.style.setProperty("--cell-w", cellW + "px");
  grid.style.setProperty("--cell-h", cellH + "px");
  grid.style.setProperty("--img-size", imgSize + "px");
  grid.innerHTML = "";
  cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = (r * cols + c) % IMAGES.length;
      const el = document.createElement("div");
      const image = document.createElement("img");

      el.className = "cell";
      image.alt = "";
      image.draggable = false;
      image.dataset.index = index;
      image.src = IMAGES[index].thumb;
      if (image.complete) image.classList.add("loaded"); // cached: show instantly, no fade
      else image.onload = () => image.classList.add("loaded");

      el.appendChild(image);
      grid.appendChild(el);
      cells.push({ el, x: c * cellW, y: r * cellH });
    }
  }
  render();
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  const snap = (v) => Math.round(v * dpr) / dpr; // snap to device pixels so images stay sharp
  for (const c of cells) {
    c.el.style.transform = `translate3d(${snap(wrapX(c.x + pos.x))}px, ${snap(wrapY(c.y + pos.y))}px, 0)`;
  }
}

// Turns the last gesture into the new drift (same direction, limited speed)
function setDrift(dx, dy) {
  const speed = Math.hypot(dx, dy);
  if (!speed) return;
  const k = gsap.utils.clamp(DRIFT_MIN, DRIFT_MAX, speed) / speed;
  drift.x = dx * k;
  drift.y = dy * k;
}

// Animation loop
gsap.ticker.add(() => {
  const dt = gsap.ticker.deltaRatio(); // 1 = 60 fps

  if (!dragging) {
    target.x += drift.x * dt;
    target.y += drift.y * dt;
    // Slow down gradually, but never below the minimum speed
    if (Math.hypot(drift.x, drift.y) > DRIFT_MIN) {
      const decay = Math.pow(DRIFT_DECAY, dt);
      drift.x *= decay;
      drift.y *= decay;
    }
  }

  const k = 1 - Math.pow(1 - SMOOTH, dt);
  pos.x += (target.x - pos.x) * k;
  pos.y += (target.y - pos.y) * k;
  render();
});

// Wheel, trackpad, mouse drag and touch
Observer.create({
  target: grid,
  type: "wheel,touch,pointer",
  wheelSpeed: -1, // the wheel moves the content in the natural direction
  preventDefault: true,
  onPress: () => {
    dragging = true;
    grid.classList.add("is-dragging");
  },
  onRelease: () => {
    dragging = false;
    grid.classList.remove("is-dragging");
  },
  onChange: (self) => {
    const speed = self.event.type === "wheel" ? WHEEL_SPEED : DRAG_SPEED;
    const dx = self.deltaX * speed;
    const dy = self.deltaY * speed;
    target.x += dx;
    target.y += dy;
    setDrift(dx * 0.1, dy * 0.1);
  },
});

// Click / tap (pointer released close to where it was pressed) opens the viewer
let downPos = null;

grid.addEventListener("pointerdown", (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});

grid.addEventListener("pointercancel", () => {
  downPos = null;
});

grid.addEventListener("pointerup", (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > DRAG_SLOP) return; // it was a drag

  const hit = [...grid.querySelectorAll("img")].find((image) => {
    const r = image.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right &&
      e.clientY >= r.top && e.clientY <= r.bottom;
  });
  if (hit) openLightbox(Number(hit.dataset.index));
});


/* ==========================================================================
   4. Lightbox with magnifier
 
   - The cursor is a magnifying glass. Click (or tap) the picture to zoom in
     once; click again to zoom back out.
   - Zoomed in, move the mouse over the picture to look around.
     On touch screens, drag with your finger instead.
   - Close with the x button, Escape, or by clicking the background.
   ========================================================================== */
const lightbox = document.getElementById("lightbox");
const stage = document.getElementById("lightboxStage");
const frame = document.getElementById("lightboxFrame");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxText = document.getElementById("lightboxText");

let openToken = 0;               // stops a slow image from replacing a newer one
let zoomed = false;
let origin = { x: 0.5, y: 0.5 }; // which part of the picture is under the glass (0 to 1)
let press = null;                // the pointer currently pressed on the frame

const clamp01 = gsap.utils.clamp(0, 1);

// Sizes the frame to the picture so the zoom stays inside the picture's edges
function fitFrame() {
  const w = lightboxImg.naturalWidth;
  const h = lightboxImg.naturalHeight;
  if (!w || !h) return;
  const scale = Math.min((stage.clientWidth - PAD) / w, (stage.clientHeight - PAD) / h);
  frame.style.width = Math.floor(w * scale) + "px";
  frame.style.height = Math.floor(h * scale) + "px";
}

function applyZoom() {
  lightboxImg.style.transformOrigin = `${origin.x * 100}% ${origin.y * 100}%`;
  lightboxImg.style.transform = zoomed ? `scale(${ZOOM})` : "";
  frame.classList.toggle("is-zoomed", zoomed);
}

// Points the glass at a screen position. The frame itself never moves, so its box is stable.
function aimAt(clientX, clientY) {
  const r = frame.getBoundingClientRect();
  origin.x = clamp01((clientX - r.left) / r.width);
  origin.y = clamp01((clientY - r.top) / r.height);
}

function toggleZoom(clientX, clientY) {
  if (!zoomed) aimAt(clientX, clientY); // zoom in towards where you clicked
  zoomed = !zoomed;
  applyZoom();
}

function resetZoom() {
  zoomed = false;
  origin = { x: 0.5, y: 0.5 };
  applyZoom();
}

function openLightbox(index) {
  const item = IMAGES[index];
  const token = ++openToken;

  lightboxTitle.textContent = item.title;
  lightboxText.textContent = item.text;
  resetZoom();

  // Show the thumbnail straight away, then swap in the large version once it has loaded
  lightboxImg.src = item.thumb;
  const big = new Image();
  big.onload = () => {
    if (token === openToken) lightboxImg.src = item.full;
  };
  big.src = item.full;

  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  if (lightboxImg.complete) fitFrame();
}

function closeLightbox() {
  openToken++;
  press = null;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  resetZoom();
}

lightboxImg.addEventListener("load", fitFrame);

// Mouse, finger and pen share the same handlers
frame.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  press = { id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
  if (e.pointerType !== "mouse") frame.setPointerCapture(e.pointerId);
});

frame.addEventListener("pointermove", (e) => {
  // Mouse: moving the glass over the picture looks around (no button needed)
  if (e.pointerType === "mouse" && zoomed) {
    aimAt(e.clientX, e.clientY);
    applyZoom();
  }

  if (!press || e.pointerId !== press.id) return;
  if (!press.moved && Math.hypot(e.clientX - press.startX, e.clientY - press.startY) < DRAG_SLOP) return;
  press.moved = true;

  // Touch / pen: dragging pans the zoomed picture
  if (e.pointerType !== "mouse" && zoomed) {
    const dx = e.clientX - press.lastX;
    const dy = e.clientY - press.lastY;
    origin.x = clamp01(origin.x - dx / (frame.clientWidth * (ZOOM - 1)));
    origin.y = clamp01(origin.y - dy / (frame.clientHeight * (ZOOM - 1)));
    applyZoom();
  }
  press.lastX = e.clientX;
  press.lastY = e.clientY;
});

frame.addEventListener("pointerup", (e) => {
  const p = press;
  press = null;
  if (!p || p.id !== e.pointerId || p.moved) return; // a drag is not a click
  toggleZoom(e.clientX, e.clientY);
});

frame.addEventListener("pointercancel", () => {
  press = null;
});

// Keyboard: Enter or Space zooms the centre of the picture
frame.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  const r = frame.getBoundingClientRect();
  toggleZoom(r.left + r.width / 2, r.top + r.height / 2);
});

// Clicking the background or the x closes. The text panel and the picture do not.
lightbox.addEventListener("click", (e) => {
  if (e.target.closest(".lb-side, .lb-frame")) return;
  closeLightbox();
});

addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});


/* ==========================================================================
   5. Resize, then start
   ========================================================================== */
let lastW = innerWidth;
let lastH = innerHeight;
let resizeTimer;

addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    fitFrame();
    // Ignore small height changes: phone browsers show / hide their address bar while scrolling
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 150) return;
    lastW = innerWidth;
    lastH = innerHeight;
    build();
  }, 200);
});

build();

