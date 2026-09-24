// Mathematical genealogy page. Reads genealogy.json, written by
// scripts/fetch_genealogy.py from the Mathematics Genealogy Project.
(function () {
  var MGP = "https://www.genealogy.math.ndsu.nodak.edu/id.php?id=";
  var $ = function (id) { return document.getElementById(id); };
  var P, ROOT, EXTRA = [], choice = {};

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function link(p, cls) {
    var a = el("a", cls, p.name);
    a.href = p.url || MGP + p.id;
    a.rel = "noopener";
    return a;
  }
  function deg(p) { return (p.degrees && p.degrees[0]) || {}; }
  function yearOf(p) {
    var ys = (p.degrees || []).map(function (d) { return parseInt(d.year, 10); }).filter(function (y) { return y > 0; });
    return ys.length ? Math.min.apply(null, ys) : null;
  }
  function degLine(p) {
    return (p.degrees || []).map(function (d) {
      return [d.degree, d.school, d.year].filter(Boolean).join(" · ");
    }).filter(Boolean).join("; ");
  }
  function math(node) {
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(node, { delimiters: [{ left: "$", right: "$", display: false }, { left: "\\(", right: "\\)", display: false }], throwOnError: false });
      } catch (e) {}
    }
  }
  function thesisEl(p) {
    var t = deg(p).thesis;
    if (!t) return null;
    var e = el("span", "thesis", t);
    return e;
  }

  // ----- students -----
  function renderStudents() {
    var box = $("student-list"), me = P[ROOT];
    var kids = me.students.map(function (id) { return P[id]; }).filter(Boolean).concat(EXTRA);
    kids.sort(function (a, b) { return (yearOf(a) || 0) - (yearOf(b) || 0); });
    kids.forEach(function (s) {
      var c = el("div", "st");
      c.appendChild(link(s, "st-name"));
      c.appendChild(el("span", "st-deg", degLine(s)));
      var t = thesisEl(s);
      if (t) c.appendChild(t);
      var grand = s.students.length;
      if (grand) c.appendChild(el("span", "st-grand", grand + (grand === 1 ? " student" : " students") + " of their own"));
      box.appendChild(c);
    });
    if (!kids.length) box.appendChild(el("p", "section-note", "No students recorded yet."));
  }

  // ----- lineage: follow chosen (default first) advisor upward -----
  function path() {
    var out = [ROOT], seen = {}, cur = ROOT;
    seen[cur] = 1;
    for (;;) {
      var adv = (P[cur].advisors || []).filter(function (a) { return P[a] && !seen[a]; });
      if (!adv.length) break;
      var next = choice[cur] && adv.indexOf(choice[cur]) >= 0 ? choice[cur] : adv[0];
      out.push(next); seen[next] = 1; cur = next;
    }
    return out;
  }
  function renderLine() {
    var ol = $("line"), ids = path().reverse();
    ol.textContent = "";
    ids.forEach(function (id, i) {
      var p = P[id], li = el("li", "node" + (id === ROOT ? " me" : ""));
      var gen = ids.length - 1 - i;
      li.appendChild(el("span", "gen", id === ROOT ? "me" : gen === 1 ? "advisor" : gen + " generations up"));
      var card = el("div", "card");
      card.appendChild(link(p, "name"));
      var d = degLine(p);
      if (d) card.appendChild(el("span", "deg", d));
      var t = thesisEl(p);
      if (t) card.appendChild(t);
      // Several advisors: choose which one the line above follows.
      var adv = (p.advisors || []).filter(function (a) { return P[a]; });
      if (adv.length > 1) {
        var above = ids[i - 1];
        var sw = el("div", "branch");
        sw.appendChild(el("span", "branch-label", adv.length + " advisors, follow:"));
        adv.forEach(function (a) {
          var b = el("button", "chip", P[a].name);
          b.type = "button";
          b.setAttribute("aria-pressed", a === above);
          b.addEventListener("click", function () { choice[id] = a; renderLine(); });
          sw.appendChild(b);
        });
        card.appendChild(sw);
      }
      li.appendChild(card);
      ol.appendChild(li);
    });
    math(ol);
  }

  // ----- full outline of advisors -----
  function renderOutline() {
    var box = $("outline"), shown = {};
    function item(id, depth) {
      var p = P[id];
      var adv = (p.advisors || []).filter(function (a) { return P[a]; });
      var head = el("span", "o-head");
      head.appendChild(link(p, "o-name"));
      var y = yearOf(p), sch = deg(p).school;
      var meta = [sch, y].filter(Boolean).join(", ");
      if (meta) head.appendChild(el("span", "o-meta", meta));
      if (shown[id] || !adv.length) {
        var leaf = el("div", "o-leaf");
        leaf.appendChild(head);
        if (shown[id] && adv.length) leaf.appendChild(el("span", "o-seen", "advisors listed above"));
        return leaf;
      }
      shown[id] = 1;
      var d = el("details", "o-node");
      if (depth < 2) d.open = true;
      var s = el("summary");
      s.appendChild(head);
      d.appendChild(s);
      var kids = el("div", "o-kids");
      adv.forEach(function (a) { kids.appendChild(item(a, depth + 1)); });
      d.appendChild(kids);
      return d;
    }
    box.appendChild(item(ROOT, 0));
  }

  function stats() {
    var up = {}, q = [ROOT], depth = {}, maxd = 0;
    depth[ROOT] = 0;
    while (q.length) {
      var id = q.shift();
      (P[id].advisors || []).forEach(function (a) {
        if (P[a] && depth[a] == null) { depth[a] = depth[id] + 1; maxd = Math.max(maxd, depth[a]); up[a] = 1; q.push(a); }
      });
    }
    var ids = Object.keys(up), years = ids.map(function (i) { return yearOf(P[i]); }).filter(Boolean);
    var earliest = years.length ? Math.min.apply(null, years) : null;
    var nStud = P[ROOT].students.length + EXTRA.length;
    $("stats").textContent = ids.length + " recorded ancestors over " + maxd + " generations" +
      (earliest ? ", back to " + earliest : "") + " · " + nStud + (nStud === 1 ? " student" : " students");
  }

  function wire() {
    $("expand").addEventListener("click", function () { [].forEach.call(document.querySelectorAll(".o-node"), function (d) { d.open = true; }); });
    $("collapse").addEventListener("click", function () { [].forEach.call(document.querySelectorAll(".o-node"), function (d, i) { d.open = i === 0; }); });
  }

  fetch("genealogy.json").then(function (r) { return r.json(); }).then(function (data) {
    P = {};
    Object.keys(data.people).forEach(function (k) { P[k] = data.people[k]; P[k].id = +k; });
    ROOT = String(data.root);
    // ids in advisor/student lists are numbers; make lookups by string work
    Object.keys(P).forEach(function (k) {
      P[k].advisors = (P[k].advisors || []).map(String);
      P[k].students = (P[k].students || []).map(String);
    });
    return fetch("extra-students.json").then(function (r) { return r.ok ? r.json() : { students: [] }; })
      .catch(function () { return { students: [] }; })
      .then(function (x) {
        var norm = function (n) { return (n || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, ""); };
        var have = {};
        P[ROOT].students.forEach(function (id) { if (P[id]) have[norm(P[id].name)] = 1; });
        EXTRA = (x.students || []).filter(function (s) { return !have[norm(s.name)]; }).map(function (s) {
          return { name: s.name, url: s.url, students: [],
                   degrees: [{ degree: s.degree, school: s.school, year: s.year, thesis: s.thesis }] };
        });
        return data;
      });
  }).then(function (data) {
    stats();
    renderStudents();
    renderLine();
    renderOutline();
    math($("student-list"));
    wire();
    $("src").innerHTML = "";
    var src = $("src");
    src.appendChild(document.createTextNode("From the "));
    var a = el("a", null, "Mathematics Genealogy Project");
    a.href = MGP + ROOT;
    src.appendChild(a);
    src.appendChild(document.createTextNode(", retrieved " + data.fetched + ". Corrections go to the project, not here."));
  }).catch(function (e) {
    $("line").textContent = "Could not load the genealogy data.";
  });
})();
