"""CV reviewer: reads the text of a CV and scores it out of 100.

Rule-based and runs locally, so no CV is sent to an outside service.
Five areas are scored, and each missed point comes with a plain-English tip.
"""
import re
import zipfile
from xml.etree import ElementTree

ACTION_VERBS = {
    "led", "organised", "organized", "managed", "built", "created", "designed",
    "developed", "improved", "increased", "reduced", "planned", "delivered",
    "launched", "trained", "supported", "solved", "achieved", "coordinated",
    "presented", "researched", "analysed", "analyzed", "wrote", "volunteered",
    "raised", "helped", "taught", "won", "completed", "set", "ran", "started",
}
SKILL_WORDS = {
    "python", "java", "javascript", "html", "css", "sql", "excel", "word",
    "powerpoint", "coding", "programming", "data", "teamwork", "communication",
    "leadership", "problem solving", "problem-solving", "time management",
    "organisation", "customer service", "presentation", "research", "budget",
    "accounting", "marketing", "social media", "design", "photoshop", "video",
    "editing", "cad", "electrical", "mechanical", "maintenance", "safety",
    "project", "analysis", "networking", "cloud", "aws", "cyber", "testing",
}
CLICHES = [
    "hard worker", "hard-working", "team player", "think outside the box",
    "go-getter", "people person", "detail-oriented", "self-starter",
]


def extract_text(path, ext):
    """Return the plain text of a .pdf, .docx or .txt file."""
    if ext == ".txt":
        with open(path, encoding="utf-8", errors="ignore") as f:
            return f.read()
    if ext == ".docx":
        with zipfile.ZipFile(path) as z:
            root = ElementTree.fromstring(z.read("word/document.xml"))
        ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        lines = []
        for para in root.iter(ns + "p"):
            lines.append("".join(t.text or "" for t in para.iter(ns + "t")))
        return "\n".join(lines)
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    return ""


def _has_heading(text, words):
    pattern = r"^\s*(" + "|".join(words) + r")\b"
    return re.search(pattern, text, re.IGNORECASE | re.MULTILINE) is not None


def review_cv(text):
    """Score a CV out of 100 and return the breakdown and tips."""
    lower = text.lower()
    words = re.findall(r"[A-Za-z']+", text)
    word_count = len(words)
    tips = []
    areas = []

    # 1. Contact details (15)
    pts = 0
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text):
        pts += 6
    else:
        tips.append("Add your email address at the top.")
    if re.search(r"(\+44|0)\s?\d[\d\s]{8,12}\d", text):
        pts += 5
    else:
        tips.append("Add a phone number so employers can call you.")
    if re.search(r"linkedin|github|portfolio|https?://", lower):
        pts += 4
    else:
        tips.append("Add a link to your LinkedIn, GitHub or portfolio if you have one.")
    areas.append({"name": "Contact details", "score": pts, "max": 15})

    # 2. Sections (25)
    pts = 0
    checks = [
        (["profile", "personal profile", "personal statement", "summary", "about me"], 5,
         "Add a short profile of 2 or 3 sentences at the top saying who you are and what you want to do."),
        (["education", "qualifications"], 6,
         "Add an Education section with your school or college and your qualifications."),
        (["experience", "work experience", "employment", "volunteering"], 6,
         "Add a Work experience section. Part-time jobs, volunteering and school projects all count."),
        (["skills", "key skills"], 5,
         "Add a Skills section listing the skills you can back up with examples."),
        (["interests", "hobbies", "achievements", "awards"], 3,
         "Add your interests or achievements. They help show who you are."),
    ]
    for heads, value, tip in checks:
        if _has_heading(text, heads):
            pts += value
        else:
            tips.append(tip)
    areas.append({"name": "Sections", "score": pts, "max": 25})

    # 3. Length (10)
    if 250 <= word_count <= 700:
        pts = 10
    elif 150 <= word_count < 250 or 700 < word_count <= 1000:
        pts = 5
        tips.append(
            "Your CV is a little short. Add more detail about what you have done."
            if word_count < 250 else
            "Your CV is quite long. Aim for one or two pages and cut anything that does not help."
        )
    else:
        pts = 0
        tips.append(
            "Your CV is very short. Add your education, experience and skills."
            if word_count < 150 else
            "Your CV is too long. Keep it to two pages at most."
        )
    areas.append({"name": "Length", "score": pts, "max": 10})

    # 4. Evidence and results (25)
    verbs = {w.lower() for w in words} & ACTION_VERBS
    verb_pts = min(len(verbs), 8) * 1.5   # up to 12
    numbers = re.findall(r"(\d+%|£\s?\d+|\b\d+\b)", text)
    number_pts = min(len(numbers), 13)    # up to 13
    pts = round(verb_pts + number_pts)
    if len(verbs) < 5:
        tips.append("Start your points with action words like led, built, organised or improved.")
    if len(numbers) < 5:
        tips.append("Add numbers to show results, for example 'raised £200' or 'trained 3 new staff'.")
    areas.append({"name": "Evidence and results", "score": min(pts, 25), "max": 25})

    # 5. Skills and clear writing (25)
    found_skills = {s for s in SKILL_WORDS if s in lower}
    skill_pts = min(len(found_skills), 10)  # up to 10
    if len(found_skills) < 6:
        tips.append("Name more specific skills, such as Excel, Python, customer service or teamwork.")
    sentences = [s for s in re.split(r"[.!?\n]+", text) if len(s.split()) > 3]
    avg = (sum(len(s.split()) for s in sentences) / len(sentences)) if sentences else 0
    # No sentences means nothing to judge, so no points (an empty CV used to get some).
    clear_pts = 0 if not sentences else 8 if avg <= 22 else 4 if avg <= 30 else 0
    if avg > 22:
        tips.append("Some sentences are long. Keep each point short and clear.")
    used = [c for c in CLICHES if c in lower]
    cliche_pts = 0 if not sentences else 7 if not used else max(0, 7 - 3 * len(used))
    if used:
        tips.append(
            "Swap general phrases like '" + used[0] + "' for a real example of what you did."
        )
    areas.append({"name": "Skills and clear writing", "score": skill_pts + clear_pts + cliche_pts, "max": 25})

    total = sum(a["score"] for a in areas)
    if total >= 80:
        verdict = "Strong CV. A few small changes could make it even better."
    elif total >= 60:
        verdict = "Good start. Work through the tips below to make it stronger."
    elif total >= 40:
        verdict = "Needs some work. The tips below show what to add first."
    else:
        verdict = "Needs a lot of work. Start with the first few tips below."

    return {
        "score": total,
        "verdict": verdict,
        "wordCount": word_count,
        "areas": areas,
        "tips": tips[:8],
    }
