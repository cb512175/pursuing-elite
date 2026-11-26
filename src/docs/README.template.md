# {{NAME}} · HoldFast (v1)

{{BLURB}}

**Live:** https://cb512175.github.io/{{SLUG}}/
**Sister app:** [{{SISTER_NAME}}](https://cb512175.github.io/{{SISTER_SLUG}}/), which shares the same CoachClint engine

A content-first HoldFast app with **CoachClint** built in. CoachClint is the AI coaching "DeliveryDouble" built on Clint Bruce's words, frameworks, and scars, and billed as the 79/21 coach (CoachClint is the 79%, real humans are the 21, echoing 21toNone, the mission behind everything HoldFast does).

- **How people use it (journey, 79/21, DryDock, one app per content piece, the HighGrounder tier):** [ENGAGEMENT.md](ENGAGEMENT.md)
- **System prompt for the future live AI:** [docs/coachclint-system-prompt.md](docs/coachclint-system-prompt.md)

## What's in v1

- **Learn:** {{MODULE_COUNT}} short lessons in Clint's words ({{MODULE_LIST}}). Each one has a rep for the week, a reflection with private notes, "Ask CoachClint about this," and "Mark complete."
- **Score:** the official HoldFast scale, Bad −1 · Average 0 · Good +1 · Excellent +2.
  - **Elite +3** unlocks only for a rep tagged to one of the user's own **Game Days** (see DryDock below). Untagged reps cap at +2, in the app and in chat.
  - **Courage Credit:** "First time I've ever tried this" sets a **+0.5 floor** and shows its own **★ Courage Credit** badge, even when the score is higher. It's once per rep, matched by the rep's name; repeats use the normal scale.
  - Each score also gets a push / pause / pivot reading.{{BREAKDOWN_NOTE}}
- **DryDock: My Game Days:** users list up to 10 live or real events they've been building toward, where ascending to Elite is critical. In Score, a rep is tagged to one of them, and only then does +3 unlock. CoachClint prompts people to set this up (once per conversation, and whenever Elite or +3 comes up). Stored in `events` in localStorage, and passed to the engine as `opts.events`.
- **Trends:** reps scored, average, Courage Credits, Elite Game Days, lessons done, a trend line, averages by focus, history with delete, export to JSON, and clear-all.
- **CoachClint:** a chat tab on phones, docked on the right on desktop. It has a light AI disclosure, quick-start chips, lesson context, and "Log it" buttons that pre-fill the Score form.

Everything is saved **only in this browser** (localStorage key `{{KEY}}` and related keys). There are no accounts, no analytics, and no network calls.

## How CoachClint v1 works (no AI backend yet)

`src/shared/engine.js` runs in the browser:

1. **Safety layer (always first, always local).**
   - **True crisis** gets narrow, explicit pattern checks: self-harm or suicide, harm to others, immediate danger or abuse, a medical emergency, or a legal emergency in progress. It triggers the manual's warm handoff (988; veterans 988 then press 1 or text 838255; 911), with tap-to-call buttons, and calls `CoachClint.alertHuman()`.
   - **v1 sends nothing.** It records the event on the device (`{{KEY}}-alerts`, `sent: false`) and tells the user plainly that the preview can't alert anyone. In the live product, the alert goes to **clint@holdfasthq.com** and **cb@get-highground.com**.
   - **Gray zone** names 988 once, asks one gentle check question, and moves to the crisis path if the answer is yes.
2. **Coaching moves (rules from the manual):**
   - The "Is this really Clint?" honesty answer.
   - Requests for a human, which get the other 21 (the real humans).
   - The faith trigger ("what's different about Clint?").
   - The out-of-scope response (medical, legal, or financial).
   - Score talk: Elite caps and the Courage Credit.
   - First-attempt Courage Credit.
   - The "I can't" reframe: once per conversation, skipped for scheduling words and real limits.
   - Lesson summaries.
3. **Retrieval:** matches the message against about 40 curated replies in `src/shared/knowledge.js`. Each is drawn from the manual and Clint's HoldFast content, with its source noted, anonymized, and free of family texts.
4. **Chronicle mention:** at most one other HoldFast piece per conversation. Never in the first reply, never in gray-zone or crisis talk, and phrased as "Side note, no homework …"
5. **Guardrails:** "brother" and similar words are blocked until the usage threshold (10 sessions, 20 messages, 2 lessons) and always blocked in gray-zone or crisis conversations.

## Plugging in a live AI (the adapter seam)

Pick one of these:

**A. Point at an endpoint.** Put this before the other scripts in `index.html`, or edit the existing `COACHCLINT_CONFIG` line:

```html
<script>window.COACHCLINT_CONFIG = { mode: "remote", endpoint: "https://api.holdfast.example/coachclint/chat" };</script>
```

Request (`POST`, JSON):

```json
{
  "app": "{{APP_ID}}",
  "module": "{{FIRST_MODULE}}",
  "messages": [{ "role": "assistant", "content": "…" }, { "role": "user", "content": "…" }],
  "user": { "sessions": 3, "userMessages": 14, "familiar": false, "faithTriggered": false },
  "gameDays": [{ "id": "e1", "name": "Friday board presentation", "kind": "live" }],
  "flags": { "disclosed": true, "chronicleUsed": false, "reframeUsed": false, "gray": false, "drydockNudged": false }
}
```

Response:

```json
{ "reply": "text in CoachClint's voice", "actions": [], "flags": { "chronicleUsed": true } }
```

The server holds the model key and the system prompt from [docs/coachclint-system-prompt.md](docs/coachclint-system-prompt.md), regenerated from the manual every 72-hour refresh. The server should run its own crisis check and send the human alert. **The browser safety layer still runs before any adapter**, and if the endpoint fails, the app falls back to the local coach.

**B. Register a custom adapter** (for example a vendor SDK):

```js
CoachClint.registerAdapter("myai", { name: "my-ai", reply: async (ctx) => ({ text: await callMyAI(ctx.history, ctx.text) }) });
CoachClint.config.mode = "myai";
```

`ctx` contains `text`, `history`, `state`, `flags`, `familiar`, `events` (the user's Game Days), and `moduleId`.

**Crisis alert hook:** set `CoachClint.onCrisisAlert = (rec) => fetch("/alert", …)`, or listen for the `coachclint:crisis-alert` window event. It fires once per conversation and includes both recipients.

## Edit and rebuild

The deployable app is the single file `index.html`. Its sources are in `src/`:

- `src/shared/` holds the template, style, knowledge, engine, and UI. These are identical in both apps.
- `src/apps/{{SLUG}}/content.js` holds this app's lessons.

```bash
python3 src/build.py ..      # rebuilds ../{{SLUG}}/index.html from src/
python3 -m http.server 8765  # then open http://localhost:8765
python3 test.py http://127.0.0.1:8765/   # Playwright tests (390px and 1280px)
```

## About HoldFast apps and HighGrounder

Each piece of HoldFast content is getting its own app. A **HighGrounder** membership is planned for people who want all of them, with a CoachClint that works across everything. The apps mention this once, quietly, in the About section. See [ENGAGEMENT.md](ENGAGEMENT.md).

## Not therapy

CoachClint is an AI coach: not Clint, not a therapist, doctor, lawyer, or financial advisor. In the US, call or text **988** (veterans press 1) or call **911** in an emergency.

*Lessons are compiled from Clint Bruce's HoldFast material and are drafts for Clint's review. © HoldFast.*
