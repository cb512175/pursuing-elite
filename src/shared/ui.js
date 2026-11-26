/* Shared app shell: Learn · Score · Trends · CoachClint. Data stays in this browser (localStorage). */
(function () {
  "use strict";
  const A = window.APP, CC = window.CoachClint;
  CC.config.appId = A.id; CC.config.appName = A.name; CC.config.storageKey = A.storageKey;
  A.modules.forEach((m) => { window.CC_MODULE_NOTES[m.id] = { text: m.note, ask: m.ask }; });

  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = A.storageKey;
  const load = () => { try { return Object.assign({ done: {}, notes: {}, reps: [], events: [] }, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return { done: {}, notes: {}, reps: [], events: [] }; } };
  let data = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  const fmt = (v) => CC.scoring.fmt(v);
  const normTitle = (s) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const modulesDone = () => Object.keys(data.done).filter((k) => data.done[k]).length;
  let currentModule = null;

  /* ---------- tabs ---------- */
  function show(tab) {
    $$("nav.tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $$("section.view").forEach((v) => v.classList.toggle("on", v.id === "v-" + tab));
    const wide = matchMedia("(min-width:980px)").matches;
    $("#coach").classList.toggle("on", tab === "coach" || wide);
    if (tab === "coach") { openChat(); setTimeout(() => $("#ch-in").focus(), 50); }
    if (tab === "trends") renderTrends();
    if (tab === "drydock") renderDryDock();
    if (tab === "score") renderEventPick();
    if (tab !== "coach") window.scrollTo(0, 0);
  }

  /* ---------- Learn ---------- */
  function renderLearn() {
    const n = modulesDone(), tot = A.modules.length;
    $("#v-learn").innerHTML =
      '<div class="hero"><small style="color:var(--brass);letter-spacing:.12em;text-transform:uppercase;font-weight:700">' + esc(A.kicker) + '</small>' +
      '<h1 class="eq">' + esc(A.headline) + '</h1><p>' + esc(A.intro) + '</p><ul class="how">' + A.how.map((h, i) => '<li><b>' + (i + 1) + '.</b> ' + esc(h) + '</li>').join("") + '</ul>' +
      '<p class="disclose"><b>About CoachClint:</b> CoachClint is an AI coach built on Clint Bruce\'s words and frameworks: the 79% in a 79/21 split, refreshed every 72 hours. It is not the live Clint. The 79/21 split is deliberate: CoachClint is the 79%, real humans are the 21%, and that 21 echoes <b>21toNone</b>, the mission behind everything HoldFast does. Clint: U.S. Naval Academy Hall of Fame linebacker, NFL (Ravens, Saints), former Navy SEAL officer (BUD/S Class 217, SEAL Team FIVE), and founder of HoldFast and Carry the Load.</p>' +
      '<p class="about2">Each piece of HoldFast content is getting its own app. A <b>HighGrounder</b> membership is planned for people who want all of them together, with a CoachClint that works across everything you\'re learning. No pressure: this app stands on its own.</p></div>' +
      '<h2>Lessons</h2><div class="progress" aria-label="progress"><i style="width:' + Math.round((n / tot) * 100) + '%"></i></div><p style="color:var(--mut);margin-top:-8px">' + n + ' of ' + tot + ' complete</p>' +
      '<div class="mods">' + A.modules.map((m, i) => '<button class="mod' + (data.done[m.id] ? " done" : "") + '" data-mod="' + m.id + '"><span class="n">' + (data.done[m.id] ? "✓" : i + 1) + '</span><span class="t"><b>' + esc(m.title) + '</b><small>' + esc(m.lead) + ' · ' + m.mins + ' min</small></span></button>').join("") + '</div>';
    $$("#v-learn .mod").forEach((b) => b.onclick = () => openModule(b.dataset.mod));
  }
  function openModule(id) {
    const m = A.modules.find((x) => x.id === id); if (!m) return; currentModule = m;
    const i = A.modules.indexOf(m), next = A.modules[i + 1];
    $("#v-learn").innerHTML = '<button class="back" id="m-back">← All lessons</button><article class="lesson card"><small style="color:var(--mut)">Lesson ' + (i + 1) + ' of ' + A.modules.length + ' · ' + m.mins + ' min</small><h2>' + esc(m.title) + '</h2><p class="lead">' + esc(m.lead) + '</p>' +
      m.body.map((p) => '<p>' + p + '</p>').join("") + '<blockquote>“' + esc(m.quote) + '”</blockquote>' +
      '<div class="box"><h3>Your rep this week</h3><p>' + esc(m.rep) + '</p><button class="btn ghost small" id="m-score">Score this rep</button></div>' +
      '<div class="box"><h3>Reflect</h3><p>' + esc(m.reflect) + '</p><textarea id="m-note" placeholder="Just for you. Saved on this device.">' + esc(data.notes[m.id] || "") + '</textarea></div>' +
      '<div class="row"><button class="btn" id="m-done">' + (data.done[m.id] ? "✓ Completed" : "Mark complete") + '</button><button class="btn ghost" id="m-ask">Ask CoachClint about this</button>' + (next ? '<button class="btn ghost" id="m-next">Next: ' + esc(next.title) + ' →</button>' : "") + '</div></article>';
    $("#m-back").onclick = () => { currentModule = null; renderLearn(); setCtx(); };
    $("#m-note").oninput = (e) => { data.notes[m.id] = e.target.value; save(); };
    $("#m-done").onclick = () => { data.done[m.id] = true; save(); $("#m-done").textContent = "✓ Completed"; };
    $("#m-score").onclick = () => { show("score"); prefillScore({ title: m.rep.split(".")[0].slice(0, 80), focus: m.focus }); };
    $("#m-ask").onclick = () => { setCtx(); if (!matchMedia("(min-width:980px)").matches) show("coach"); sendChat("Help me with this lesson: " + m.title); };
    if (next) $("#m-next").onclick = () => openModule(next.id);
    setCtx(); window.scrollTo(0, 0);
  }

  /* ---------- Score ---------- */
  let sc = {};
  function renderScore() {
    sc = { raw: null, kind: "practice", event: null, gameDay: false, first: false, parts: {} };
    const bd = A.breakdown ? '<label class="f">Break it down (optional): score each part of the equation</label>' + A.breakdown.map((g) => '<div class="card" style="padding:10px;margin-bottom:8px"><b style="color:var(--brass2)">' + g.group + '</b>' + g.items.map((it) => '<div style="margin-top:6px"><small>' + it + '</small><div class="seg mini" data-part="' + it + '">' + [-1, 0, 1, 2, 3].map((v) => '<button type="button" data-v="' + v + '" aria-pressed="false"><b>' + fmt(v) + '</b></button>').join("") + '</div></div>').join("") + '</div>').join("") : "";
    $("#v-score").innerHTML = '<h2>Score a rep</h2><p style="color:var(--mut)">The scoring systems aren\'t judgements … they\'re data.</p><div class="card">' +
      '<label class="f" for="s-title">What was the rep?</label><input type="text" id="s-title" maxlength="120" placeholder="e.g., Led the Monday team meeting">' +
      '<label class="f" for="s-focus">' + esc(A.scoreFocusLabel) + '</label><select id="s-focus">' + A.scoreFocus.map((f) => '<option>' + esc(f) + '</option>').join("") + '</select>' +
      '<label class="f">What kind of rep was it?</label><div class="seg" id="s-kind"><button type="button" data-k="practice" aria-pressed="true"><b>Practice / everyday</b><small>drills, course work, daily reps</small></button><button type="button" data-k="game" aria-pressed="false"><b>Game Day</b><small>a live or real event from your DryDock</small></button></div><div id="s-event-wrap"></div>' +
      '<label class="check" for="s-first"><input type="checkbox" id="s-first"><span><b>First time I\'ve ever tried this</b><br><small style="color:var(--mut)">Earns a Courage Credit: your floor is +0.5, because it took courage to try.</small></span></label>' +
      '<label class="f">How did it go?</label><div class="seg" id="s-scale">' + CC.scoring.SCALE.map((s) => '<button type="button" data-v="' + s.v + '" aria-pressed="false"><b>' + fmt(s.v) + '</b><small>' + s.label + '</small></button>').join("") + '</div>' +
      '<p id="s-elite-hint" style="font-size:13px;color:var(--mut);margin:6px 0 0">Elite +3 is reserved for your Game Days.</p>' + bd +
      '<label class="f" for="s-note">3 up, 3 down (optional)</label><textarea id="s-note" placeholder="3 things that went well … 3 things to change"></textarea>' +
      '<div id="s-preview"></div><div class="row" style="margin-top:12px"><button class="btn" id="s-save" disabled>Save score</button></div><div id="s-result"></div></div>';
    $$("#s-kind button").forEach((b) => b.onclick = () => { sc.kind = b.dataset.k; if (sc.kind !== "game") sc.event = null; $$("#s-kind button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); renderEventPick(); syncScale(); });
    $$("#s-scale button").forEach((b) => b.onclick = () => { sc.raw = Number(b.dataset.v); syncScale(); });
    $$(".seg.mini").forEach((g) => $$("button", g).forEach((b) => b.onclick = () => { const p = g.dataset.part, v = Number(b.dataset.v); sc.parts[p] = sc.parts[p] === v ? undefined : v; syncScale(); }));
    $("#s-first").onchange = (e) => { sc.first = e.target.checked; syncScale(); };
    $("#s-title").oninput = syncScale;
    $("#s-save").onclick = saveScore;
    syncScale();
  }
  function eventById(id) { return data.events.find((e) => e.id === id) || null; }
  function renderEventPick() {
    const w = $("#s-event-wrap"); if (!w) return;
    if (sc.event && !eventById(sc.event)) sc.event = null;
    if (sc.kind !== "game") { w.innerHTML = ""; return; }
    if (!data.events.length) { w.innerHTML = '<div class="notice" id="s-noevents">You haven\'t named any Game Days yet. In DryDock you list the live and real events you\'ve been building toward, where ascending to Elite is critical. Only reps tagged to one of them can score +3. <button type="button" class="btn ghost small" id="s-godd" style="margin-top:8px">Set up My Game Days (DryDock)</button></div>'; $("#s-godd").onclick = () => show("drydock"); return; }
    w.innerHTML = '<label class="f" for="s-event">Which of your Game Days is this rep for?</label><select id="s-event"><option value="">Choose one …</option>' + data.events.map((e) => '<option value="' + esc(e.id) + '"' + (e.id === sc.event ? " selected" : "") + '>' + esc(e.name) + ' (' + (e.kind === "live" ? "live" : "real") + ')</option>').join("") + '</select>';
    $("#s-event").onchange = (e) => { sc.event = e.target.value || null; syncScale(); };
  }
  function alreadyCredited(title) { const t = normTitle(title); return !!t && data.reps.some((r) => r.courageCredit && normTitle(r.title) === t); }
  function syncScale() {
    sc.gameDay = sc.kind === "game" && !!sc.event;
    let capNote = "";
    if (!sc.gameDay && sc.raw === 3) { sc.raw = 2; capNote = "Love the fire. But Elite is reserved for your Game Days … tag this rep to one of the live or real events in your DryDock to unlock +3. As it stands, it's an Excellent +2."; }
    $$("#s-scale button").forEach((b) => { const v = Number(b.dataset.v); b.setAttribute("aria-pressed", String(v === sc.raw)); if (v === 3) { b.disabled = !sc.gameDay; b.title = sc.gameDay ? "" : "Elite +3 needs a rep tagged to one of your Game Days"; } });
    $$(".seg.mini").forEach((g) => { const p = g.dataset.part; if (!sc.gameDay && sc.parts[p] === 3) sc.parts[p] = 2; $$("button", g).forEach((b) => { const v = Number(b.dataset.v); b.setAttribute("aria-pressed", String(v === sc.parts[p])); if (v === 3) b.disabled = !sc.gameDay; }); });
    $("#s-elite-hint").textContent = sc.gameDay ? "Game Day (" + eventById(sc.event).name + "): Elite +3 is on the table if you earned it." : sc.kind === "game" ? "Choose one of your Game Days to unlock Elite +3." : "Elite +3 is reserved for reps tagged to your Game Days (set them up in DryDock).";
    const title = $("#s-title").value;
    $("#s-save").disabled = sc.raw === null || !title.trim();
    let html = capNote ? '<div class="notice">' + esc(capNote) + '</div>' : "";
    if (sc.raw !== null) {
      const r = CC.scoring.apply({ raw: sc.raw, gameDay: sc.gameDay, firstAttempt: sc.first, alreadyCredited: alreadyCredited(title) });
      html += '<div class="notice ok" id="s-prev">Will record <b>' + fmt(r.recorded) + '</b> (' + esc(CC.scoring.label(r.recorded)) + ')' + (r.courageCredit ? ' <span class="badge cc">★ Courage Credit</span>' : "") + (sc.gameDay ? ' <span class="badge gd">Game Day: ' + esc(eventById(sc.event).name) + '</span>' : "") + (r.notes.length ? '<br>' + r.notes.map(esc).join("<br>") : "") + '</div>';
    }
    $("#s-preview").innerHTML = html;
  }
  function saveScore() {
    const title = $("#s-title").value.trim(); if (!title || sc.raw === null) return;
    const r = CC.scoring.apply({ raw: sc.raw, gameDay: sc.gameDay, firstAttempt: sc.first, alreadyCredited: alreadyCredited(title) });
    const parts = {}; Object.keys(sc.parts).forEach((k) => { if (sc.parts[k] !== undefined) parts[k] = sc.parts[k]; });
    const rep = { id: Date.now().toString(36), at: new Date().toISOString(), title, focus: $("#s-focus").value, gameDay: sc.gameDay, eventId: sc.gameDay ? sc.event : null, eventName: sc.gameDay ? eventById(sc.event).name : null, raw: r.raw, recorded: r.recorded, courageCredit: r.courageCredit, parts, note: $("#s-note").value.trim() };
    data.reps.push(rep); save();
    renderScore();
    $("#s-result").innerHTML = '<div class="notice ok" id="s-saved"><b>Saved: ' + fmt(rep.recorded) + ' (' + esc(CC.scoring.label(rep.recorded)) + ')</b>' + (rep.courageCredit ? ' <span class="badge cc">★ Courage Credit</span><br>That\'s a Courage Credit. Not Good yet … but more than Average, because you tried.' : "") + '<br>One way to read it: <b>' + CC.scoring.path(rep.recorded) + '</b>. ' + (rep.gameDay && rep.recorded === 3 ? "Well done … AND Not Done Yet. Time to ReLoad." : "Proud of you.") + ' <button class="btn ghost small" id="s-talk">Debrief with CoachClint</button></div>';
    $("#s-talk").onclick = () => { if (!matchMedia("(min-width:980px)").matches) show("coach"); sendChat("I scored " + fmt(rep.recorded) + " on: " + rep.title + (rep.courageCredit ? " (first time)" : "")); };
  }
  function prefillScore(p) {
    if (!$("#s-title")) renderScore();
    if (p.title) $("#s-title").value = p.title;
    if (p.focus) { const o = Array.from($("#s-focus").options).find((x) => x.value === p.focus); if (o) $("#s-focus").value = p.focus; }
    if (p.eventId && eventById(p.eventId)) { $$("#s-kind button")[1].click(); sc.event = p.eventId; renderEventPick(); } else if (p.gameDay) $$("#s-kind button")[1].click();
    if (p.firstAttempt) { $("#s-first").checked = true; sc.first = true; }
    if (typeof p.raw === "number") sc.raw = p.raw;
    syncScale();
  }

  /* ---------- DryDock: My Game Days ---------- */
  function renderDryDock() {
    const MAX = 10, evs = data.events;
    const tagged = (id) => data.reps.filter((r) => r.eventId === id).length;
    $("#v-drydock").innerHTML = '<h2>My Game Days (DryDock)</h2>' +
      '<div class="card"><p>DryDock is the honest inventory: pulling the ship out of the water and finding what matters. Here, it means naming the <b>live</b> and <b>real</b> events in your life … the moments you\'ve been building toward, where ascending into <b>Elite</b> is critical.</p>' +
      '<p style="color:var(--mut);margin-bottom:0">Only a rep tagged to one of your Game Days can score <b>Elite +3</b>. Everything else tops out at Excellent +2. The Elite <i>mindset</i> (Not Done Yet) is for every day. The Elite <i>score</i> is for the moments you name here.</p></div>' +
      '<div class="card"><h3>Add a Game Day</h3>' +
      '<label class="f" for="dd-name">What\'s the event?</label><input type="text" id="dd-name" maxlength="80" placeholder="e.g., Friday\'s board presentation · Season opener · My first marathon">' +
      '<label class="f">Is it live or real?</label><div class="seg" id="dd-kind"><button type="button" data-k="live" aria-pressed="true"><b>Live</b><small>performed in front of others</small></button><button type="button" data-k="real" aria-pressed="false"><b>Real</b><small>the real-world thing itself</small></button></div>' +
      '<label class="f" for="dd-when">When? (optional)</label><input type="text" id="dd-when" maxlength="40" placeholder="e.g., March 14 · this fall · ongoing">' +
      '<label class="f" for="dd-why">What have you been building toward? (optional)</label><textarea id="dd-why" maxlength="240" placeholder="Why is ascending to Elite critical here?" style="min-height:60px"></textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn" id="dd-add"' + (evs.length >= MAX ? " disabled" : "") + '>Add to My Game Days</button></div>' + (evs.length >= MAX ? '<p style="color:var(--mut)">Ten is plenty. Remove one to add another.</p>' : "") + '</div>' +
      '<div class="card"><h3>My Game Days (' + evs.length + ')</h3>' + (evs.length ? evs.map((e) => '<div class="dd-ev"><span class="bd"><b>' + esc(e.name) + '</b> <span class="badge ' + e.kind + '">' + (e.kind === "live" ? "Live" : "Real") + '</span>' + '<small>' + esc([e.when, e.why].filter(Boolean).join(" · ") || "No notes yet") + ' · ' + tagged(e.id) + ' rep' + (tagged(e.id) === 1 ? "" : "s") + ' tagged</small></span><button class="del" data-del="' + esc(e.id) + '" aria-label="Remove ' + esc(e.name) + '">×</button></div>').join("") : '<p style="color:var(--mut);margin:0" id="dd-empty">None yet. Name your first one above, or ask CoachClint to help you find it.</p>') +
      '<div class="row" style="margin-top:10px"><button class="btn ghost small" id="dd-ask">Ask CoachClint to help</button></div></div>';
    let kind = "live";
    $$("#dd-kind button").forEach((b) => b.onclick = () => { kind = b.dataset.k; $$("#dd-kind button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
    $("#dd-add").onclick = () => {
      const name = $("#dd-name").value.trim(); if (!name) { $("#dd-name").focus(); return; }
      data.events.push({ id: "e" + Date.now().toString(36), name, kind, when: $("#dd-when").value.trim(), why: $("#dd-why").value.trim() }); save(); renderDryDock();
    };
    $$("#v-drydock [data-del]").forEach((b) => b.onclick = () => { data.events = data.events.filter((e) => e.id !== b.dataset.del); save(); renderDryDock(); });
    $("#dd-ask").onclick = () => { if (!matchMedia("(min-width:980px)").matches) show("coach"); sendChat("Help me find my Game Days in DryDock"); };
  }

  /* ---------- Trends ---------- */
  function renderTrends() {
    const reps = data.reps.slice().sort((a, b) => a.at.localeCompare(b.at));
    const n = reps.length, avg = n ? reps.reduce((s, r) => s + r.recorded, 0) / n : 0;
    const cc = reps.filter((r) => r.courageCredit).length, elite = reps.filter((r) => r.recorded === 3).length;
    const groups = {}; reps.forEach((r) => { (groups[r.focus] = groups[r.focus] || []).push(r.recorded); });
    const parts = {}; reps.forEach((r) => Object.keys(r.parts || {}).forEach((k) => { (parts[k] = parts[k] || []).push(r.parts[k]); }));
    const bar = (label, arr) => { const a = arr.reduce((s, x) => s + x, 0) / arr.length; const pct = ((a + 1) / 4) * 100; return '<div class="bar"><span>' + esc(label) + '</span><span class="track"><span class="zero"></span><i style="left:' + Math.min(25, pct) + '%;width:' + Math.abs(pct - 25) + '%"></i></span><b>' + fmt(Math.round(a * 10) / 10) + '</b></div>'; };
    const last = reps.slice(-20), W = 300, H = 80, y = (v) => H - ((v + 1) / 4) * (H - 10) - 5;
    const pts = last.map((r, i) => [last.length === 1 ? W / 2 : (i / (last.length - 1)) * (W - 10) + 5, y(r.recorded)]);
    const spark = n ? '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Recent scores"><line x1="0" x2="' + W + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#5d7594" stroke-dasharray="4 4"/><polyline fill="none" stroke="#c9a227" stroke-width="2.5" points="' + pts.map((p) => p.join(",")).join(" ") + '"/>' + pts.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (last[i].courageCredit ? 5 : 3.5) + '" fill="' + (last[i].courageCredit ? "#f0a640" : "#e2c15a") + '"/>').join("") + '</svg><small style="color:var(--mut)">Last ' + last.length + ' reps (dashed line = Average 0; orange dots = Courage Credits)</small>' : "";
    $("#v-trends").innerHTML = '<h2>My trends</h2><p style="color:var(--mut)">You versus yesterday\'s you. Saved only on this device.</p>' +
      '<div class="stats"><div class="stat"><b id="t-count">' + n + '</b><small>reps scored</small></div><div class="stat"><b>' + (n ? fmt(Math.round(avg * 10) / 10) : "—") + '</b><small>average score</small></div><div class="stat"><b id="t-cc">' + cc + '</b><small>Courage Credits</small></div><div class="stat"><b>' + elite + '</b><small>Elite Game Days</small></div><div class="stat"><b>' + modulesDone() + '/' + A.modules.length + '</b><small>lessons done</small></div></div>' +
      (n ? '<div class="card">' + spark + '</div><div class="card bars"><h3>By ' + esc(A.scoreFocusLabel.toLowerCase()) + '</h3>' + Object.keys(groups).map((k) => bar(k, groups[k])).join("") + '</div>' + (Object.keys(parts).length ? '<div class="card bars"><h3>Equation breakdown</h3>' + A.breakdown.flatMap((g) => g.items).filter((k) => parts[k]).map((k) => bar(k, parts[k])).join("") + '</div>' : "") +
        '<div class="card"><h3>History</h3><ul class="hist">' + reps.slice().reverse().map((r) => '<li><span class="sc">' + fmt(r.recorded) + '</span><span class="bd"><b>' + esc(r.title) + '</b> ' + (r.courageCredit ? '<span class="badge cc">★ Courage Credit</span> ' : "") + (r.gameDay ? '<span class="badge gd">Game Day' + (r.eventName ? ': ' + esc(r.eventName) : '') + '</span> ' : "") + (r.recorded === 3 ? '<span class="badge elite">Elite</span>' : "") + '<small>' + esc(r.focus) + ' · ' + new Date(r.at).toLocaleDateString() + (r.note ? ' · ' + esc(r.note.slice(0, 80)) : "") + '</small></span><button class="del" data-del="' + r.id + '" aria-label="Delete">×</button></li>').join("") + '</ul></div>'
        : '<div class="card">No reps yet. Score your first one in the Score tab. A first attempt earns a Courage Credit.</div>') +
      '<div class="row"><button class="btn ghost small" id="t-export">Export my data</button><button class="btn ghost small" id="t-clear">Clear all data</button></div>';
    $$("#v-trends [data-del]").forEach((b) => b.onclick = () => { data.reps = data.reps.filter((r) => r.id !== b.dataset.del); save(); renderTrends(); });
    $("#t-export").onclick = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = A.id + "-my-data.json"; a.click(); };
    $("#t-clear").onclick = () => { if (confirm("Delete all lessons progress, notes, scores and chat history on this device?")) { localStorage.removeItem(KEY); localStorage.removeItem(KEY + "-chat"); localStorage.removeItem(KEY + "-alerts"); data = load(); chat = CC.loadState(); chatOpened = false; $("#msgs").innerHTML = ""; renderLearn(); renderTrends(); } };
  }

  /* ---------- CoachClint chat ---------- */
  let chat = CC.loadState(), chatOpened = false, busy = false;
  function bubble(m) {
    const d = document.createElement("div"); d.className = "msg " + (m.role === "user" ? "user" : "coach") + (m.kind === "crisis" ? " crisis" : m.kind === "gray" ? " gray" : "");
    if (m.role !== "user") d.innerHTML = '<span class="who">CoachClint · AI</span>';
    const body = document.createElement("span"); body.textContent = m.text; d.appendChild(body);
    if (m.kind === "crisis") d.insertAdjacentHTML("beforeend", '<div class="lifelines"><a href="tel:988">Call 988 · Suicide &amp; Crisis Lifeline</a><a href="sms:988">Text 988</a><a class="alt" href="tel:988">Veterans: call 988, then press 1</a><a class="alt" href="sms:838255">Veterans: text 838255</a><a href="tel:911">Immediate danger: call 911</a></div><div class="alertnote">In the live product, a real person at HoldFast is alerted automatically (clint@holdfasthq.com and cb@get-highground.com). This v1 preview sends nothing.</div>');
    (m.actions || []).forEach((a) => { const b = document.createElement("button"); b.className = "btn ghost small"; b.style.marginTop = "8px"; b.textContent = a.label; b.onclick = () => { if (a.action === "openDryDock") show("drydock"); else { show("score"); prefillScore(a.prefill || {}); } }; d.appendChild(document.createElement("br")); d.appendChild(b); });
    $("#msgs").appendChild(d); $("#msgs").scrollTop = $("#msgs").scrollHeight;
  }
  function openChat() {
    if (chatOpened) return; chatOpened = true;
    if (!chat.conv.messages.length) { chat.conv.messages.push({ role: "coach", text: CC.intro(chat, A.name), at: Date.now() }); CC.saveState(chat); }
    $("#msgs").innerHTML = ""; chat.conv.messages.forEach(bubble);
  }
  function setCtx() { $("#ctx").textContent = currentModule ? "Talking about: " + currentModule.title : ""; }
  async function sendChat(text) {
    text = (text || "").trim(); if (!text || busy) return;
    openChat(); busy = true;
    const um = { role: "user", text, at: Date.now() }; chat.conv.messages.push(um); bubble(um);
    const t = document.createElement("div"); t.className = "msg coach typing"; t.textContent = "CoachClint is thinking …"; $("#msgs").appendChild(t);
    try {
      const r = await CC.respond(text, { state: chat, moduleId: currentModule && currentModule.id, moduleRelated: currentModule ? currentModule.related : [], modulesDone: modulesDone(), events: data.events });
      await new Promise((res) => setTimeout(res, 250));
      t.remove();
      const cm = { role: "coach", text: r.text, kind: r.kind, actions: r.actions, at: Date.now() }; chat.conv.messages.push(cm); bubble(cm);
    } finally { busy = false; chat.conv.messages = chat.conv.messages.slice(-80); CC.saveState(chat); }
  }
  window.CoachClintUI = { send: sendChat, show, openModule, data: () => data, chat: () => chat };

  /* ---------- boot ---------- */
  function setHH() { document.documentElement.style.setProperty("--hh", $("header.top").offsetHeight + "px"); }
  function boot() {
    setHH(); addEventListener("resize", setHH);
    document.title = A.name + " · HoldFast";
    $("#app-name").textContent = A.name;
    $("#chips").innerHTML = A.chips.map((c) => '<button type="button">' + esc(c) + '</button>').join("");
    $$("#chips button").forEach((b) => b.onclick = () => sendChat(b.textContent));
    $("#ch-form").onsubmit = (e) => { e.preventDefault(); const v = $("#ch-in").value; $("#ch-in").value = ""; sendChat(v); };
    $("#ch-new").onclick = () => { CC.newConversation(chat); chatOpened = false; openChat(); };
    $(".closech").onclick = () => show("learn");
    $$("nav.tabs button").forEach((b) => b.onclick = () => show(b.dataset.tab));
    renderLearn(); renderScore();
    show("learn");
    if (matchMedia("(min-width:980px)").matches) openChat();
    matchMedia("(min-width:980px)").addEventListener("change", (e) => { if (e.matches) { $("#coach").classList.add("on"); openChat(); } else if (!$('nav.tabs button[data-tab="coach"]').getAttribute("aria-selected").includes("true")) $("#coach").classList.remove("on"); });
  }
  boot();
})();
