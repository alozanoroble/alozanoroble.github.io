// Shared top banner for the satellite sites under alozanoroble.github.io.
// Each satellite loads it with one line before </body>:
//   <script src="https://alozanoroble.github.io/banner.js" defer></script>
// It renders inside a shadow root, so the host page's CSS cannot reach it and
// it cannot restyle the host page. Light or dark follows the host page:
// <html data-theme>, a "dark"/"light" class on <html> or <body>, a
// color-scheme on <html>, else the system setting.
(function () {
  if (window.__alrBanner) return;
  window.__alrBanner = true;

  var HOME = "https://alozanoroble.github.io/";
  var LINKS = [
    { href: HOME + "books/", label: "Books & Articles", match: ["/books/", "/articles/"] },
    { href: HOME + "mathandcobb/", label: "MathAndCobb", match: "/mathandcobb/" },
    { href: HOME + "courses/", label: "Courses", match: "/courses/" },
    { href: HOME + "#apps", label: "Apps", match: null }
  ];
  var APPS = ["/riemann-hypothesis-explorer/", "/godel-ontological-lean/", "/MATH5020-Elliptic_Curves/"];

  var path = location.pathname;
  var host = document.createElement("div");
  host.id = "alr-banner";
  host.style.cssText = "display:block;position:relative;z-index:2147483000;margin:0;padding:0;";
  var root = host.attachShadow({ mode: "open" });

  var css =
    ":host{all:initial;display:block}" +
    ".bar{--paper:#FCFBF8;--ink:#171B22;--muted:#5A6170;--rule:#DEDCD5;--accent:#0E6E68;" +
    "background:var(--paper);color:var(--ink);border-bottom:1px solid var(--rule);" +
    "font:400 15px/1.4 'Source Sans 3',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}" +
    ".bar.dark{--paper:#12151A;--ink:#E6E9EC;--muted:#9AA3AE;--rule:#272D36;--accent:#57C1B8}" +
    ".in{max-width:68rem;margin:0 auto;padding:0 16px;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}" +
    "@media (min-width:720px){.in{padding:0 32px}}" +
    "a{text-decoration:none}" +
    ".brand{font:500 16px 'Spectral',Georgia,'Times New Roman',serif;color:var(--ink);white-space:nowrap}" +
    ".brand:hover{color:var(--accent)}" +
    "nav{display:flex;gap:16px;flex-wrap:wrap}" +
    "nav a{color:var(--muted);font-size:14.5px;white-space:nowrap}" +
    "nav a:hover{color:var(--accent)}" +
    "nav a[aria-current=page]{color:var(--ink);font-weight:600}" +
    "@media (max-width:480px){nav{gap:12px}nav a{font-size:13.5px}}";

  var nav = LINKS.map(function (l) {
    var m = l.match == null ? APPS : [].concat(l.match);
    var cur = m.some(function (p) { return path.indexOf(p) === 0; });
    return '<a href="' + l.href + '"' + (cur ? ' aria-current="page"' : "") + ">" + l.label.replace("&", "&amp;") + "</a>";
  }).join("");
  root.innerHTML = "<style>" + css + '</style><div class="bar" part="bar"><div class="in">' +
    '<a class="brand" href="' + HOME + '">Á. Lozano-Robledo</a>' +
    '<nav aria-label="alozanoroble.github.io">' + nav + "</nav></div></div>";
  var bar = root.querySelector(".bar");

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function hostDark() {
    var h = document.documentElement, b = document.body;
    var t = (h.getAttribute("data-theme") || (b && b.getAttribute("data-theme")) || "").toLowerCase();
    if (t.indexOf("dark") >= 0) return true;
    if (t.indexOf("light") >= 0) return false;
    var cls = " " + h.className + " " + (b ? b.className : "") + " ";
    if (/\s(dark|dark-mode|theme-dark)\s/.test(cls)) return true;
    if (/\s(light|light-mode|theme-light)\s/.test(cls)) return false;
    var cs = (h.style.colorScheme || "").trim();
    if (cs === "dark") return true;
    if (cs === "light") return false;
    return mq.matches;
  }
  function sync() { bar.classList.toggle("dark", hostDark()); }

  function mount() {
    document.body.insertBefore(host, document.body.firstChild);
    sync();
    var mo = new MutationObserver(sync);
    var opts = { attributes: true, attributeFilter: ["class", "data-theme", "style"] };
    mo.observe(document.documentElement, opts);
    mo.observe(document.body, opts);
    mq.addEventListener("change", sync);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
