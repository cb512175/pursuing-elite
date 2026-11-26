# How folks engage with CoachClint

*HoldFast · v1 · November 2026 · Draft for Clint's review*

CoachClint is an AI coaching "DeliveryDouble" built on Clint Bruce's words, frameworks, and scars. It lives **inside** content-specific HoldFast apps. Users open an app for the content (PursuingElite or the AchievementEquation), and CoachClint is right there to help them turn a lesson into a rep.

## The three parts of a HoldFast program

| Part | What it is | Where it lives |
|---|---|---|
| Self-paced virtual course | About one third of the program: short lessons in Clint's voice | **Learn** tab of each app |
| Planning and metrics app | Plan a rep, score it, watch the trend line | **Score** and **Trends** tabs |
| CoachClint | The Wingman between sessions | **CoachClint** panel (a tab on phones, docked on the right on desktop) |

## The user journey

1. **Open the app for the content.** The welcome screen leads with the content (the 5 outcomes, or the equation), not the AI. There's a light disclosure: CoachClint is an AI built on Clint's words, the 75% solution, not the live Clint.
2. **Take a 3–4 minute lesson.** Each lesson ends with:
   - **Your rep this week:** one real action (a D3: Decision, Design, Discipline).
   - **Reflect:** one question and a private notes box.
   - **Ask CoachClint about this:** opens the chat with the lesson as context.
3. **Do the rep in real life.** The work happens out there, not in the app.
4. **Score it.** Use the official scale: Bad −1 · Average 0 · Good +1 · Excellent +2.
   - **Elite +3** unlocks only for **game day**: the actual game, the real mission, the other side of the actual adventure.
   - **First time ever?** Check the box. The **Courage Credit** sets a +0.5 floor and shows its own badge, even when the score is higher. It's once per rep; repeats use the normal scale.
5. **Talk it through.** CoachClint follows Clint's method:
   - Greet, then find the **X** and the map.
   - Check the **Breakfast Table**.
   - Apply **one** framework, then land on **one** next action.
   - Score, and set a check-back.
   - It hears "I can't" and offers the swap once: "I couldn't (yet)" or "I haven't tried (yet)." It never does this for real limits like health, grief, money, or legal issues, and never in a crisis or gray-zone conversation.
6. **Watch the trend.** It's you versus yesterday's you. Trends shows reps, average, Courage Credits, Elite game days, a score-by-focus view, and (in the AchievementEquation) an Angles/Allies/Advantages breakdown.
7. **Come back.** Returning users get the short greeting: "Where are we today … BallField, BattleField, BoardRoom, or Breakfast Table?"

## How CoachClint brings up other HoldFast pieces

CoachClint can draw on the whole HoldFast library to support a conversation. When it genuinely fits, it mentions **one** related piece (the HoldFast Chronicles: Captain's Course, the Wardroom/Drydock, SeaTrials, OnReloading, ROPE, Archers & Arrows, the Four Mountains, Maps that Matter, Project Wingman, the Achieving Average, and the other app). The rules:

- At most once per conversation.
- Never in the first reply, and never in a gray-zone or crisis conversation.
- Phrased as "Side note, no homework … It's there if it's ever useful." No prices, no links to buy, no pitch.
- Human help (Clint, a ReadyLAB coach, a Wingman) is offered when the user asks for it or the issue needs the other 25%.

## Safety: crisis vs. crossroads

- **True crisis** (narrow): self-harm or suicide, harm to others, immediate danger or abuse, a medical emergency, or a legal emergency in progress.
  - CoachClint drops all coaching and gives a warm handoff: **call or text 988**; **veterans: 988, then press 1, or text 838255**; **immediate danger: 911**.
  - It asks for a trusted human nearby and asks "Are you safe right now?"
  - In the live product, a human alert goes to **clint@holdfasthq.com AND cb@get-highground.com** automatically. **v1 sends nothing.** It records the event on the device and tells the user plainly that this preview can't send the alert.
- **Gray zone** ("what's the point," weeks of no sleep, drinking more, "everyone would be better off"): CoachClint names 988 once, asks one gentle check question when the words call for it, and keeps coaching. If the answer is yes, it switches to the crisis path.
- **Crossroads** (a job loss, a transition, a big decision): "This feels like a crisis, but it's a crossroads, and crossroads are where we do our best work." CoachClint leans in as a Wingman.

## The 75% solution and the 72-hour refresh loop

CoachClint is billed as **about three-quarters of what Clint would say** if he were sitting beside you. The other 25% is why real humans exist: Clint and the ReadyLAB coaches.

Every **72 hours**, the knowledge gets refreshed:

| Window | Step |
|---|---|
| Continuous | **Capture** new material: voice memos, work texts and emails, talks, podcasts, corrections, and the anonymized questions CoachClint couldn't answer well. Family texts go only to the private, approval-gated Family library. |
| 0–24h | **Ingest** and tag each item (map, framework, Clint-ism, story, correction). |
| 24–48h | **Diff** against the manual: new, changed, conflicting, or retired. |
| 48–60h | Clint **approves** each change. Crisis rules, scoring, the faith trigger, bio, and alert recipients never auto-ship. |
| 60–70h | **Test** with the regression set. Crisis tests must pass 100%. |
| 72h | **Release** with a changelog ("What Clint's been chewing on this cycle"). |

**In v1**, a refresh means editing `src/shared/knowledge.js` (the retrieval bundle), rebuilding, and pushing. GitHub Pages updates in about a minute. With a live AI backend, the refresh updates the system prompt and retrieval index on the server, so the apps don't need to change.

## The path to a live AI backend

| Stage | What changes | Status |
|---|---|---|
| **v1 (now)** | Retrieval coach in the browser. About 40 curated replies in Clint's words, plus rule-based coaching moves (Courage Credit, the "I can't" reframe, the Elite cap, the faith trigger, crisis and gray zone). No server, no accounts, data on the device. | Live |
| **v2** | A small HoldFast API (`POST /coachclint/chat`) holds the system prompt (built from the manual), the model key, and a retrieval index of the approved library. The apps flip one setting: `COACHCLINT_CONFIG = { mode: "remote", endpoint }`. The browser safety layer still runs first, and the server runs its own. | Needs a host, a model vendor, and legal review of the crisis flow |
| **v3** | Accounts and sync, so progress follows the user. A real crisis alert to both HoldFast addresses. Program-lead dashboards (aggregate only). The 72-hour refresh pipeline. The usage-based "familiarity" threshold driven by real session counts. | Planned |

See `README.md` → *Plugging in a live AI* for the exact request and response contract.
