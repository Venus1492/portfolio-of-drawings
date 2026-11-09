
/* Light / dark theme, shared by every page.
   Load this in <head> (no defer) so the right theme is applied before the page paints. */

(function () {
  const root = document.documentElement;
  const KEY = "theme";
  const systemDark = matchMedia("(prefers-color-scheme: dark)");

  function getSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    const button = document.getElementById("theme-toggle");
    // The label says what the button will switch TO
    if (button) button.textContent = theme === "dark" ? "Light" : "Dark";
  }

  // Saved choice wins; otherwise follow the system setting
  setTheme(getSaved() || (systemDark.matches ? "dark" : "light"));

  document.addEventListener("DOMContentLoaded", () => {
    setTheme(root.dataset.theme); // sets the button label now that the button exists

    document.getElementById("theme-toggle").addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch (e) { }
      setTheme(next);
    });
  });

  // If nothing is saved, keep following the system setting live
  systemDark.addEventListener("change", (e) => {
    if (!getSaved()) setTheme(e.matches ? "dark" : "light");
  });
})();

