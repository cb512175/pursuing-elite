# {{NAME}} · HoldFast (v1)

{{BLURB}}

**Live:** https://cb512175.github.io/{{SLUG}}/
**Tester stats (unlisted):** https://cb512175.github.io/{{SLUG}}/stats.html
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

Everything you do is saved **only in this browser** (localStorage key `{{KEY}}` and related keys). There are no accounts and no analytics. The only network call is the anonymous tester tally described under *Visit counter* below.

## Tester access code (early tester version)

The app opens on a friendly HoldFast welcome screen that asks for a tester code and notes that this is an early version. A correct code unlocks the app, and the device remembers it, so testers enter it **once** (the unlock is shared by both HoldFast apps, since they live on the same site). Matching is case-insensitive and ignores spaces.

- **The code is never stored in plain text.** The repo contains only a SHA-256 hash of `"holdfast-tester:" + the code in lowercase` (the constant `HF_CODE_HASH` at the top of `src/shared/gate.js`). Clint has the code; it is not in this repo, the docs, or the tests.
- **To change the code** (one constant):
  1. Compute the new hash. Lowercase the new code and keep the prefix:
     ```bash
     printf '%s' 'holdfast-tester:mynewcode' | shasum -a 256
     ```
  2. Paste the 64-character result into `HF_CODE_HASH` in `src/shared/gate.js`.
  3. Rebuild and push: `python3 src/build.py .. && git add -A && git commit -m "new tester code" && git push` (do this in both repos, with the same hash, if you want the shared unlock).
  Anyone who unlocked with the old code is asked again, because devices remember the hash, not the code.
- **To open the app to everyone** (end of testing): set `HF_GATE_ENABLED = false` in the same file and rebuild.
- **Be honest about what this is: a light gate, not security.** The app is a public static site, so the files (and the hash) are visible to anyone, and someone determined can skip the screen or guess a short code offline. It keeps casual visitors out and tells testers they're in an early version. It protects nothing sensitive: the app has no accounts or secrets, and all data stays on each person's device. Don't treat it as access control for anything private. Real protection would need a server (sign-in or a signed link).

## Visit counter (Clint can check it)

To see roughly how many testers are trying the apps, each app sends **anonymous increments only** to [Abacus](https://abacus.jasoncameron.dev), a free counting service that needs no account:

- **Opens:** the app was loaded on a device.
- **Code unlocks:** a correct tester code was entered.
- Each is counted **at most once per device per day** (the device remembers the date locally), separately for each app. Counters are named `holdfast-testers-x7k2q9/<app>-opens` and `…/<app>-unlocks`, so the four live counters are `pursuing-elite-opens`, `pursuing-elite-unlocks`, `achievement-equation-opens` and `achievement-equation-unlocks`.
- **Nothing personal is sent.** No cookies, no IDs, no IP logging by us, no referrer, no code, no scores, no chat text. A counter hit is just "add one to this number." (Like any web request, the counting service can see a visitor's IP address at the network level; we don't send or store anything with it.)
- It never blocks the app: if the counter is unreachable, the app works exactly the same.
- Automated browsers (our test suite) are never counted, and `?hfcount=test` writes to separate `test-…` counters so site checks never touch the real numbers.

**See the numbers:** open `stats.html` in either repo's site: https://cb512175.github.io/{{SLUG}}/stats.html (both apps' totals appear on both pages). It is unlisted and not linked from the apps, but not secret: anyone with the link can read the totals. Add `?test=1` to see the test counters.

**Limits:** Abacus is a free hobby service with a rate limit (30 requests per 10 seconds per IP) and no uptime guarantee, so treat the numbers as approximate. A counter's value expires only after six months with no activity. Because the counter names are public to anyone who reads the page source, someone could inflate them. To change counters or turn them off, edit `HF_COUNTER` in `src/shared/gate.js` (`enabled: false`) and `stats.html`. If you outgrow this, the next step is a small server-side tally.

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
HF_TEST_CODE='<the tester code>' python3 test.py http://127.0.0.1:8765/   # Playwright (390px + 1280px); the code comes from the environment and is never stored
```

## About HoldFast apps and HighGrounder

Each piece of HoldFast content is getting its own app. A **HighGrounder** membership is planned for people who want all of them, with a CoachClint that works across everything. The apps mention this once, quietly, in the About section. See [ENGAGEMENT.md](ENGAGEMENT.md).

## Not therapy

CoachClint is an AI coach: not Clint, not a therapist, doctor, lawyer, or financial advisor. In the US, call or text **988** (veterans press 1) or call **911** in an emergency.

*Lessons are compiled from Clint Bruce's HoldFast material and are drafts for Clint's review. © HoldFast.*
