// Books and Articles page: the Books / Articles switch, and the Articles view.
// The article data is site/books/articles.json, written by
// articles/scripts/gen_app.py. The PDFs live at /articles/papers/.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var PDF_BASE = "../articles/papers/";
  var ITEMS = [], ORDER = [], BLURB = {}, active = null, expanded = false, loaded = false;

  // ----- view switch -----
  var views = { books: $("view-books"), articles: $("view-articles") };
  var tabs = [].slice.call(document.querySelectorAll(".bk-tab"));
  function show(name, push) {
    if (!views[name]) name = "books";
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.view === name)); });
    if (push) history.replaceState(null, "", name === "books" ? location.pathname : location.pathname + "#articles");
    if (name === "articles") loadArticles();
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.view, true); }); });
  window.addEventListener("hashchange", function () { show(location.hash === "#articles" ? "articles" : "books"); });

  // ----- articles -----
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };

  function entry(it) {
    var url = PDF_BASE + encodeURIComponent(it.file);
    var links = [];
    if (it.arxiv) links.push('<a class="lnk" href="https://arxiv.org/abs/' + esc(it.arxiv) + '">arXiv:' + esc(it.arxiv) + "</a>");
    if (it.doi) links.push('<a class="lnk" href="https://doi.org/' + esc(it.doi) + '">doi:' + esc(it.doi) + "</a>");
    var htmlLink = it.html ? '<a class="html-btn" href="' + esc(it.html) + '">HTML</a>' : "";
    var co = (it.authors || []).filter(function (a) { return !/Lozano/i.test(a); });
    var tags = (it.msc || []).slice(0, 3).map(function (m) { return '<span class="atag msc">MSC ' + esc(m) + "</span>"; })
      .concat((it.tags || []).slice(0, 3).map(function (t) { return '<span class="atag">' + esc(t) + "</span>"; }));
    return '<li class="item"><div class="num">' + it.n + "</div><div>" +
      '<p class="t"><a href="' + url + '">' + esc(it.title) + "</a></p>" +
      '<p class="cite">' + (it.preprint ? '<span class="j">Preprint</span>' : '<span class="j">' + esc(it.where) + "</span>") + "</p>" +
      (co.length ? '<p class="auth">with ' + co.map(esc).join(", ") + "</p>" : "") +
      '<div class="meta">' +
        '<button class="abs-btn" type="button" aria-expanded="false"' + (it.abstract ? "" : " disabled") + ">" +
          (it.abstract ? (it.summary ? "Summary" : "Abstract") : "Unavailable") + "</button>" +
        htmlLink +
        (it.preprint ? '<span class="atag pre">preprint</span>' : "") +
        links.map(function (l) { return '<span class="sep">·</span>' + l; }).join("") +
        tags.join("") +
      "</div>" +
      (it.abstract ? '<div class="abs" hidden>' + esc(it.abstract) + '<span class="src">' +
        (it.summary ? "Summary — this article carries no published abstract." : "abstract via " + esc(it.abstract_source || "unknown")) +
        "</span></div>" : "") +
      "</div></li>";
  }

  function setAbs(btn, open) {
    var panel = btn.parentElement.parentElement.querySelector(".abs");
    if (!panel) return;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Hide" : (btn.dataset.label || "Abstract");
  }

  function render() {
    var q = $("aq").value.trim().toLowerCase();
    var hits = ITEMS.filter(function (it) {
      if (active && it.category !== active) return false;
      if (!q) return true;
      return (it.title + " " + (it.abstract || "") + " " + (it.tags || []).join(" ") + " " + it.where + " " +
        (it.msc || []).join(" ")).toLowerCase().indexOf(q) >= 0;
    });
    var main = $("av-main");
    if (!hits.length) { main.innerHTML = '<p class="empty">Nothing matches “' + esc(q) + "”.</p>"; return; }
    var out = "";
    ORDER.forEach(function (cat) {
      var group = hits.filter(function (i) { return i.category === cat; }).sort(function (a, b) { return b.n - a.n; });
      if (!group.length) return;
      out += '<section class="acat"><div class="h"><h3>' + esc(cat) + '</h3><span class="count">' + group.length + "</span></div>" +
        '<p class="blurb">' + esc(BLURB[cat] || "") + '</p><ol class="alist">' + group.map(entry).join("") + "</ol></section>";
    });
    main.innerHTML = out;
    main.querySelectorAll(".abs-btn:not([disabled])").forEach(function (b) {
      b.dataset.label = b.textContent;
      if (expanded) setAbs(b, true);
    });
    typeset(main);
  }

  // MathJax is loaded only when the Articles view is first opened.
  function typeset(el) {
    if (!window.MathJax || !window.MathJax.typesetPromise) return;
    if (window.MathJax.typesetClear) window.MathJax.typesetClear([el]);
    window.MathJax.typesetPromise([el]).catch(function () {});
  }
  function loadMathJax() {
    if (window.MathJax) return;
    window.MathJax = {
      tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]], displayMath: [["$$", "$$"], ["\\[", "\\]"]], processEscapes: true },
      options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"] },
      svg: { fontCache: "global" },
      startup: { pageReady: function () { return window.MathJax.startup.defaultPageReady().then(function () { typeset($("av-main")); }); } }
    };
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js";
    s.async = true;
    document.head.appendChild(s);
  }

  function loadArticles() {
    if (loaded) return;
    loaded = true;
    loadMathJax();
    fetch("articles.json").then(function (r) { return r.json(); }).then(function (d) {
      ITEMS = d.items; ORDER = d.order; BLURB = d.blurb;
      var s = d.stats;
      $("afacts").innerHTML = "<span><b>" + s.total + "</b> articles</span><span><b>" + s.first + "</b>–<b>" + s.last +
        "</b></span><span><b>" + s.abstracts + "</b> with abstracts</span><span><b>" + s.summaries + "</b> with summaries</span>";
      var chips = $("achips");
      chips.innerHTML = '<button class="chip" type="button" data-cat="" aria-pressed="true">All<span class="c">' + ITEMS.length + "</span></button>" +
        ORDER.map(function (c) {
          return '<button class="chip" type="button" data-cat="' + esc(c) + '" aria-pressed="false">' + esc(c) +
            '<span class="c">' + ITEMS.filter(function (i) { return i.category === c; }).length + "</span></button>";
        }).join("");
      render();
    }).catch(function () { $("av-main").innerHTML = '<p class="empty">Could not load the articles.</p>'; });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".abs-btn");
    if (b && !b.disabled) setAbs(b, b.getAttribute("aria-expanded") !== "true");
  });
  $("aq").addEventListener("input", render);
  $("toggle-all").addEventListener("click", function (e) {
    expanded = !expanded;
    e.currentTarget.textContent = expanded ? "Collapse abstracts" : "Expand abstracts";
    document.querySelectorAll("#av-main .abs-btn:not([disabled])").forEach(function (b) { setAbs(b, expanded); });
  });
  $("achips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    active = b.dataset.cat || null;
    $("achips").querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    render();
  });

  show(location.hash === "#articles" ? "articles" : "books");
})();
