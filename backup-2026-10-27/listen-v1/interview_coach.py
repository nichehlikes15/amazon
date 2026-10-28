"""Interview practice: question sets and automatic feedback.

Rule-based and runs locally, like cv_reviewer.py - answers are not sent to
any outside service and are not saved. Each answer is checked for:
  - length (and speaking pace, if it was spoken)
  - a clear example: what happened, what YOU did, and how it ended (STAR)
  - "I" vs "we" (interviewers want to hear your part)
  - specific detail (numbers, times, names of tools or places)
  - filler words
  - whether it answers the question that was asked

To swap in a real AI model later, replace review_answer() with a call to
the model and keep the same return shape - the frontend won't need to change.
"""
import re

PATHWAYS = ["Digital", "Business", "Media", "Finance", "Engineering"]

# Each question: id, text, what it's testing (shown in feedback), keywords that
# suggest the answer is on topic, and whether it wants a real example (STAR).
GENERAL = {
    "intro": {
        "text": "To start, tell me a bit about yourself and why you'd like this apprenticeship.",
        "focus": "A short, clear introduction and a real reason for applying",
        "keywords": ["interested", "enjoy", "because", "want", "learn", "course", "school", "college",
                     "apprenticeship", "career", "skills", "amazon", "passion", "love"],
        "star": False,
    },
    "team": {
        "text": "Tell me about a time you worked in a team to get something done. What was your part?",
        "focus": "Working with others, and being clear about your own part",
        "keywords": ["team", "group", "together", "we", "role", "part", "helped", "shared", "agreed",
                     "project", "everyone", "classmates", "friends"],
        "star": True,
    },
    "problem": {
        "text": "Tell me about a time something went wrong. What did you do, and what did you learn?",
        "focus": "Owning a problem, fixing it and learning from it",
        "keywords": ["problem", "wrong", "mistake", "fixed", "solved", "learned", "learnt", "next time",
                     "changed", "realised", "realized", "issue", "late", "failed"],
        "star": True,
    },
    "customer": {
        "text": "Tell me about a time you helped someone, even though it wasn't your job.",
        "focus": "Putting other people first (Amazon calls this customer obsession)",
        "keywords": ["helped", "customer", "someone", "they", "needed", "support", "noticed", "asked",
                     "made sure", "happy", "thanked"],
        "star": True,
    },
    "learn": {
        "text": "Tell me about a time you had to learn something new quickly. How did you do it?",
        "focus": "Being curious and learning fast",
        "keywords": ["learn", "learned", "learnt", "new", "quickly", "practised", "practiced", "watched",
                     "read", "asked", "taught", "tried", "video", "course"],
        "star": True,
    },
    "close": {
        "text": "That's all my questions. Is there anything you'd like to ask me about the role?",
        "focus": "Asking a thoughtful question at the end",
        "keywords": ["what", "how", "would", "could", "do you", "is there", "training", "team",
                     "day", "typical", "progress", "mentor", "next"],
        "star": False,
    },
}

SPECIFIC = {
    "Digital": [
        {"id": "digital-build", "text": "Tell me about something you've built, coded or fixed using technology.",
         "focus": "Showing real hands-on interest in technology",
         "keywords": ["built", "made", "code", "coded", "website", "app", "program", "python", "html",
                      "game", "computer", "fixed", "software", "scratch", "javascript"], "star": True},
        {"id": "digital-explain", "text": "How would you explain something technical to someone who isn't technical?",
         "focus": "Explaining clearly in plain words",
         "keywords": ["simple", "example", "explain", "like", "compare", "step", "check", "understand",
                      "picture", "avoid", "jargon"], "star": False},
    ],
    "Business": [
        {"id": "business-organise", "text": "Tell me about a time you organised something, like an event, a project or a plan.",
         "focus": "Planning and getting things done",
         "keywords": ["organised", "organized", "planned", "event", "list", "deadline", "people", "budget",
                      "schedule", "arranged", "booked"], "star": True},
        {"id": "business-improve", "text": "If a task at work was slow and frustrating, how would you try to make it better?",
         "focus": "Spotting problems and improving how things work",
         "keywords": ["ask", "find out", "why", "steps", "quicker", "faster", "simpler", "test", "measure",
                      "idea", "suggest", "improve"], "star": False},
    ],
    "Media": [
        {"id": "media-create", "text": "Tell me about something you created that you're proud of. Who was it for?",
         "focus": "Creativity, and thinking about your audience",
         "keywords": ["made", "created", "designed", "video", "post", "photo", "wrote", "audience",
                      "people", "feedback", "views", "edited"], "star": True},
        {"id": "media-measure", "text": "How would you know if a social media post had worked well?",
         "focus": "Using results to judge your work",
         "keywords": ["likes", "views", "shares", "comments", "engagement", "clicks", "followers",
                      "compare", "numbers", "goal", "reach"], "star": False},
    ],
    "Finance": [
        {"id": "finance-numbers", "text": "Tell me about a time you worked with numbers, money or a budget.",
         "focus": "Being comfortable with numbers",
         "keywords": ["money", "budget", "numbers", "saved", "spent", "maths", "math", "spreadsheet",
                      "excel", "cost", "price", "calculated"], "star": True},
        {"id": "finance-accurate", "text": "How do you make sure your work is accurate?",
         "focus": "Care and attention to detail",
         "keywords": ["check", "double", "again", "detail", "careful", "list", "review", "mistakes",
                      "slowly", "compare", "ask"], "star": False},
    ],
    "Engineering": [
        {"id": "engineering-fix", "text": "Tell me about a time you fixed or built something with your hands.",
         "focus": "Practical, hands-on problem solving",
         "keywords": ["fixed", "built", "made", "repaired", "tools", "bike", "car", "machine", "parts",
                      "worked out", "tested"], "star": True},
        {"id": "engineering-safe", "text": "How do you stay safe when working with tools or machines?",
         "focus": "Taking safety seriously",
         "keywords": ["safety", "safe", "gloves", "goggles", "instructions", "check", "ask", "training",
                      "careful", "rules", "risk", "ppe"], "star": False},
    ],
}

FILLERS = ["um", "uh", "erm", "er", "like", "you know", "basically", "kind of", "sort of", "literally", "i guess"]
SITUATION = ["when", "once", "last year", "at school", "at college", "in year", "during", "in my", "there was",
             "we had", "i was", "one time"]
ACTION = ["i decided", "i started", "i made", "i asked", "i spoke", "i organised", "i organized", "i built",
          "i created", "i helped", "i fixed", "i set up", "i suggested", "i took", "i led", "i worked",
          "i checked", "i planned", "i practised", "i practiced", "i wrote", "i tried", "i went", "i learned",
          "i learnt", "i offered", "i explained", "i did"]
RESULT = ["as a result", "in the end", "which meant", "result", "so we", "so i", "finally", "ended up",
          "learned", "learnt", "improved", "worked", "finished", "won", "passed", "next time", "now i"]


def question_set(pathway):
    """Five questions: intro, one pathway question, two example questions, and a close."""
    if pathway not in PATHWAYS:
        pathway = "Digital"
    specific = SPECIFIC[pathway]
    picks = [
        ("intro", GENERAL["intro"]),
        (specific[0]["id"], specific[0]),
        ("team", GENERAL["team"]),
        ("problem", GENERAL["problem"]),
        ("close", GENERAL["close"]),
    ]
    return [{"id": qid, "text": q["text"], "focus": q["focus"]} for qid, q in picks]


def _find_question(qid):
    if qid in GENERAL:
        return GENERAL[qid]
    for qs in SPECIFIC.values():
        for q in qs:
            if q["id"] == qid:
                return q
    return None


def _count_phrases(text, phrases):
    total = 0
    for p in phrases:
        total += len(re.findall(r"(?<![a-z'])" + re.escape(p) + r"(?![a-z'])", text))
    return total


def review_answer(qid, answer, seconds=None):
    q = _find_question(qid)
    if q is None:
        return None
    text = " ".join((answer or "").split())
    low = text.lower()
    words = re.findall(r"[a-zA-Z0-9']+", text)
    n = len(words)

    strengths, tips = [], []
    score = 0

    if n == 0:
        return {
            "id": qid, "question": q["text"], "focus": q["focus"], "answer": "", "words": 0,
            "score": 0, "strengths": [],
            "tips": ["You didn't give an answer to this one. Even a short answer is better than none - "
                     "it's fine to say 'Can I take a moment to think?'"],
            "pace": None,
        }

    # 1. Length (25)
    is_close = qid == "close"
    lo, hi = (8, 80) if is_close else (60, 260)
    if n < lo * 0.6:
        score += 6
        tips.append(f"This answer was very short ({n} words). Aim for about {lo}-{hi} words "
                    "so you have time to give an example.")
    elif n < lo:
        score += 15
        tips.append(f"Try to say a little more ({n} words). Add one more detail about what you did.")
    elif n <= hi:
        score += 25
        strengths.append("A good length - enough detail without going on too long.")
    else:
        score += 16
        tips.append(f"This answer was quite long ({n} words). Try to keep to the main points - "
                    "about 1 to 2 minutes when spoken.")

    # 2. Example structure (30) or relevance-heavy for non-example questions
    if q["star"]:
        has_s = _count_phrases(low, SITUATION) > 0
        has_a = _count_phrases(low, ACTION) > 0
        has_r = _count_phrases(low, RESULT) > 0
        parts = sum([has_s, has_a, has_r])
        score += parts * 10
        if parts == 3:
            strengths.append("You told a clear story: what happened, what you did and how it ended.")
        else:
            missing = []
            if not has_s:
                missing.append("set the scene (when and where it happened)")
            if not has_a:
                missing.append("say what YOU did, using 'I' (for example 'I decided to...')")
            if not has_r:
                missing.append("finish with the result or what you learned")
            tips.append("Use the STAR method: " + "; ".join(missing) + ".")
    else:
        score += 20  # no example needed; relevance below carries more weight
        if is_close:
            asked = bool(re.search(r"\b(what|how|would|could|is there|are there|do you|will i|can i)\b", low))
            if asked:
                score += 10
                strengths.append("You asked a question - this shows you're interested in the role.")
            else:
                tips.append("Always have a question ready, e.g. 'What does a typical day look like?' "
                            "or 'What training would I get?'")

    # 3. Your part: I vs we (10) - example questions only
    i_count = _count_phrases(low, ["i", "i'm", "i've", "my", "me"])
    we_count = _count_phrases(low, ["we", "we're", "we've", "our", "us"])
    if q["star"]:
        if i_count >= we_count or i_count >= 4:
            score += 10
            if we_count:
                strengths.append("You were clear about your own part, not just the group's.")
        else:
            score += 3
            tips.append("You said 'we' more than 'I'. Interviewers want to hear what YOU did - "
                        "say 'I' for your own actions.")
    else:
        score += 10

    # 4. Specific detail (15)
    specifics = len(re.findall(r"\d", text)) + _count_phrases(
        low, ["minutes", "hours", "days", "weeks", "months", "year", "percent", "%", "people", "pounds", "£"])
    if specifics >= 2:
        score += 15
        strengths.append("You used specific details, like numbers or times, which makes it believable.")
    elif specifics == 1:
        score += 9
        tips.append("Add one or two more specific details, such as how many people, how long it took, or a result in numbers.")
    else:
        score += 3 if not is_close else 12
        if not is_close:
            tips.append("Make it specific: how many people, how long, what changed? Numbers stick in people's minds.")

    # 5. Fillers (10)
    fillers = _count_phrases(low, FILLERS)
    rate = fillers / max(n, 1)
    if rate <= 0.02:
        score += 10
    elif rate <= 0.05:
        score += 6
        tips.append(f"You used filler words like 'um' or 'like' {fillers} times. A short pause sounds more confident.")
    else:
        score += 2
        tips.append(f"Lots of filler words ({fillers}). Slow down and take a breath instead of saying 'um' or 'like'.")

    # 6. On topic (10)
    hits = _count_phrases(low, q["keywords"])
    if hits >= 2:
        score += 10
        strengths.append("You answered the question that was asked.")
    elif hits == 1:
        score += 6
    else:
        score += 2
        tips.append(f"Make sure you answer the question directly. This one was about: {q['focus'].lower()}.")

    # Pace (only if spoken and timed) - advice only, not scored
    pace = None
    if seconds and seconds > 5 and n > 10:
        wpm = round(n / (seconds / 60))
        pace = wpm
        if wpm > 180:
            tips.append(f"You spoke quite fast (about {wpm} words a minute). Slowing down a little helps people follow you.")
        elif wpm < 90:
            tips.append(f"You spoke quite slowly (about {wpm} words a minute). Practising the answer out loud will help it flow.")
        else:
            strengths.append(f"A good speaking pace (about {wpm} words a minute).")

    return {
        "id": qid,
        "question": q["text"],
        "focus": q["focus"],
        "answer": text,
        "words": n,
        "score": max(0, min(100, score)),
        "strengths": strengths[:3],
        "tips": tips[:3],
        "pace": pace,
    }


def review_interview(answers):
    """answers: list of {id, answer, seconds}. Returns per-question reviews and a summary."""
    reviews = []
    for a in answers:
        r = review_answer(str(a.get("id") or ""), str(a.get("answer") or ""), a.get("seconds"))
        if r is not None:
            reviews.append(r)
    if not reviews:
        return None
    overall = round(sum(r["score"] for r in reviews) / len(reviews))
    if overall >= 80:
        verdict = "Great interview. Your answers were clear, specific and well structured."
    elif overall >= 60:
        verdict = "A solid interview. A few changes would make your answers even stronger."
    elif overall >= 40:
        verdict = "A good start. Work on giving clear examples with more detail."
    else:
        verdict = "Keep practising. Try using the STAR method for each example question."

    # Most common tips across answers, for a short "focus on" list.
    seen, focus = set(), []
    for r in sorted(reviews, key=lambda r: r["score"]):
        for t in r["tips"]:
            key = t.split(":")[0][:40]
            if key not in seen:
                seen.add(key)
                focus.append(t)
    best = max(reviews, key=lambda r: r["score"])
    return {
        "overall": overall,
        "verdict": verdict,
        "focusOn": focus[:3],
        "bestQuestion": best["question"] if best["score"] >= 60 else None,
        "reviews": reviews,
    }
