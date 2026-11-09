
/* Home page scripts: drawing board, "about" animation, nav highlighting.
   (The theme toggle lives in theme.js.) */


/* ---------- 1. Drawing board ----------
   Black pen only, no controls, except a Draw / Done button on touch screens.
 
   Touch screens start in "scroll" mode: a finger scrolls the page, so the board
   can never trap you. Tap Draw to sketch with a finger, tap Done to scroll again.
   Mouse and pen always draw. */
function initDrawingBoard() {
  const canvas = document.querySelector("#home canvas");
  const ctx = canvas.getContext("2d");
  const toggle = document.getElementById("draw-toggle");
  const touchOnly = matchMedia("(hover: none) and (pointer: coarse)"); // same query as style.css

  let drawing = false;
  let last = null;
  let size = { w: 0, h: 0, ratio: 1 };

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // Match the canvas to its CSS size (and stay sharp on retina screens).
  // Resizing a canvas wipes it, so we copy the drawing and put it back.
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === size.w && rect.height === size.h && ratio === size.ratio) return;

    const saved = document.createElement("canvas");
    saved.width = canvas.width;
    saved.height = canvas.height;
    saved.getContext("2d").drawImage(canvas, 0, 0);

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.drawImage(saved, 0, 0, saved.width / size.ratio, saved.height / size.ratio);

    // Pen settings are reset whenever the canvas size changes
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    size = { w: rect.width, h: rect.height, ratio };
  }

  function setMode(mode) {
    canvas.dataset.mode = mode;
    toggle.textContent = mode === "draw" ? "Done" : "Draw";
  }

  function resetMode() {
    setMode(touchOnly.matches ? "scroll" : "draw");
  }

  function line(from, to) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function stop() {
    drawing = false;
  }

  // Pointer events cover mouse, touch and pen with the same code
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" && canvas.dataset.mode !== "draw") return; // finger is scrolling
    if (e.pointerType === "mouse" && e.button !== 0) return;

    drawing = true;
    last = point(e);
    canvas.setPointerCapture(e.pointerId); // keep drawing if the pointer leaves the canvas
    line(last, { x: last.x + 0.01, y: last.y }); // a dot for a simple click
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const next = point(e);
    line(last, next);
    last = next;
  });

  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);

  toggle.addEventListener("click", () => {
    setMode(canvas.dataset.mode === "draw" ? "scroll" : "draw");
  });

  // Hide the button when the board is mostly scrolled out of view
  new IntersectionObserver(([entry]) => {
    toggle.classList.toggle("is-offscreen", !entry.isIntersecting);
  }, { threshold: 0.5 }).observe(canvas);

  touchOnly.addEventListener("change", resetMode);
  window.addEventListener("resize", resize);

  resize();
  resetMode();
}


/* ---------- 2. "About" tagline slides in once ---------- */
function initAboutAnimation() {
  const tagline = document.querySelector(".tagline");

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tagline.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible", "animate__animated", "animate__slideInRight");
      observer.unobserve(entry.target); // play once
    });
  }, { threshold: 0.3 });

  observer.observe(tagline);
}


/* ---------- 3. Strike through the nav link of the section in view ---------- */
function initNavSpy() {
  const navLinks = document.querySelectorAll('.site-nav li a[href^="#"]');

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.removeAttribute("aria-current"));
      document
        .querySelector(`.site-nav li a[href="#${entry.target.id}"]`)
        ?.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-50% 0px -50% 0px" }); // a section counts when it crosses the middle of the screen

  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));
}


initDrawingBoard();
initAboutAnimation();
initNavSpy();

