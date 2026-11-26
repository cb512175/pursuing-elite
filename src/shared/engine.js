/* CoachClint engine v1.0 — runs fully in the browser.
 *
 *   user message ──► Safety layer (always local, always first)
 *                      │  true crisis  → warm 988 / 911 / Veterans Crisis Line handoff
 *                      │                 + CoachClint.alertHuman() (v1: recorded locally, NOT sent)
 *                      │  gray zone    → name support once, gentle check, keep coaching
 *                      ▼
 *                    Adapter.reply(ctx)   ◄── THE SEAM
 *                      • "local"  = retrieval coach over the embedded knowledge bundle (default in v1)
 *                      • "remote" = POST to your AI endpoint (system prompt lives server-side)
 *                      ▼
 *                    Guardrails (familiar-term guard) ──► UI
 *
 * To plug in a live AI later, set before this script loads:
 *   window.COACHCLINT_CONFIG = { mode: "remote", endpoint: "https://your-api/coachclint/chat" }
 * or register your own adapter:  CoachClint.registerAdapter("myai", { name, reply: async ctx => ({ text }) })
 * See README.md → "Plugging in a live AI".
 */
(function () {
  "use strict";
  const CC = {};
  CC.version = "1.0.0";
  CC.config = Object.assign({ mode: "local", endpoint: null, appId: "pe", appName: "CoachClint", storageKey: "holdfast-coachclint-v1", timeoutMs: 20000 }, window.COACHCLINT_CONFIG || {});

  /* The two human-alert recipients from the manual (v1.2). v1 never sends anything. */
  CC.ALERT_RECIPIENTS = ["clint@holdfasthq.com", "cb@get-highground.com"];

  /* ---------------- helpers ---------------- */
  const norm = (s) => (s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  const tokens = (s) => new Set(norm(s).replace(/[^a-z0-9' ]/g, " ").split(" ").filter(Boolean));
  const pick = (arr, n) => arr[Math.abs(n) % arr.length];

  /* ---------------- 1. Safety layer (manual Section 6) ---------------- */
  // Narrow, explicit signals only. When in doubt between crisis and gray zone, the gray zone asks the gentle check question.
  const CRISIS_RULES = [
    { type: "self-harm", re: /\b(kill(ing)? ?my ?self|end(ing)? my (own )?life|end it all|take my (own )?life|suicid\w*|want(ed)? to die|wanna die|don'?t want to (live|be alive|wake up)|better off dead|won'?t be (here|around) (much longer|tomorrow|anymore|next week)|hurt(ing)? myself|cut(ting)? myself|harm(ing)? myself|how i'?d do it|how i would do it|no reason to live|not worth living|saying (my )?goodbyes?)\b/i },
    { type: "self-harm", re: /life insurance[^.]{0,80}(better off|family)|(better off|family)[^.]{0,80}life insurance/i },
    { type: "harm-others", re: /\b(going to|gonna|want to|wanna|plan(ning)? to|i'?ll|i will|about to) (kill|hurt|shoot|stab|beat up|attack) (him|her|them|someone|somebody|people|my \w+)\b(?! feelings)/i },
    { type: "harm-others", re: /\b(kill|shoot|stab) (him|her|them|someone|somebody|people)\b/i },
    { type: "danger-abuse", re: /\b((he|she|they|my (husband|wife|boyfriend|girlfriend|partner|dad|father|mom|mother|stepdad|stepmom|boss)) (hits|hit|beats|beat|chokes|choked|is hurting|threatened to kill|is threatening to kill|keeps hurting) me|(being|getting) (abused|beaten)|not safe (at home|right now|here)|i'?m not safe|i am not safe|afraid for my life|(i'?m|i am|we'?re|we are) in (immediate )?danger|(child|kid|my son|my daughter) is (in danger|being hurt|being abused))\b/i },
    { type: "medical", re: /\b(chest pains?|having a heart attack|heart attack right now|can'?t breathe|cannot breathe|having a stroke|stroke symptoms|face is drooping|took (too many|a bunch of|all my|all the) pills|overdos(ed|ing|e)|bleeding (badly|a lot|heavily)|won'?t stop bleeding|unconscious|not breathing|having a seizure)\b/i },
    { type: "legal", re: /\b(being arrested|getting arrested|just (got )?arrested|i'?ve been arrested|i got arrested|(police|cops) are (here|at my door|outside)|being detained|i'?m detained|i am detained|in custody right now)\b/i }
  ];
  const GRAY_RE = /\b(what'?s (even )?the point|whats the point|no point (anymore|in anything|in trying|to any of this)|hopeless|can'?t go on|cant go on|haven'?t slept|have not slept|can'?t sleep|cant sleep|not sleeping|drinking (more|too much|a lot)|everyone (would be|is|'?d be) better off|better off without me|nobody would (miss|care)|no one would (miss|care)|so alone|all alone|completely alone|isolated|can'?t keep doing this|give up on everything|feel numb|so numb)\b/i;
  const GRAY_CHECK_RE = /(point|better off|miss|care|go on|give up|numb|hopeless|keep doing this)/i;

  CC.classifySafety = function (text) {
    const t = norm(text);
    for (const r of CRISIS_RULES) if (r.re.test(t)) return { level: "crisis", type: r.type };
    if (GRAY_RE.test(t)) return { level: "gray", check: GRAY_CHECK_RE.test(t) };
    return { level: "none" };
  };

  /* Human alert hook. In the live product this calls the HoldFast backend, which emails BOTH recipients.
     v1 records the event on this device only and sends NOTHING. */
  CC.alertHuman = function (info) {
    const rec = { at: new Date().toISOString(), type: info.type, app: CC.config.appId, recipients: CC.ALERT_RECIPIENTS.slice(), sent: false, note: "v1 preview: not sent. The live product notifies both recipients automatically." };
    try {
      const k = CC.config.storageKey + "-alerts";
      const list = JSON.parse(localStorage.getItem(k) || "[]"); list.push(rec); localStorage.setItem(k, JSON.stringify(list.slice(-20)));
    } catch (e) { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent("coachclint:crisis-alert", { detail: rec }));
    if (typeof CC.onCrisisAlert === "function") { try { CC.onCrisisAlert(rec); } catch (e) {} }
    return rec;
  };

  CC.crisisText = function () {
    return [
      "I'm really glad you told me. That took courage, and I'm not going anywhere.",
      "Right now I want you to have a real human with you. Please call or text 988. If you've served, call 988 and press 1 (or text 838255). If you're in danger right now, call 911.",
      "Who's one person you trust … your spouse, a buddy, a teammate … who can be with you or on the phone in the next few minutes?",
      "Are you safe right now?",
      "In the full CoachClint, someone on the HoldFast team would also be notified right now so a real person could check on you. This preview can't send that alert, so please reach out to 988 or someone you trust directly.",
      "I'm right here. Tell me when you've reached someone."
    ].join("\n");
  };
  const CRISIS_FOLLOW = [
    "I'm still right here with you.\nPlease call or text 988 now. Veterans and service members: 988, then press 1, or text 838255. If you're in danger, call 911.\nWho's one person you trust who can be with you or on the phone in the next few minutes?\nAre you safe right now?",
    "I hear you. You don't have to figure anything else out right now.\nThe one thing that matters is getting a real human with you: call or text 988 (veterans press 1), or 911 if you're in danger.\nCan you put some distance between you and anything you could use to hurt yourself while we talk?"
  ];
  const SAFE_NOW_RE = /\b(i'?m safe|im safe|i am safe|called|texted|reached|talking to (them|someone|988|my)|on the phone with|(they'?re|she'?s|he'?s|someone is|somebody is) (here|with me)|with me now|i'?m okay now|im ok now|i'?m with)\b/i;
  const GRAY_LINE = "I want to say this once, because I'd rather say it and not need it … if it ever gets heavier than this, call or text 988 (veterans, press 1). No shame in it. That's an Ally, not a weakness.";

  /* ---------------- 2. Scoring rules (manual 4.1, 4.18) ---------------- */
  CC.scoring = {
    SCALE: [{ v: -1, label: "Bad" }, { v: 0, label: "Average" }, { v: 1, label: "Good" }, { v: 2, label: "Excellent" }, { v: 3, label: "Elite" }],
    label(v) { if (v === 0.5) return "Courage Credit"; const s = this.SCALE.find((x) => x.v === v); return s ? s.label : String(v); },
    fmt(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v); },
    /* raw: -1..3 · gameDay: rep is tagged to one of the user's own live/real events from DryDock (My Game Days) · firstAttempt · alreadyCredited: this rep already earned its Courage Credit */
    apply({ raw, gameDay, firstAttempt, alreadyCredited }) {
      const notes = []; let v = Number(raw); let capped = false;
      if (v >= 3 && !gameDay) { v = 2; capped = true; notes.push("Love the fire. But Elite is reserved for your Game Days … the live and real events you name in DryDock. Tag this rep to one of them to unlock the +3. As it stands, it's an Excellent +2."); }
      let credit = !!firstAttempt;
      if (credit && alreadyCredited) { credit = false; notes.push("This rep already earned its Courage Credit, so the normal scale applies from here."); }
      const recorded = credit ? Math.max(0.5, v) : v;
      if (credit) notes.unshift(recorded === 0.5 ? "That's a Courage Credit. Not Good yet … but more than Average, because you tried." : "That's a Courage Credit, AND you scored above the floor. The courage counts on its own.");
      return { raw: Number(raw), recorded, courageCredit: credit, capped, notes };
    },
    path(v) { return v >= 1 ? "Push" : v >= 0 ? "Pause & adjust" : "Pivot"; }
  };

  /* ---------------- 3. State ---------------- */
  const NEW_SESSION_MS = 4 * 60 * 60 * 1000;
  function blankConv() { return { id: Date.now().toString(36), startedAt: Date.now(), messages: [], flags: { disclosed: false, chronicleUsed: false, reframeUsed: false, grayNoted: false, gray: false, crisis: false, crisisAlerted: false, awaitingCheck: false, awaitingReframe: false, faithMatched: false, escalated: false, fallbacks: 0, lastEntry: null, userCount: 0 } }; }
  CC.loadState = function () {
    let s = null; try { s = JSON.parse(localStorage.getItem(CC.config.storageKey + "-chat") || "null"); } catch (e) {}
    if (!s) s = { sessions: 0, userMsgs: 0, lastAt: 0, faithTriggered: false, conv: blankConv() };
    if (s.lastAt && Date.now() - s.lastAt > NEW_SESSION_MS) s.conv = blankConv();
    return s;
  };
  CC.saveState = function (s) { try { localStorage.setItem(CC.config.storageKey + "-chat", JSON.stringify(s)); } catch (e) {} };
  CC.newConversation = function (s) { s.conv = blankConv(); CC.saveState(s); return s; };

  /* "Brother" and similar terms are earned through usage (manual Section 3). Tunable. */
  CC.FAMILIARITY = { sessions: 10, userMsgs: 20, modules: 2 };
  CC.isFamiliar = function (s, modulesDone) { return s.sessions >= CC.FAMILIARITY.sessions && s.userMsgs >= CC.FAMILIARITY.userMsgs && (modulesDone || 0) >= CC.FAMILIARITY.modules; };
  function guardFamiliar(text, ok) { return ok ? text : text.replace(/\b(brother|bro|stud|my man|my dude)\b/gi, "my friend"); }

  CC.intro = function (s, appName) {
    const returning = s.sessions > 0;
    s.conv.flags.disclosed = true;
    if (returning) return "Good to see you back. CoachClint here (still the AI, still the 79/21 coach). When I tell a story in first person, it's one Clint has told, passed along through me.\nWhere are we today … BallField, BattleField, BoardRoom, or Breakfast Table?";
    return "Hey … glad you're here. Quick BLUF so we start honest: I'm CoachClint, an AI coach built on Clint Bruce's words, frameworks, and hard-earned scars. I'm not the live Clint. When I tell a story in first person, it's one Clint has told, passed along through me.\nThink of me as the 79% in a 79/21 split … about 79% of what he'd say if he were sitting next to you. Every 72 hours or so I get refreshed with whatever new stuff Clint's been chewing on. The other 21%? That's real humans … Clint and the ReadyLAB coaches. That 21 is no accident: it's 21toNone, the mission behind everything HoldFast does.\nI'm here alongside " + appName + ". So … let's start where Clint always starts. What's the X on your map right now? And roughly where are you standing?";
  };

  /* ---------------- 4. Local retrieval adapter ---------------- */
  const DISCLOSE = "Quick note so we're straight with each other … when I tell a story in first person, it's one Clint has told. I'm CoachClint, the AI, passing it along.\n";
  const R = {
    honesty: /\b(is this|are you|am i talking to) (really |actually )?(clint|a (real )?(person|human)|human|a bot|an? ai|real)\b|\breal clint\b|\bare you real\b/i,
    human: /\b(talk|speak|meet|chat) (to|with) (the real |a real |an actual )?(clint|human|person|coach)\b|\breal (person|human|coach)\b|\bhuman coach\b|\bbook (a )?session\b/i,
    faithTrigger: /\bwhat'?s (so )?different about (you|clint|him)\b|\bwhat makes (you|clint|him) different\b|\bwhere does (your|his|clint'?s) (peace|strength|hope|steadiness|calm|confidence|joy) come from\b|\bhow do(es)? (you|clint|he) (stay (so )?(grounded|steady|calm)|keep going)\b/i,
    faithUser: /\b(pray|prayer|praying|god|jesus|church|scripture|bible|my faith)\b/i,
    scope: /\b(should i (invest|buy|sell|sign|sue)|stocks?|crypto|my taxes|tax (advice|question)|lawsuit|sue (him|her|them|my)|need a lawyer|legal advice|medication|dosage|prescri\w+|diagnos\w+)\b/i,
    first: /\b(first time|first attempt|first try|first ever|never (done|tried) (this|that|it) before|my first (ever )?(\w+ )?(talk|call|pitch|presentation|meeting|conversation|race|game|time|attempt|try))\b/i,
    cant: /\bi (can'?t|cannot|can not) ([^.!?,;]{2,60})/i,
    cantSkip: /^(make it|come|attend|be there|join|wait|thank|believe|stop|help it|sleep|breathe|go on|decide|tell|remember|find|say|hear|see)\b|today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|next week|meeting|\bcall\b/i,
    realLimit: /afford|sick|\bill\b|injur|disab|pain|cancer|diagnos|doctor|grief|griev|died|death|funeral|legal|court|visa|pregnan|anxiety|panic|depress|medical|health|wheelchair|chemo|surgery|money|allowed/i,
    notTried: /\b(haven'?t tried|have not tried|never tried|not tried|haven'?t yet|never done it|haven'?t done it|i haven'?t)\b/i,
    tried: /\b(i tried|tried and|did try|have tried|couldn'?t|i couldn'?t|tried it|tried before|gave it a shot)\b/i,
    moduleQ: /\b(this (lesson|module|one|page)|explain this|what does this mean|help me (with|understand) this|summar(y|ize)|tl;?dr|key point)\b/i,
    greet: /^(hi|hey|hello|yo|howdy|good (morning|afternoon|evening)|sup|what'?s up)\b[\s!.,]*\w{0,12}[\s!.]*$/i,
    thanks: /^(thanks|thank you|thx|appreciate (it|you)|that helps|that helped)/i,
    yes: /^(yes|yeah|yep|yup|sometimes|maybe|i have|kind of|kinda|a little|i guess|sort of)\b/i,
    no: /^(no|nope|nah|not really|never|no i'?m not|not at all)\b/i,
    score: /\b(scor\w*|rate[ds]?|rating|grade[ds]?|call it|give (it|myself|me))\b/i,
    num: /(^|[^\d])([+\-−]?\s?[0-3](\.5)?)(?!\d)/,
    practice: /\b(practice|practiced|drill|rehears\w*|role.?play|simulat\w*|module|lesson|course|homework|scrimmage|mock|dry run|workbook)\b/i,
    gameDay: /\b(game|the game|mission|real thing|for real|live|actual|launch|race|match|championship|deployment|adventure)\b/i
  };
  const MAP_FOLLOW = {
    boardroom: "BoardRoom Map. An important map for sure … but not THE most important map.\nWhat's the X there, in one line? And quick Breakfast Table check: how's home handling this season?",
    ballfield: "BallField … performing at a high level, mentally and physically. It's also the map of taking care of yourself: morally, mentally, spiritually, and physically.\nWhat's the X, and how far off does it feel right now?",
    battlefield: "BattleField … protecting yourself and those entrusted to you. In Wingman terms, it's the most urgent and challenging stuff on any map.\nWhat's the most urgent thing on it right now?",
    "breakfast table": null
  };
  const FALLBACKS = [
    "Tell me a little more. Which map is this on … BallField, BattleField, BoardRoom, or Breakfast Table? And what's the X?",
    "Clint hasn't given me his take on that exact one yet … but let's use what he does have. What does a win look like here, and roughly where are you standing right now?",
    "Here's a question Clint asks a lot: is this a crisis or a crossroads? Most of the time it's a crossroads … and crossroads are where we do our best work.\nWhat's the decision in front of you?",
    "Honest answer: this might be one for the other 21% … a live session with Clint or a ReadyLAB coach. Bring this exact X with you.\nMeanwhile, what's one small next action you could take in the next 72 hours?"
  ];

  function retrieve(text, ctx) {
    const t = norm(text), toks = tokens(text), app = CC.config.appId;
    const related = (ctx.moduleRelated || []);
    let best = null, second = null;
    for (const e of (window.CC_KNOWLEDGE || [])) {
      if (e.app !== "both" && e.app !== app) continue;
      let s = 0;
      for (const k of e.keys) if (t.includes(k)) s += 3 + k.split(" ").length;
      for (const w of e.words) { if (toks.has(w) || toks.has(w + "s")) s += 1; else if (w.length >= 5) { for (const tk of toks) if (tk.startsWith(w)) { s += 0.75; break; } } }
      if (s > 0 && related.includes(e.id)) s += 0.5;
      const item = { e, s };
      if (!best || s > best.s) { second = best; best = item; } else if (!second || s > second.s) second = item;
    }
    if (best && best.e.id === ctx.flags.lastEntry && second && second.s >= 2) best = second;
    return best && best.s >= 2 ? best.e : null;
  }

  const DRYDOCK_NUDGE = "One more thing, because Elite +3 is special: have you set up your Game Days yet? In DryDock you name the live and real events you've been building toward … the moments where ascending to Elite is critical. Only a rep tagged to one of those can score +3.";
  const ELITE_ENTRIES = ["not-done-yet", "five-outcomes", "scoring", "game-day", "drydock"];
  function drydockNudge(ctx, extra) {
    const f = ctx.flags;
    if (f.drydockNudged || (ctx.events || []).length || f.gray || f.crisis) return "";
    f.drydockNudged = true;
    return { text: "\n\n" + DRYDOCK_NUDGE, actions: extra === false ? [] : [{ label: "Set up my Game Days (DryDock)", action: "openDryDock" }] };
  }

  function chronicleNote(entry, f) {
    if (!entry || !entry.chronicle || f.chronicleUsed || f.gray || f.crisis || f.userCount < 2) return "";
    const c = (window.CC_CHRONICLES || {})[entry.chronicle];
    if (!c || c.app === CC.config.appId) return "";
    f.chronicleUsed = true;
    return "\n\nSide note, no homework … " + c.line.charAt(0).toUpperCase() + c.line.slice(1) + " It's there if it's ever useful.";
  }

  function scoreTalk(text, f, ctx) {
    const t = norm(text);
    if (!R.score.test(t)) return null;
    const m = t.match(R.num); if (!m) return null;
    const n = parseFloat(m[2].replace("−", "-").replace(/\s/g, ""));
    if (isNaN(n)) return null;
    const first = R.first.test(t), practice = R.practice.test(t);
    const evs = (ctx && ctx.events) || [];
    const ev = practice ? null : evs.find((e) => e.name && t.includes(norm(e.name)));
    const game = !!ev;
    const acts = [{ label: "Log it in Score", action: "openScore", prefill: { firstAttempt: first, eventId: ev ? ev.id : null, raw: Math.min(3, Math.max(-1, Math.round(n))) } }];
    if (first) return { text: "Hold on … before we score anything: you said this was your first time. Then that's a Courage Credit. Your floor is +0.5.\nIt's not Good yet, but it's more than Average, because it took courage to try.\nNow 3 up, 3 down: what are 3 things you did right? (Showing up is #1.) And 3 you'd change?\nFrom rep #2 on, it's the normal scale.", actions: acts };
    if (n >= 3 && !game) {
      const names = evs.slice(0, 4).map((e) => e.name).join(", ");
      const tail = evs.length ? "Tag it to one of your Game Days (" + names + ") in the Score tab and the +3 is on the table. If it wasn't one of those, it's a +2 … and that's still a great rep." : "Have you named your Game Days yet? In DryDock you list the live and real events you've been building toward, where ascending to Elite is critical. Only a rep tagged to one of those can score +3.";
      return { text: "Love the fire. But Elite is reserved for your Game Days … the live and real events you define in DryDock … not practice or everyday reps.\nSo as it stands, this one's an Excellent +2.\n" + tail, actions: [{ label: "Log it as +2", action: "openScore", prefill: { raw: 2 } }, { label: evs.length ? "Review my Game Days" : "Set up my Game Days (DryDock)", action: "openDryDock" }] };
    }
    if (n >= 3) return { text: "That's one of YOUR Game Days … " + ev.name + " … so Elite +3 is on the table. That's rare air.\nFirst: well done. Don't skip past it.\nThen ReLoad: Review (3 up, 3 down), Rest, Recover, Revel.\nWhat made it Elite and not just Excellent?", actions: acts };
    if (n < -1 || n > 3) return { text: "The scale runs Bad −1 · Average 0 · Good +1 · Excellent +2, with Elite +3 reserved for reps tagged to your own Game Days (set up in DryDock).\nWhere does this rep land on that?", actions: [] };
    const p = CC.scoring.path(n);
    return { text: "Scored " + CC.scoring.fmt(n) + " (" + CC.scoring.label(n) + "). Remember … the scoring systems aren't judgements, they're data.\nOne way to read it: " + p + ".\n" + (n >= 1 ? "What's the one thing that made it work, so you can do it again on purpose?" : n === 0 ? "Average is holding ground. What's one Angle you could tweak for the next rep?" : "A −1 is just data. Was it a Tactic, a Technique, a Teammate, a Tool, or Technology that let you down?"), actions: acts };
  }

  CC.localReply = function (text, ctx) {
    const f = ctx.flags, t = norm(text);

    if (f.awaitingCheck) {
      f.awaitingCheck = false;
      if (R.yes.test(t)) return null; // handled by caller as crisis
      if (R.no.test(t)) return { text: "Thank you for telling me straight. I'm glad.\nThe offer stands … 988 is always there, any hour.\nNow … let's look at where you actually are on the map. What's weighing heaviest: BoardRoom, Breakfast Table, or something else?" };
    }
    if (R.honesty.test(t)) return { text: "No … I'm CoachClint, an AI built on Clint's words and frameworks. Think of me as the 79% in a 79/21 split. The 21 is real humans. If you want the real Clint or one of the ReadyLAB coaches, I can point you there.\nWhat's on your map today?" };
    if (R.human.test(t)) { f.escalated = true; return { text: "Love that. This is a great one for the 21 … the real humans.\nThe human options are a live session with Clint, a ReadyLAB coach, or a Wingman (short Time on Target calls when the moment comes). Ask your HoldFast program lead and they'll set it up.\nBring this exact X with you. Want to sharpen it together first?" }; }
    if (R.faithTrigger.test(t)) { ctx.state.faithTriggered = true; return { text: "I appreciate you asking. That means a lot.\nHonest answer, in Clint's words: there's no \"what\" that is different about me. There is a \"who\" and it's Jesus, and the Holy Spirit, and our Father in Heaven.\nNo pressure on you at all … you asked, so I wanted to give you the real answer.\nNow … where do you want to take today?" }; }
    if (R.scope.test(t)) return { text: "That's one for a pro … a doctor, an attorney, or a financial advisor.\nWhat I can do is help you think through how you'll approach that conversation. What's the decision you're actually trying to make, and who's the right expert to bring it to?" };

    const sc = scoreTalk(text, f, ctx); if (sc) return sc;

    if (R.first.test(t)) return { text: "First time? Then that's a Courage Credit. Your floor is +0.5.\nIt's not Good yet, but it's more than Average, because a lot of people never try at all.\nClint teaches that curiosity is the first evidence of courage. You walked into it anyway, and that counts.\nNow let's make the next one better. 3 up, 3 down: what are 3 things you did right? (Showing up is #1.) And 3 you'd change?\nFrom rep #2 it's the normal scale.", actions: [{ label: "Log it with a Courage Credit", action: "openScore", prefill: { firstAttempt: true } }] };

    if (f.awaitingReframe) {
      if (R.notTried.test(t)) { f.awaitingReframe = false; return { text: "Then it's \"I haven't tried (yet).\" That's not a verdict, that's a starting line.\nMy girls know a line from We Bought a Zoo by heart: \"Sometimes all you need is 20 seconds of insane courage.\" You don't need 20 minutes of great. You need 20 seconds of brave.\nLet's shrink it: what's the smallest first rep you could do this week? Whatever happens, a first try earns a Courage Credit … +0.5 at minimum.", actions: [{ label: "Plan the first rep", action: "openScore", prefill: { firstAttempt: true } }] }; }
      if (R.tried.test(t)) { f.awaitingReframe = false; return { text: "Then it's \"I couldn't (yet).\" And I smile when I hear that, because there's virtue in the valor of effort.\nLet's debrief it, 3 up and 3 down. What are 3 things you did right? (Showing up counts as #1.) And 3 you'd change?\nThen we set rep #2." }; }
      f.awaitingReframe = false;
    }

    const cm = text.match(R.cant);
    if (cm && !f.reframeUsed && !f.gray && !f.crisis && !R.cantSkip.test(norm(cm[2])) && !R.realLimit.test(t)) {
      f.reframeUsed = true; f.awaitingReframe = true;
      const thing = cm[2].trim().replace(/\s+(anymore|any more|at all)$/i, "");
      return { text: "Can I offer a swap before you write that one off? I'm a big believer in banishing \"I can't\" from your lexicon.\nSo … \"I can't " + thing + ".\" Is it \"I couldn't (yet)\" … you tried and it went sideways … or \"I haven't tried (yet)\"?\nBecause one means you didn't try and the other means you did. And that's the point of most everything … the trying.\nWhich one is it?" };
    }

    if (ctx.moduleId && R.moduleQ.test(t) && window.CC_MODULE_NOTES[ctx.moduleId]) {
      const mn = window.CC_MODULE_NOTES[ctx.moduleId];
      return { text: mn.text + "\n" + mn.ask };
    }
    if (R.greet.test(t)) return { text: pick(["Hey. Good to have you.\nWhere are we today … BallField, BattleField, BoardRoom, or Breakfast Table?", "Hey there. What's the X on your map today? And roughly where are you standing?"], f.userCount) };
    if (R.thanks.test(t)) return { text: "Proud of you. No need to respond.\nI'll be here when you want to go again. Hold Fast." };

    let prefix = "";
    if (R.faithUser.test(t) && !f.faithMatched) { f.faithMatched = true; prefix = "Love that you brought that up. Galatians 6:9 is one Clint comes back to a lot.\n"; }

    const entry = retrieve(text, ctx);
    if (entry) {
      f.lastEntry = entry.id; f.fallbacks = 0;
      let body = entry.text;
      if (entry.story && !f.disclosed) { body = DISCLOSE + body; f.disclosed = true; }
      let extra = "", acts = [];
      if (ELITE_ENTRIES.includes(entry.id)) { const nd = drydockNudge(ctx); if (nd) { extra = nd.text; acts = nd.actions; } }
      return { text: prefix + body + extra + chronicleNote(entry, f), entryId: entry.id, actions: acts };
    }
    const words = t.split(" ").length;
    for (const k of Object.keys(MAP_FOLLOW)) if (t.includes(k) && words <= 10) {
      if (!MAP_FOLLOW[k]) break;
      return { text: prefix + MAP_FOLLOW[k] };
    }
    const fb = FALLBACKS[Math.min(f.fallbacks, FALLBACKS.length - 1)]; f.fallbacks++;
    return { text: prefix + fb };
  };

  CC.adapters = {
    local: { name: "local-retrieval", async reply(ctx) { return CC.localReply(ctx.text, ctx); } },
    /* Remote AI adapter. Expects your server to hold the system prompt (docs/coachclint-system-prompt.md)
       and the model key. Request/response contract is documented in README.md. */
    remote: {
      name: "remote-ai",
      async reply(ctx) {
        if (!CC.config.endpoint) throw new Error("No endpoint configured");
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), CC.config.timeoutMs);
        try {
          const res = await fetch(CC.config.endpoint, {
            method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({
              app: CC.config.appId, module: ctx.moduleId || null,
              messages: ctx.history.map((m) => ({ role: m.role === "coach" ? "assistant" : "user", content: m.text })),
              user: { sessions: ctx.state.sessions, userMessages: ctx.state.userMsgs, familiar: ctx.familiar, faithTriggered: !!ctx.state.faithTriggered },
              flags: { disclosed: ctx.flags.disclosed, chronicleUsed: ctx.flags.chronicleUsed, reframeUsed: ctx.flags.reframeUsed, gray: ctx.flags.gray }
            })
          });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const j = await res.json();
          if (j.flags) Object.assign(ctx.flags, j.flags);
          return { text: j.reply, actions: j.actions || [] };
        } finally { clearTimeout(to); }
      }
    }
  };
  CC.registerAdapter = function (key, impl) { CC.adapters[key] = impl; };

  /* ---------------- 5. Main entry point ---------------- */
  CC.respond = async function (text, opts) {
    opts = opts || {};
    const s = opts.state, f = s.conv.flags;
    f.userCount++; s.userMsgs++; s.lastAt = Date.now();
    if (f.userCount === 3) s.sessions++; // a "session" = a conversation with 3+ user messages
    const familiar = CC.isFamiliar(s, opts.modulesDone);
    const out = (r, kind) => ({ text: guardFamiliar(r.text, familiar && kind === "normal" && !f.gray), kind, actions: r.actions || [], entryId: r.entryId || null });

    // Safety first — always local, regardless of adapter.
    const safety = CC.classifySafety(text);
    const yesToCheck = f.awaitingCheck && R.yes.test(norm(text));
    if (safety.level === "crisis" || yesToCheck) {
      f.awaitingCheck = false; const firstHit = !f.crisis; f.crisis = true; f.gray = true;
      if (!f.crisisAlerted) { f.crisisAlerted = true; CC.alertHuman({ type: safety.type || "self-harm (answered yes to safety check)" }); }
      return out({ text: firstHit ? CC.crisisText() : CRISIS_FOLLOW[f.userCount % 2] }, "crisis");
    }
    if (f.crisis) {
      if (SAFE_NOW_RE.test(norm(text))) { f.crisis = false; return out({ text: "I'm really proud of you for reaching out. That took courage.\nStay with them. When you're ready, I'd be proud to keep walking this with you. I'm right here." }, "gray"); }
      return out({ text: CRISIS_FOLLOW[f.userCount % 2] }, "crisis");
    }
    if (safety.level === "gray") {
      f.gray = true;
      let lead = "";
      if (!f.grayNoted) { f.grayNoted = true; lead = GRAY_LINE + "\n"; }
      if (safety.check) { f.awaitingCheck = true; return out({ text: lead + "Can I ask you something straight, because I care about the answer: when you say that, are you having any thoughts of hurting yourself?" }, "gray"); }
      const r = CC.localReply(text, Object.assign({}, opts, { flags: f, state: s, events: opts.events || [] }));
      return out({ text: lead + "Now … let's look at where you actually are on the map.\n" + (r ? r.text : FALLBACKS[0]), actions: r && r.actions }, "gray");
    }

    const ctx = { text, state: s, flags: f, familiar, events: opts.events || [], moduleId: opts.moduleId, moduleRelated: opts.moduleRelated, history: s.conv.messages.slice(-20) };
    const adapter = CC.adapters[CC.config.mode] || CC.adapters.local;
    let r;
    try { r = await adapter.reply(ctx); }
    catch (e) { console.warn("CoachClint adapter failed, falling back to local:", e.message); r = CC.localReply(text, ctx); }
    if (!r) r = { text: FALLBACKS[0] };
    if (f.userCount === 2 && !r.actions) r.actions = [];
    if (f.userCount === 2 && !(r.actions || []).length) { const nd = drydockNudge(ctx); if (nd) { r.text += nd.text; r.actions = nd.actions; } }
    return out(r, "normal");
  };

  window.CoachClint = CC;
})();
