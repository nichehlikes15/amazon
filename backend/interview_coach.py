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


def question_info(qid):
    """Text and focus of a question, for the AI replies (or None)."""
    q = _find_question(qid)
    return {"text": q["text"], "focus": q["focus"]} if q else None


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
    low_f = re.sub(r"\b(look|looks|would|i'd|feel|feels|sound|sounds|seem|seems|just) like\b", r"\1", low)
    fillers = _count_phrases(low_f, FILLERS)
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


# ---------- What Alex says straight after an answer ----------
# Short, spoken versions of the written strengths and tips above.
_PRAISE = [
    ("You told a clear story", "You told a clear story, with a result at the end."),
    ("You used specific details", "The specific details made it believable."),
    ("You were clear about your own part", "You were clear about your own part."),
    ("You asked a question", "Asking a question shows you're interested."),
    ("You answered the question", "You answered the question I asked."),
    ("A good length", "It was a good length."),
    ("A good speaking pace", "Your pace was good."),
]
_TIPS = [
    ("You didn't give an answer", None),
    ("Use the STAR method", "use the STAR method. Set the scene, say what you did, then finish with the result."),
    ("This answer was very short", "say a bit more, and give a real example."),
    ("Make sure you answer the question directly", "make sure you answer the question I asked directly."),
    ("You said 'we' more than 'I'", "say 'I' a bit more, so I can hear what you did yourself."),
    ("Make it specific", "add a specific detail, like a number or how long it took."),
    ("Add one or two more specific details", "add a specific detail, like a number or how long it took."),
    ("Try to say a little more", "add one more detail about what you did."),
    ("This answer was quite long", "keep it a little shorter and stick to the main points."),
    ("Lots of filler words", "slow down and take a breath instead of saying um or like."),
    ("You used filler words", "pause for a second instead of saying um or like."),
    ("Always have a question ready", "have a question ready, like what a typical day looks like."),
    ("You spoke quite fast", "slow down a little, so it's easy to follow."),
    ("You spoke quite slowly", "practise it out loud a few times so it flows."),
]


def spoken_feedback(review):
    """One or two short sentences Alex says after an answer."""
    if review["words"] == 0:
        return ("I didn't catch an answer that time. That's okay. "
                "You can try again, or type your answer instead.")
    score = review["score"]
    if score >= 80:
        opener = "That was a strong answer."
    elif score >= 60:
        opener = "Good answer."
    elif score >= 40:
        opener = "Thanks, that's a good start."
    else:
        opener = "Thanks for that."

    praise = None
    for key, line in _PRAISE:
        if any(s.startswith(key) for s in review["strengths"]):
            praise = line
            break

    tip = None
    for key, line in _TIPS:
        if line and any(t.startswith(key) for t in review["tips"]):
            tip = line
            break

    parts = [opener]
    if praise:
        parts.append(praise)
    if tip:
        parts.append("One thing to try next time: " + tip)
    elif score >= 60:
        parts.append("Nothing big to change there. Nice work.")
    return " ".join(parts)


# ---------- Repeating back what you said ----------
# Alex picks out one thing from your answer and says it back in his own
# words ("So you checked every connection..."), so it's clear he listened.
_SWAP = {
    "i": "you", "i'm": "you're", "im": "you're", "i've": "you've", "ive": "you've",
    "i'd": "you'd", "i'll": "you'll", "me": "you", "my": "your", "mine": "yours",
    "myself": "yourself", "we": "you and your team", "we're": "you and your team are",
    "we've": "you and your team have", "our": "your", "us": "you", "ourselves": "yourselves",
}
_AFTER_I = {"am": "are", "was": "were"}
_DROP = {"um", "uh", "erm", "er", "uhm", "hmm", "basically", "literally"}
_END_TRIM = {"and", "but", "so", "then", "the", "a", "an", "to", "of", "with", "for", "because",
             "that", "which", "when", "or", "in", "on", "at", "my", "our", "your", "it", "is", "was"}
_STOPS = {"and", "but", "so", "then", "because", "which"}


def _you_form(words):
    out = []
    prev = ""
    for w in words:
        low = w.lower()
        if prev in ("i", "we") and low in _AFTER_I:
            out.append("were" if prev == "we" else _AFTER_I[low])
        elif low in _SWAP:
            out.append(_SWAP[low])
        else:
            out.append(w)
        prev = low
    text = " ".join(out)
    return text.replace("you and your team and your team", "you and your team")


def _clip(words, start, max_words=13):
    """Take a short phrase starting at `start`, ending at a natural break."""
    piece = []
    for k, w in enumerate(words[start:start + max_words + 6]):
        if k >= 5 and w.lower() in _STOPS:
            break
        piece.append(w)
        if k + 1 >= max_words:
            break
    while piece and piece[-1].lower() in _END_TRIM:
        piece.pop()
    return piece


def reflect_answer(qid, answer):
    """A short sentence that shows Alex understood the answer, or None."""
    cleaned = re.sub(r"[^A-Za-z0-9'£%\s-]", " ", answer or "")
    words = []
    for w in cleaned.split():
        lw = w.lower()
        if lw in _DROP:
            continue
        # "like" as a filler word (but keep "look like", "would like"...)
        if lw == "like" and not (words and words[-1].lower() in ("look", "looks", "would", "i'd", "feel", "feels", "sound", "sounds", "seem", "seems")):
            continue
        words.append(w)
    if len(words) < 5:
        return None
    low = [w.lower() for w in words]

    if qid == "close":
        return ("That's a good question to ask. I can't answer it in a practice call, "
                "but it's exactly the kind of thing to ask a real interviewer.")

    # Reasons ("because...") for the intro question
    if qid == "intro" and "because" in low:
        k = low.index("because")
        piece = _clip(words, k + 1, 12)
        if len(piece) >= 3:
            return f"So you're interested because {_you_form(piece)}."

    # The first thing they say they did ("I decided...", "I fixed...")
    for k in range(len(low) - 1):
        two = f"{low[k]} {low[k + 1]}"
        if two in ACTION:
            piece = _clip(words, k + 1, 12)
            if len(piece) >= 2:
                return f"So you {_you_form(piece)}."

    # Otherwise, what happened at the end
    for marker in ("in the end", "as a result", "finally", "ended up"):
        m = re.search(r"\b" + marker + r"\b", " ".join(low))
        if m:
            k = len(" ".join(low)[:m.end()].split())
            piece = _clip(words, k, 12)
            if len(piece) >= 3:
                return f"And in the end, {_you_form(piece)}."

    # Otherwise, any sentence about themselves ("I ...")
    for k, w in enumerate(low):
        if w in ("i", "i'm", "i've", "im", "ive") and k + 3 < len(low):
            piece = _clip(words, k, 12)
            if len(piece) >= 4:
                return f"So {_you_form(piece)}."
    return None


_spoken_feedback_base = spoken_feedback


def spoken_feedback(review, reflect_on=None):
    """What Alex says straight after an answer: react, repeat back, then one tip.

    reflect_on: text to repeat back. None = the whole answer. "" = don't repeat
    anything back (Alex already did that before asking his follow-up)."""
    base = _spoken_feedback_base(review)
    if review["words"] == 0:
        return base
    if reflect_on is None:
        reflection = reflect_answer(review["id"], review["answer"])
    else:
        reflection = reflect_answer("followup", reflect_on) if reflect_on.strip() else None
    if not reflection:
        return base
    # base = "<opener> [praise] [tip or 'Nothing big...']" - put the reflection
    # after the opener, and keep only one more sentence after it.
    first, _, rest = base.partition(". ")
    k = rest.find("One thing to try")
    tip = rest[k:].strip() if k >= 0 else None
    rest_parts = [p for p in rest.split(". ") if p]
    closing = tip or (rest_parts[0] if rest_parts else "")
    if review["id"] == "close":
        return reflection
    out = f"{first}. {reflection}"
    if closing:
        out += " " + (closing if closing.endswith(".") else closing + ".")
    return out


# ---------- Follow-up questions ----------
# After your first answer, Alex asks one follow-up if something is missing -
# the same way a real interviewer digs into a thin answer. The most important
# gap is asked about first. Returns {"text", "why"} or None.
_LEARNED = r"\b(learn|learned|learnt|next time|differently|taught me|realised|realized|now i)\b"


def follow_up(qid, answer):
    q = _find_question(qid)
    if q is None or qid == "close":
        return None
    text = " ".join((answer or "").split())
    low = text.lower()
    n = len(re.findall(r"[a-zA-Z0-9']+", text))
    if n == 0:
        return None

    if q["star"]:
        has_a = _count_phrases(low, ACTION) > 0
        has_r = _count_phrases(low, RESULT) > 0
        i_count = _count_phrases(low, ["i", "i'm", "i've", "my", "me"])
        we_count = _count_phrases(low, ["we", "we're", "we've", "our", "us"])
        specifics = len(re.findall(r"\d", text)) + _count_phrases(
            low, ["minutes", "hours", "days", "weeks", "months", "year", "percent", "%", "people", "pounds", "£"])
        if n < 25:
            return {"text": "Can you give me a specific example? Tell me about one time in particular. What happened?",
                    "why": "Your answer was quite short, so Alex asked for a real example."}
        if not has_a or (we_count > i_count and i_count < 4):
            return {"text": "And what did you do yourself? Talk me through your part.",
                    "why": "Alex wanted to hear what you did, not just the group."}
        if not has_r:
            return {"text": "How did it turn out in the end?",
                    "why": "Your answer didn't say how it ended."}
        if specifics == 0:
            return {"text": "Can you put a number on that? For example, how many people were involved, or how long it took?",
                    "why": "A number makes an answer easier to believe."}
        if not re.search(_LEARNED, low):
            return {"text": "What did you learn from that, or what would you do differently next time?",
                    "why": "Interviewers like to hear what you learned."}
        return None

    if qid == "intro":
        if "because" not in low and not re.search(r"\b(interested|enjoy|love|passion|passionate)\b", low):
            return {"text": "What made you interested in this apprenticeship in particular?",
                    "why": "Alex wanted to hear your reason for applying."}
        if n < 40:
            return {"text": "And what are you hoping to learn here?",
                    "why": "A short answer - this gives you a chance to say more."}
        return None

    # Pathway questions that don't need a full story
    if n < 30:
        return {"text": "Can you give me an example of when you've done that?",
                "why": "A real example makes your answer stronger."}
    return None


# ---------- Talking to Alex during the call ----------
# Students don't only answer. They ask Alex things ("What is the
# apprenticeship?"), ask him to repeat or explain the question, get stuck, or
# want to skip. classify_turn() works out which, and what Alex says back.
#
# The facts below come from Launchpad's own pages (T Levels, Parents and
# carers, Help). Keep them in sync if those pages change, and don't add
# anything that isn't on the site.

FAQ = [
    (r"\bhow long\b.*\b(answer|talk|speak)\b|\bhow much should i (say|talk)\b",
     "Aim for about one to two minutes. Give one real example: what happened, what you did, and how it turned out."),
    (r"\bhow (long|many)\b.*\b(interview|call|questions?)\b",
     "There are five questions in this practice call, and it usually takes about ten minutes."),
    (r"\b(are you (real|a real person|a person|human|a robot|a bot|an ai|ai)|who are you)\b",
     "I'm Alex, a virtual interviewer for practice. I'm not a real person, so you can try things out with no pressure."),
    (r"\b(paid|pay|salary|wages?|earn)\b",
     "Amazon apprentices are paid a salary while they train. For a T Level placement, ask your school or college about pay and travel costs."),
    (r"\b(how long|how many (hours|days|weeks)|hours|days|weeks)\b",
     "A T Level placement is at least 315 hours, which is about 45 days."),
    (r"\bt[ -]?levels?\b",
     "A T Level is a two-year course you take after your GCSEs. It's worth the same as three A Levels. "
     "About 80% is classroom learning and 20% is a placement with an employer."),
    (r"\bwhere (is|are|would|will|do)\b.*\b(placement|job|it|work|based|be)\b|\b(location|based|london|manchester)\b",
     "Placements are offered in London and Manchester, and most of the time is face to face."),
    (r"\b(remote|from home|hybrid)\b",
     "Most of the placement is face to face. Some hours can be remote where that fits how the team works, especially for digital."),
    (r"\b(experience|never worked|first job)\b",
     "You don't need any experience. The placement is designed for students with little or no experience, "
     "and it starts by preparing you for the workplace."),
    (r"\b(mentors?|buddy|buddies|support|look after|check.?ins?)\b",
     "Every student has an Amazon mentor, regular check-ins, and at least three review meetings with their school or college and Amazon."),
    (r"\b(afterwards|after (it|that|the placement|the t level)|lead to|future|careers?|university|uni)\b",
     "T Levels can lead to skilled work, a higher or degree apprenticeship, or university. "
     "At Amazon, a placement can lead on to an apprenticeship."),
    (r"\b(apply|application|sign up)\b",
     "Live opportunities are on the Launchpad Opportunities page, and each one links to where you apply."),
    # What the practice interview is for ("What is the apprenticeship?")
    (r"\b(apprenticeship|job|role|position|placement|this for|applying for)\b", "ROLE"),
]
_FAQ = [(re.compile(p), a) for p, a in FAQ]


def faq_facts():
    """The facts Alex knows, for the AI version."""
    return [a for _, a in FAQ if a != "ROLE"]


_FILLER_START = re.compile(r"^(?:(?:sorry|so|um+|uh+|erm?|okay|ok|right|wait|alex|hang on|hmm+)[,.!]?\s+)+")
_SAFETY = re.compile(r"\b(hurt(s|ing)? me|hit(s|ting)? me|not safe|unsafe|abus(e|ed|ing)|kill myself|suicid\w*|"
                     r"self.?harm|want to die|bull(y|ied|ying))\b")
_REPEAT = re.compile(r"\b(repeat|say (that|it) again|pardon|come again|what was the question|didn'?t (catch|hear)|"
                     r"one more time)\b")
_SKIP = re.compile(r"^(can (we|i) |could (we|i) )?(please )?(skip|pass|next question|move on)\b|\bskip (this|it|that)\b")
_CLARIFY = re.compile(r"\b(what do you mean|what does that mean|(don'?t|do not) (understand|get it|get the question)|"
                      r"(can|could) you (explain|rephrase|say it differently)|not sure what you mean|"
                      r"what (are you|do you want me to) (asking|say|talk about))\b")
_STUCK = re.compile(r"\b(i (don'?t|do not) know|not sure|no idea|(can'?t|cannot) think|mind'?s? (gone )?blank|"
                    r"nothing comes to mind)\b")
_QSTART = re.compile(r"^(what|what's|whats|how (long|many|much|do|does|did|will|would|can|could|should|often|is|are)|why|who|"
                     r"where|which|when (do|does|will|would|is|are)|is (it|there|this|that|the)|are (there|you|they|the)|"
                     r"can (i|you|we)|could (i|you)|do (i|you|we|they)|does (it|the|this|that|amazon)|"
                     r"will (i|it|there|the)|would (i|it|you)|should i|am i|have you|tell me (about|what))\b")
_ANSWERISH = re.compile(r"\b(i (did|was|had|made|decided|helped|worked|led|built|fixed|organised|organized|started|"
                        r"learned|learnt|took|went|enjoy|love|like|want)|when i was|last year|at school|at college|"
                        r"in my|because)\b")

SAFEGUARD_REPLY = ("That sounds really important, and I'm glad you said it. I'm only a practice interviewer, so please "
                   "talk to a trusted adult, or call Childline free on 0800 1111. If you're in danger right now, call 999.")


def _role_reply(pathway):
    if pathway:
        return (f"This is a practice interview, so there isn't a real job behind it. Imagine you're applying for "
                f"a {pathway} T Level placement or apprenticeship at Amazon.")
    return ("This is a practice interview, so there isn't a real job behind it. Imagine you're applying for "
            "a T Level placement or apprenticeship at Amazon.")


def answer_question(text, pathway=None):
    """Alex's answer to a question about T Levels or placements, or None."""
    low = text.lower()
    for rx, reply in _FAQ:
        if rx.search(low):
            return _role_reply(pathway) if reply == "ROLE" else reply
    return None


def classify_turn(qid, utterance, context="answering", asked=None, pathway=None, tip=None):
    """Is this an answer, or is the student talking TO Alex?

    context: "answering" (during their turn) or "feedback" (after Alex's feedback).
    tip: during feedback, the main tip for their answer (for "How can I improve?").
    Returns {"type", "say"}. type is one of: answer, question, clarify,
    repeat, stuck, skip, safeguard, other."""
    q = _find_question(qid)
    asked = asked or (q["text"] if q else "")
    if not pathway:
        head = (qid or "").split("-")[0]
        pathway = head.capitalize() if head in ("digital", "business", "media", "finance", "engineering") else None
    raw = " ".join((utterance or "").split())
    low = _FILLER_START.sub("", raw.lower()).strip()
    n = len(re.findall(r"[a-z0-9']+", low))
    back = f" Now, back to my question. {asked}" if context == "answering" and asked else ""
    ready = " Say next when you're ready to move on." if context == "feedback" else ""

    if n == 0:
        return {"type": "other", "say": None}
    if _SAFETY.search(low):
        return {"type": "safeguard", "say": SAFEGUARD_REPLY}
    if context == "answering" and qid == "close":
        return {"type": "answer", "say": None}  # here the student is meant to ask Alex questions
    if context == "answering" and n <= 15 and _REPEAT.search(low):
        return {"type": "repeat", "say": f"Sure. {asked}"}
    if context == "answering" and n <= 8 and _SKIP.search(low):
        return {"type": "skip", "say": "No problem. Let's move on."}
    answerish = bool(_ANSWERISH.search(low))
    if n <= 25 and _CLARIFY.search(low):
        focus = (q["focus"] if q else "your experience").lower()
        if q and q["star"]:
            say = (f"Sure. This question is about {focus}. Tell me about one real time it happened, from school, "
                   "college, a job or a hobby. Say what happened, what you did, and how it turned out.")
        else:
            say = f"Sure. This question is about {focus}. There's no wrong answer, so just tell me in your own words."
        return {"type": "clarify", "say": say + ready}
    if n <= 12 and _STUCK.search(low) and not answerish:
        hint = (" Your example can come from school, college, a part-time job, a hobby or home."
                if q and q["star"] else " There's no wrong answer, so just say what you think.")
        return {"type": "stuck", "say": "That's okay, it happens in real interviews too. Take a moment to think."
                + hint + " Go ahead when you're ready."}
    if context == "feedback" and n <= 25 and re.search(r"\b(improve|better|differently|what should i|"
                                                        r"how (do|can|could|should) i|what (could|can) i)\b", low):
        say = f"Good question. {tip}" if tip else ("Good question. Give one clear example, say what you did yourself, "
                                                   "and finish with how it turned out.")
        return {"type": "question", "say": say.rstrip(".") + "." + ready}
    if n <= 30 and (raw.rstrip().endswith("?") or _QSTART.search(low)) and not answerish:
        reply = answer_question(low, pathway)
        if reply is None:
            reply = ("That's a good question. I can't answer it properly in a practice call, but it's a great thing "
                     "to ask a real interviewer, or in a coffee chat on Launchpad.")
        return {"type": "question", "say": reply + (back or ready)}
    if context == "feedback":
        return {"type": "other", "say": "Sorry, I didn't quite catch that. Say next when you're ready, "
                                        "or try again to have another go."}
    return {"type": "answer", "say": None}
