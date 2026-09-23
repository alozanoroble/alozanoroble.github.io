// Courses page: renders courses.json (built by scripts/fetch_courses.py) as
// filterable tiles, and plays a course in a dialog with its lecture list.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var state = { data: null, group: "all", q: "" };
  var player = $("player"), frame = $("p-frame"), list = $("p-list");
  var current = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function seconds(len) {
    if (!len) return 0;
    return len.split(":").reduce(function (a, p) { return a * 60 + (+p || 0); }, 0);
  }
  function hours(sec) {
    var h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    if (m === 60) { h += 1; m = 0; }
    return h ? h + " h" + (m ? " " + m + " min" : "") : m + " min";
  }
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function thumb(id) { return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg"; }
  function meta(c) {
    var bits = [];
    if (c.by) bits.push(c.by);
    if (c.year) bits.push("CTNT " + c.year);
    return bits.join(" · ");
  }

  function renderChips() {
    var chips = $("chips");
    var opts = [{ key: "all", name: "All" }].concat(state.data.groups.map(function (g) { return { key: slug(g.name), name: g.name }; }));
    opts.forEach(function (o) {
      var b = el("button", "chip", o.name);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset.key = o.key;
      b.setAttribute("aria-selected", o.key === state.group);
      b.addEventListener("click", function () { state.group = o.key; sync(); render(); });
      chips.appendChild(b);
    });
  }
  function sync() {
    [].forEach.call(document.querySelectorAll(".chip"), function (b) {
      b.setAttribute("aria-selected", b.dataset.key === state.group);
    });
  }

  function matches(c, q) {
    if (!q) return { ok: true, hits: 0 };
    if (norm(c.title + " " + (c.by || "") + " " + (c.year || "")).indexOf(q) >= 0) return { ok: true, hits: 0 };
    var hits = c.videos.filter(function (v) { return norm(v.title).indexOf(q) >= 0; }).length;
    return { ok: hits > 0, hits: hits };
  }

  function tile(c) {
    var total = c.videos.reduce(function (a, v) { return a + seconds(v.length); }, 0);
    var b = el("button", "course");
    b.type = "button";
    b.addEventListener("click", function () { open(c, 0); });
    var t = el("span", "c-thumb");
    var img = el("img");
    img.src = thumb(c.videos[0].id);
    img.alt = "";
    img.loading = "lazy";
    img.width = 320; img.height = 180;
    t.appendChild(img);
    t.appendChild(el("span", "c-count", c.videos.length + (c.videos.length === 1 ? " lecture" : " lectures")));
    b.appendChild(t);
    var body = el("span", "c-body");
    body.appendChild(el("span", "c-title", c.title));
    var m = meta(c);
    if (m) body.appendChild(el("span", "c-meta", m));
    if (total) body.appendChild(el("span", "c-len", hours(total)));
    if (c._hits) body.appendChild(el("span", "c-hits", c._hits + (c._hits === 1 ? " matching lecture" : " matching lectures")));
    b.appendChild(body);
    return b;
  }

  function render() {
    var wrap = $("groups"), q = norm(state.q.trim()), shown = 0;
    wrap.textContent = "";
    state.data.groups.forEach(function (g) {
      if (state.group !== "all" && state.group !== slug(g.name)) return;
      var cs = g.courses.filter(function (c) { var m = matches(c, q); c._hits = m.hits; return m.ok; });
      if (!cs.length) return;
      var sec = el("section", "c-group");
      sec.id = slug(g.name);
      sec.appendChild(el("h2", null, g.name));
      if (g.note) sec.appendChild(el("p", "section-note", g.note));
      var grid = el("div", "c-grid");
      cs.forEach(function (c) { grid.appendChild(tile(c)); shown++; });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
    $("empty").hidden = shown > 0;
  }

  function play(i) {
    var v = current.videos[i];
    frame.src = "https://www.youtube-nocookie.com/embed/" + v.id + "?rel=0&modestbranding=1&autoplay=1&list=" + current.id + "&index=" + (i + 1);
    [].forEach.call(list.children, function (li, j) {
      li.firstChild.setAttribute("aria-current", j === i ? "true" : "false");
    });
    var cur = list.children[i];
    if (cur) cur.scrollIntoView({ block: "nearest" });
    history.replaceState(null, "", "#" + current.id + (i ? "/" + (i + 1) : ""));
  }

  function open(c, i) {
    current = c;
    $("p-title").textContent = c.title;
    $("p-meta").textContent = [meta(c), c.videos.length + " lectures"].filter(Boolean).join(" · ");
    var d = (c.description || "").split(/\n\s*\n/)[0];
    var desc = $("p-desc");
    desc.textContent = "";
    d.split(/(https?:\/\/[^\s)]+)/).forEach(function (part, k) {
      if (k % 2) { var a = el("a", null, part); a.href = part; a.rel = "noopener"; desc.appendChild(a); }
      else desc.appendChild(document.createTextNode(part));
    });
    $("p-desc").hidden = !d;
    $("p-yt").href = "https://www.youtube.com/playlist?list=" + c.id;
    list.textContent = "";
    c.videos.forEach(function (v, j) {
      var li = el("li");
      var b = el("button", "lec");
      b.type = "button";
      b.appendChild(el("span", "lec-n", String(j + 1)));
      b.appendChild(el("span", "lec-t", v.title));
      if (v.length) b.appendChild(el("span", "lec-l", v.length));
      b.addEventListener("click", function () { play(j); });
      li.appendChild(b);
      list.appendChild(li);
    });
    if (!player.open) player.showModal();
    play(i || 0);
  }

  function close() {
    frame.src = "about:blank";
    if (player.open) player.close();
    history.replaceState(null, "", location.pathname + location.search);
  }
  $("p-close").addEventListener("click", close);
  player.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  player.addEventListener("click", function (e) { if (e.target === player) close(); });

  $("q").addEventListener("input", function (e) { state.q = e.target.value; render(); });

  fetch("courses.json").then(function (r) { return r.json(); }).then(function (data) {
    state.data = data;
    var n = 0, lec = 0, sec = 0;
    data.groups.forEach(function (g) { g.courses.forEach(function (c) {
      n++; lec += c.videos.length;
      c.videos.forEach(function (v) { sec += seconds(v.length); });
    }); });
    $("stats").textContent = n + " courses · " + lec + " lectures · about " + Math.round(sec / 3600) + " hours of mathematics";
    $("gen").textContent = data.generated;
    renderChips();
    render();
    var m = location.hash.match(/^#([\w-]+)(?:\/(\d+))?$/);
    if (m) {
      data.groups.forEach(function (g) { g.courses.forEach(function (c) {
        if (c.id === m[1]) open(c, m[2] ? Math.min(+m[2], c.videos.length) - 1 : 0);
      }); });
    }
  }).catch(function () {
    $("groups").textContent = "Could not load the course list.";
  });
})();
