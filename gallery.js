
/* Gallery page: infinite draggable grid + full-screen viewer.
   Three phases, advanced by clicking:
     1. floating gallery
     2. click an image -> full width, scrollable, no text
     3. click again    -> whole image with the text beside it
     4. click again    -> back to the floating gallery
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
  img("busBuilding.jpg", "busBuilding.jpg", "Bus building", "A building as seen from the bus. Barcelona . 2025."),
  img("carmel1.jpg", "carmel.jpg", "El Carmel", "Montage of a neighbourhood . Barcelona . 2025"),
  img("carmel2.jpg", "carmel.jpg", "El Carmel", "Montage of a neighbourhood . Barcelona . 2025"),
  img("port.jpg", "port.jpg", "El Port", "Map of a port . Barcelona . 2025"),
  img("tibidabo.jpg", "tibidabo.jpg", "Tibidabo", "A view of Tibidabo . Barcelona . 2025"),
  img("okupa.jpg", "okupa.jpg", "La casa Fantasma", "Portrait of an occupied building . Barcelona . 2026"),
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

const DRAG_SLOP = 6;  // px a pointer may move and still count as a click / tap
const MOBILE_ZOOM = 1.5; // phones: how far past "fills the screen" the picture is scaled (1 = just fills it)


/* ==========================================================================
   3. Infinite grid
   ========================================================================== */
const grid = document.getElementById("grid");
const pos = { x: 0, y: 0 };         // where the grid is now
const target = { x: 0, y: 0 };      // where it is heading
const drift = { x: -0.2, y: -0.1 }; // automatic movement (direction and speed)

let cells = [];
let wrapX;
let wrapY;
let dragging = false;

// Picks a random image for every cell, never repeating the same image next to itself
// (left, above, and across the edges where the grid wraps around)
function layoutIndexes(rows, cols) {
  const all = IMAGES.map((_, i) => i);
  const layout = [];
  for (let r = 0; r < rows; r++) {
    layout[r] = [];
    for (let c = 0; c < cols; c++) {
      const banned = [
        c > 0 ? layout[r][c - 1] : -1,        // left neighbour
        r > 0 ? layout[r - 1][c] : -1,        // neighbour above
        c === cols - 1 ? layout[r][0] : -1,   // wraps to the first column
        r === rows - 1 ? layout[0][c] : -1,   // wraps to the first row
      ];
      const options = all.filter((i) => !banned.includes(i));
      const pool = options.length ? options : all;
      layout[r][c] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return layout;
}

// Builds a grid slightly bigger than the screen (1 extra row and column)
function build() {
  const mobile = innerWidth < MOBILE_BREAKPOINT;
  const cellW = Math.round(innerWidth / (mobile ? 2 : 4));
  const cellH = cellW;
  const imgSize = Math.round(cellW * (mobile ? IMG_RATIO_MOBILE : IMG_RATIO_DESKTOP));
  const cols = Math.ceil(innerWidth / cellW) + 1;
  const rows = Math.ceil(innerHeight / cellH) + 1;
  const layout = layoutIndexes(rows, cols);

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
      const index = layout[r][c];
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
   4. Full-screen viewer
   ========================================================================== */
const lightbox = document.getElementById("lightbox");
const stage = document.getElementById("lightboxStage");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxText = document.getElementById("lightboxText");

let openToken = 0; // stops a slow image from replacing a newer one
let openedAt = 0;  // when the viewer last opened (used to ignore the tap that opened it)

// On phones the picture is scaled up beyond the screen so you can pan around it with a finger.
// The size is passed to the CSS through --picture-w (on desktop it is removed: full width).
function sizePicture(w = lightboxImg.naturalWidth, h = lightboxImg.naturalHeight) {
  if (innerWidth >= MOBILE_BREAKPOINT || !w || !h) {
    lightbox.style.removeProperty("--picture-w");
    return;
  }
  const cover = Math.max(innerWidth / w, innerHeight / h); // smallest scale that fills the screen
  lightboxImg.style.aspectRatio = `${w} / ${h}`;           // so its height is known straight away
  lightbox.style.setProperty("--picture-w", Math.round(w * cover * MOBILE_ZOOM) + "px");
}

// Start in the middle of the picture instead of the top-left corner
function centerPicture() {
  stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
  stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2;
}

function openLightbox(index) {
  const item = IMAGES[index];
  const token = ++openToken;
  openedAt = performance.now();

  lightboxTitle.textContent = item.title;
  lightboxText.textContent = item.text;
  stage.scrollTop = 0;
  lightbox.classList.remove("fit"); // always start at full width, no text
  lightboxImg.classList.remove("ready");

  // Wait for the full image, then fade it in (a square thumb would make the layout jump)
  const big = new Image();
  big.onload = () => {
    if (token !== openToken) return;
    lightboxImg.src = item.full;
    sizePicture(big.naturalWidth, big.naturalHeight);
    lightboxImg.classList.add("ready");
    if (innerWidth < MOBILE_BREAKPOINT) centerPicture();
  };
  big.src = item.full;

  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  openToken++;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
}

// Click: full width -> whole image with text -> back to the gallery
lightbox.addEventListener("click", (e) => {
  if (performance.now() - openedAt < 500) return; // on touch, the tap that opened the viewer also "clicks" it
  if (e.target.closest(".lb-side")) return; // lets you select the text without moving on
  if (!lightbox.classList.contains("fit")) {
    lightbox.classList.add("fit");
  } else {
    closeLightbox();
  }
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
    if (lightbox.classList.contains("open")) sizePicture(); // e.g. the phone is rotated
    // Ignore small height changes: phone browsers show / hide their address bar while scrolling
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 150) return;
    lastW = innerWidth;
    lastH = innerHeight;
    build();
  }, 200);
});

build();


