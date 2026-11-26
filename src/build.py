#!/usr/bin/env python3
"""Build the two single-file apps from shared CoachClint sources.
Outputs: /workspace/pursuing-elite/index.html and /workspace/achievement-equation/index.html
Each repo also gets a src/ copy so it can be rebuilt on its own."""
import shutil, sys
from pathlib import Path
SRC = Path(__file__).resolve().parent
APPS = {
  "pursuing-elite": ("PursuingElite", "PursuingElite by HoldFast: lessons, self-scoring, trends and CoachClint, the AI coach built on Clint Bruce's words."),
  "achievement-equation": ("AchievementEquation", "The AchievementEquation by HoldFast: Angles + Allies + Advantages = Achievements, with CoachClint."),
}
BLURB = {
  "pursuing-elite": "Living and leading beyond excellence. Five outcomes (Bad, Average, Good, Excellent, Elite), five PursuitPoints (Balance, Curiosity, Tribalism, Intentionalism, Authenticity), and one question: are you done, or Not Done Yet?",
  "achievement-equation": "**Angles + Allies + Advantages = Achievements.** The equation Clint wrote on a 3x5 card as an 8th-grade, 5th-string fullback. Talent is one third of the equation, not the whole story. Advantages are Talent and Treasure, NOT time.",
}
BREAKDOWN = {"pursuing-elite": "", "achievement-equation": " Each score can also be broken down across Tactics, Techniques, Teammate, Tools, Technology, Allies, Talent, and Treasure, with its own trend view."}
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/workspace")  # repo-local: python3 src/build.py ..
sh = SRC / "shared"
tpl = (sh / "template.html").read_text()
for slug, (title, desc) in APPS.items():
    if not (SRC / "apps" / slug).exists(): continue
    html = (tpl.replace("{{TITLE}}", title).replace("{{DESC}}", desc)
            .replace("{{CSS}}", (sh / "style.css").read_text())
            .replace("{{KNOWLEDGE}}", (sh / "knowledge.js").read_text())
            .replace("{{ENGINE}}", (sh / "engine.js").read_text())
            .replace("{{CONTENT}}", (SRC / "apps" / slug / "content.js").read_text())
            .replace("{{UI}}", (sh / "ui.js").read_text()))
    d = OUT / slug; d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(html)
    s = d / "src"; (s / "shared").mkdir(parents=True, exist_ok=True); (s / "apps" / slug).mkdir(parents=True, exist_ok=True)
    for f in ["template.html", "style.css", "knowledge.js", "engine.js", "ui.js"]: shutil.copy(sh / f, s / "shared" / f)
    shutil.copy(SRC / "apps" / slug / "content.js", s / "apps" / slug / "content.js")
    if (SRC / "build.py").resolve() != (s / "build.py").resolve(): shutil.copy(SRC / "build.py", s / "build.py")
    # docs
    import re
    mods = re.findall(r'title: "((?:[^"\\]|\\.)*)", mins', (SRC / "apps" / slug / "content.js").read_text())
    mods = [m.replace('\\"', '"') for m in mods]
    other = [k for k in APPS if k != slug][0]
    key = re.search(r'storageKey: "([^"]+)"', (SRC / "apps" / slug / "content.js").read_text()).group(1)
    appid = re.search(r'id: "([^"]+)"', (SRC / "apps" / slug / "content.js").read_text()).group(1)
    first = re.search(r'modules: \[\s*\{ id: "([^"]+)"', (SRC / "apps" / slug / "content.js").read_text()).group(1)
    rd = (SRC / "docs" / "README.template.md").read_text()
    for k, v in {"NAME": title, "SLUG": slug, "BLURB": BLURB[slug], "SISTER_NAME": APPS[other][0], "SISTER_SLUG": other,
                 "MODULE_COUNT": str(len(mods)), "MODULE_LIST": "; ".join(mods), "KEY": key, "APP_ID": appid, "FIRST_MODULE": first,
                 "BREAKDOWN_NOTE": BREAKDOWN[slug]}.items():
        rd = rd.replace("{{" + k + "}}", v)
    (d / "README.md").write_text(rd)
    shutil.copy(SRC / "docs" / "ENGAGEMENT.md", d / "ENGAGEMENT.md")
    (d / "docs").mkdir(exist_ok=True); shutil.copy(SRC / "docs" / "coachclint-system-prompt.md", d / "docs" / "coachclint-system-prompt.md")
    sd = s / "docs"; sd.mkdir(exist_ok=True)
    for f in ["README.template.md", "ENGAGEMENT.md", "coachclint-system-prompt.md"]: shutil.copy(SRC / "docs" / f, sd / f)
    if (SRC / "test.py").exists(): shutil.copy(SRC / "test.py", d / "test.py")
    print("built", d / "index.html", len(html), "bytes")
