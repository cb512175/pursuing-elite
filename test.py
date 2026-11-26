#!/usr/bin/env python3
"""Playwright tests for the HoldFast CoachClint apps (PursuingElite / AchievementEquation).
Usage: python3 test.py http://127.0.0.1:8765/   (run from the app folder being served)"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("shots")
SHOTS.mkdir(parents=True, exist_ok=True)
CHROME = "/usr/bin/google-chrome"
fails, errs = [], []

def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

def last_coach(page):
    return page.locator("#msgs .msg.coach:not(.typing)").last.inner_text()

def say(page, text):
    n = page.locator("#msgs .msg.coach:not(.typing)").count()
    page.fill("#ch-in", text); page.click("#ch-form button[type=submit]")
    page.wait_for_function("n => document.querySelectorAll('#msgs .msg.coach:not(.typing)').length > n", arg=n, timeout=5000)
    return last_coach(page)

def overflow(page):
    return page.evaluate("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > document.documentElement.clientWidth + 1")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
    # ---------- mobile ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and errs.append(m.text))
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("request", lambda r: (not r.url.startswith(URL) and not r.url.startswith("data:")) and errs.append("external request: " + r.url))
    page.goto(URL); page.wait_for_selector(".mod")
    app = page.evaluate("APP.id"); name = page.evaluate("APP.name"); nmods = page.evaluate("APP.modules.length")
    print("App:", name, "modules:", nmods)
    check(page.title().startswith(name), "title has app name")
    check("AI coach" in page.inner_text(".hero"), "AI disclosure on welcome")
    check(page.locator(".mod").count() == nmods, "all lessons listed")
    check(not overflow(page), "no horizontal overflow (390 learn)")
    page.screenshot(path=str(SHOTS / f"{app}-390-learn.png"), full_page=True)
    # module
    page.locator(".mod").first.click(); page.wait_for_selector(".lesson")
    check(page.locator(".lesson blockquote").count() == 1, "lesson has quote")
    check(not overflow(page), "no horizontal overflow (390 lesson)")
    page.fill("#m-note", "my private note"); page.click("#m-done")
    check("Completed" in page.inner_text("#m-done"), "mark complete")
    page.screenshot(path=str(SHOTS / f"{app}-390-lesson.png"), full_page=True)
    page.click("#m-back"); page.wait_for_selector(".mod.done")
    check(page.locator(".mod.done").count() == 1, "completion persists in list")
    page.reload(); page.wait_for_selector(".mod")
    check(page.locator(".mod.done").count() == 1, "completion persists after reload")
    # ---------- scoring ----------
    page.click('nav.tabs button[data-tab="score"]')
    check(page.locator('#s-scale button[data-v="3"]').is_disabled(), "Elite +3 disabled for practice")
    page.fill("#s-title", "First cold call"); page.check("#s-first"); page.click('#s-scale button[data-v="-1"]')
    check("+0.5" in page.inner_text("#s-preview") and "Courage Credit" in page.inner_text("#s-preview"), "Courage Credit preview: -1 first attempt -> +0.5")
    page.click("#s-save"); page.wait_for_selector("#s-saved")
    check("+0.5" in page.inner_text("#s-saved") and "Courage Credit" in page.inner_text("#s-saved"), "saved +0.5 with badge")
    page.screenshot(path=str(SHOTS / f"{app}-390-score.png"), full_page=True)
    # repeat same rep -> floor doesn't repeat
    page.fill("#s-title", "First cold call"); page.check("#s-first"); page.click('#s-scale button[data-v="-1"]')
    check("already earned its Courage Credit" in page.inner_text("#s-preview"), "Courage Credit doesn't repeat for same rep")
    page.click("#s-save"); page.wait_for_selector("#s-saved")
    check("−1" in page.inner_text("#s-saved") and "Courage Credit" not in page.inner_text("#s-saved"), "repeat saved at -1 without badge")
    # first attempt scoring higher keeps badge
    page.fill("#s-title", "First keynote"); page.check("#s-first"); page.click('#s-scale button[data-v="2"]'); page.click("#s-save"); page.wait_for_selector("#s-saved")
    check("+2" in page.inner_text("#s-saved") and "Courage Credit" in page.inner_text("#s-saved"), "first attempt +2 keeps badge")
    # game day elite and cap on switch back
    page.fill("#s-title", "Championship game"); page.click('#s-kind button[data-k="game"]')
    check(not page.locator('#s-scale button[data-v="3"]').is_disabled(), "Elite +3 enabled on game day")
    page.click('#s-scale button[data-v="3"]'); page.click('#s-kind button[data-k="practice"]')
    check("Elite is saved for game day" in page.inner_text("#s-preview") and page.get_attribute('#s-scale button[data-v="2"]', "aria-pressed") == "true", "+3 caps to +2 when switched to practice")
    page.click('#s-kind button[data-k="game"]'); page.click('#s-scale button[data-v="3"]')
    if page.locator(".seg.mini").count():
        page.click('.seg.mini[data-part="Tactics"] button[data-v="2"]'); page.click('.seg.mini[data-part="Allies"] button[data-v="1"]')
    page.click("#s-save"); page.wait_for_selector("#s-saved")
    check("+3" in page.inner_text("#s-saved"), "Elite +3 saved on game day")
    stored = page.evaluate("JSON.parse(localStorage.getItem(APP.storageKey))")
    check(len(stored["reps"]) == 4 and [r["recorded"] for r in stored["reps"]] == [0.5, -1, 2, 3], "stored recorded scores [0.5,-1,2,3]")
    check(sum(1 for r in stored["reps"] if r["courageCredit"]) == 2, "2 Courage Credits stored")
    # ---------- trends ----------
    page.click('nav.tabs button[data-tab="trends"]'); page.wait_for_selector("#t-count")
    check(page.inner_text("#t-count") == "4" and page.inner_text("#t-cc") == "2", "trends counts 4 reps / 2 CCs")
    check(page.locator("svg.spark").count() == 1 and page.locator(".hist .badge.cc").count() == 2, "trend line + CC badges in history")
    check(not overflow(page), "no horizontal overflow (390 trends)")
    page.screenshot(path=str(SHOTS / f"{app}-390-trends.png"), full_page=True)
    # ---------- chat ----------
    page.click('nav.tabs button[data-tab="coach"]'); page.wait_for_selector("#msgs .msg.coach")
    intro = last_coach(page)
    check("AI coach" in intro and "75% solution" in intro and "not the live Clint" in intro, "intro discloses AI / 75%")
    r = say(page, "I feel lost since I got out of the military")
    check("NOT lost" in r or "not a new pro" in r.lower() or "new map" in r, "lost/transition reply")
    r = say(page, "I can't do public speaking")
    check("I couldn't (yet)" in r and "I haven't tried (yet)" in r, "I can't reframe offered")
    r = say(page, "I haven't tried yet")
    check("20 seconds of insane courage" in r and "Courage Credit" in r, "haven't-tried path -> 20 seconds + Courage Credit")
    r = say(page, "I can't do sales either")
    check("I couldn't (yet)" not in r, "reframe only once per conversation")
    r = say(page, "First time giving hard feedback to my team today, it went badly")
    check("Courage Credit" in r and "+0.5" in r, "first attempt -> Courage Credit in chat")
    r = say(page, "I'd score my practice run a +3")
    check("Elite is saved for game day" in r, "chat caps +3 for practice")
    r = say(page, "What's different about Clint?")
    check("there is a \"who\"" in r.lower() or "there is a “who”" in r.lower(), "faith trigger answer")
    r = say(page, "Is this really Clint?")
    check("No … I'm CoachClint, an AI" in r, "honesty answer")
    r = say(page, "We just closed our best quarter ever")
    check("Revel" in r, "ReLoad reply")
    allc = page.inner_text("#msgs")
    check(allc.count("Side note, no homework") <= 1, "chronicle mention at most once")
    check("brother" not in allc.lower(), "no 'brother' before threshold")
    page.screenshot(path=str(SHOTS / f"{app}-390-chat.png"), full_page=True)
    # gray zone
    page.click("#ch-new")
    r = say(page, "Honestly what's the point anymore")
    check("988" in r and "hurting yourself" in r, "gray zone: 988 once + gentle check")
    r = say(page, "no")
    check("Thank you for telling me straight" in r, "gray check 'no' -> keep coaching")
    # crisis
    page.click("#ch-new")
    r = say(page, "The business went under. My family would be better off with the life insurance. I already know how I'd do it.")
    check("988" in r and "press 1" in r and "911" in r and "Are you safe right now?" in r, "crisis: 988 / press 1 / 911 / safety question")
    check(page.locator(".msg.crisis .lifelines a[href='tel:988']").count() >= 1 and page.locator(".msg.crisis a[href='sms:838255']").count() == 1, "crisis: tap-to-call lifelines")
    note = page.locator(".msg.crisis .alertnote").last.inner_text()
    check("clint@holdfasthq.com" in note and "cb@get-highground.com" in note and "sends nothing" in note, "crisis: alert note names both recipients, nothing sent")
    alerts = page.evaluate("JSON.parse(localStorage.getItem(APP.storageKey + '-alerts') || '[]')")
    check(len(alerts) == 1 and alerts[0]["sent"] is False and alerts[0]["recipients"] == ["clint@holdfasthq.com", "cb@get-highground.com"], "crisis alert recorded locally, sent:false")
    check("Side note" not in r and "mountain" not in r.lower(), "crisis: no frameworks / upsell")
    page.screenshot(path=str(SHOTS / f"{app}-390-crisis.png"), full_page=True)
    r = say(page, "ok")
    check("988" in r, "crisis follow-up repeats lifelines")
    r = say(page, "I called 988 and my wife is with me now")
    check("proud of you for reaching out" in r.lower(), "crisis resolves warmly")
    # false-positive checks
    page.click("#ch-new")
    for t in ["I'm going to kill it at the pitch tomorrow", "This job is killing me", "I can't make Tuesday's meeting"]:
        r = say(page, t)
        check("988" not in r, f"no crisis false positive: {t!r}")
    check(page.evaluate("JSON.parse(localStorage.getItem(APP.storageKey + '-alerts') || '[]').length") == 1, "no extra alerts from false positives")
    # module context
    page.click('nav.tabs button[data-tab="learn"]'); page.locator(".mod").nth(1).click(); page.wait_for_selector(".lesson")
    page.click("#m-ask"); page.wait_for_function("document.querySelectorAll('#msgs .msg.coach:not(.typing)').length > 1")
    page.wait_for_timeout(600)
    check(page.evaluate("APP.modules[1].note") in last_coach(page), "Ask CoachClint about this -> lesson context reply")
    check(not overflow(page), "no horizontal overflow (390 chat)")
    ctx.close()
    # ---------- desktop ----------
    ctx = b.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page(); page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector(".mod")
    check(page.locator("#coach").is_visible() and page.locator("#msgs .msg.coach").count() >= 1, "desktop: chat docked + intro visible")
    check(not overflow(page), "no horizontal overflow (1280)")
    page.screenshot(path=str(SHOTS / f"{app}-1280.png"), full_page=False)
    ctx.close(); b.close()

check(not errs, "no console/page errors or external requests " + json.dumps(errs[:5]))
print("\n%d failure(s)" % len(fails))
sys.exit(1 if fails else 0)
