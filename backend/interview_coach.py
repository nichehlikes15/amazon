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


# A question about something on the student's own CV (Interview practice,
# "Ask me about my CV"). The text shown and spoken is made for each student;
# this is what it's scored against.
CV_QUESTION = {
    "text": "Tell me about something on your CV that you're proud of.",
    "focus": "Talking confidently about your own experience",
    "keywords": ["i", "my", "did", "made", "helped", "learned", "learnt", "team", "role", "job", "project",
                 "school", "college", "customers", "people", "because", "result"],
    "star": True,
}


def _find_question(qid):
    if qid == "cv":
        return CV_QUESTION
    if qid in GENERAL:
        return GENERAL[qid]
    for qs in SPECIFIC.values():
        for q in qs:
            if q["id"] == qid:
                return q
    return None


# More words that show an answer is on topic. Real answers use lots of
# different words, and a strong answer about upgrading a laptop was marked
# "off topic" because it never said "built" or "coded".
_EXTRA_KEYWORDS = {
    "intro": ["studying", "study", "t level", "digital", "technology", "coding", "code", "job", "future", "learning",
              "goal", "hope", "excited", "interest", "experience", "work", "team", "people", "problem", "problems"],
    "team": ["teammates", "partner", "others", "club", "pair", "colleagues", "split", "each", "plan", "planned",
             "organised", "organized", "led", "lead", "presentation", "match", "sport", "charity", "class"],
    "problem": ["broke", "broken", "error", "bug", "bugs", "missed", "forgot", "deadline", "went wrong", "fix",
                "solve", "sorted", "apologised", "apologized", "told", "late", "lost", "crashed", "plan", "test"],
    "customer": ["help", "customers", "person", "neighbour", "friend", "family", "teacher", "visitor", "explained",
                 "showed", "kind", "listened"],
    "learn": ["tutorial", "youtube", "practice", "practise", "skill", "understand", "studied", "research", "notes"],
    "digital-build": ["laptop", "pc", "phone", "tablet", "installed", "install", "upgraded", "upgrade", "repaired",
                      "repair", "set up", "network", "wifi", "router", "ram", "ssd", "hard drive", "printer", "tech",
                      "technology", "device", "coding", "script", "bot", "server", "database", "spreadsheet", "robot",
                      "arduino", "raspberry pi", "tested", "debugged", "debug", "bug", "bugs", "fix", "build", "mod",
                      "programmed", "programming", "java", "c#", "lua", "css", "excel"],
    "digital-explain": ["simply", "plain", "everyday", "analogy", "show", "showed", "demonstrate", "patient",
                        "questions", "slowly", "diagram", "words"],
    "business-organise": ["organise", "organize", "plan", "team", "money", "time", "tasks", "jobs", "fundraiser",
                          "trip", "party", "club", "rota"],
    "business-improve": ["process", "time", "waste", "automate", "change", "feedback", "team", "problem", "solution",
                         "better", "easier"],
    "media-create": ["video", "videos", "edit", "editing", "camera", "design", "logo", "poster", "website", "music",
                     "art", "drawing", "instagram", "tiktok", "youtube", "blog", "story"],
    "media-measure": ["analytics", "insights", "data", "watch time", "saves", "results", "test", "audience"],
    "finance-numbers": ["savings", "save", "pocket money", "wages", "job", "accounts", "profit", "sales", "till",
                        "change", "formula", "formulas", "percent"],
    "finance-accurate": ["checklist", "proofread", "totals", "formula", "formulas", "calculator", "twice", "check",
                         "checked", "errors", "accurate", "accuracy"],
    "engineering-fix": ["fix", "repair", "screwdriver", "spanner", "wrench", "wood", "metal", "engine", "wheel",
                        "chain", "lego", "model", "circuit", "wires", "soldered", "solder", "furniture", "assembled"],
    "engineering-safe": ["hazard", "hazards", "goggles", "helmet", "boots", "guard", "switch off", "unplug",
                         "supervisor", "first aid", "tidy", "clear"],
}
for _qid, _extra in _EXTRA_KEYWORDS.items():
    _q = _find_question(_qid)
    if _q:
        _q["keywords"] = list(dict.fromkeys(_q["keywords"] + _extra))


def _content_words(text):
    return {w for w in re.findall(r"[a-z']+", (text or "").lower()) if len(w) >= 4 and w not in _CV_STOP}


def _count_phrases(text, phrases):
    total = 0
    for p in phrases:
        total += len(re.findall(r"(?<![a-z'])" + re.escape(p) + r"(?![a-z'])", text))
    return total


def _cv_keywords(asked):
    """For the question about the student's CV: the words of the question that
    was really asked (e.g. "troubleshoot", "computer"), so an answer has to be
    about that, not just any story."""
    words = [w for w in re.findall(r"[a-z']+", (asked or "").lower())
             if len(w) >= 5 and w not in _CV_STOP]
    return list(dict.fromkeys(words)) + ["project", "job", "role", "team", "customers", "result", "learned",
                                         "learnt", "helped", "made", "built", "fixed"]


_CV_STOP = {"about", "would", "could", "there", "their", "which", "something", "example", "tell", "times",
            "yourself", "please", "where", "these", "those", "think", "thing", "things", "really", "while",
            "what", "when", "your", "that", "with", "this", "have", "after", "before", "turned", "describe"}


def _review_core(qid, answer, seconds=None, asked=None):
    """Score one answer out of 100 with fixed rules (the same answer always gets
    the same score). The AI never changes the score.

    Out of 100: on topic 25, content 30 (a story for "tell me about a time"
    questions), length 15, specific detail 15, your own part 10, delivery 5.
    Then caps: a refusal ("I don't know") is at most 5, swearing at most 20,
    a negative attitude (blaming others, "it was boring") at most 25, a very
    short answer at most 10 + its word count, no example at most 30.
    On the last question (asking the interviewer something), a question you
    shouldn't ask in an interview scores 0 - see _review_close."""
    q = _find_question(qid)
    if q is None:
        return None
    text = " ".join((answer or "").split())
    low = text.lower()
    words = re.findall(r"[a-zA-Z0-9']+", text)
    n = len(words)

    if n == 0:
        return {
            "id": qid, "question": q["text"], "focus": q["focus"], "answer": "", "words": 0,
            "score": 0, "strengths": [],
            "tips": ["You didn't give an answer to this one. Even a short answer is better than none - "
                     "it's fine to say 'Can I take a moment to think?'"],
            "pace": None, "warning": None,
        }

    if qid == "close":
        return _review_close(q, qid, text, low, n, seconds)
    if qid == "cv" and asked:
        q = {**q, "keywords": _cv_keywords(asked)}

    strengths, tips, caps = [], [], []
    score = 0
    lo, hi = 60, 260

    # Warnings first: these matter more than anything else in the answer.
    warning = None
    if _SWEAR.search(low):
        warning = "Never swear in an interview, even casually. It's one of the quickest ways to lose a place."
        caps.append(20)
    elif n <= 30 and _REFUSAL.search(low):
        if q["star"]:
            warning = ("Saying you don't have an example, or that nothing goes wrong, makes it look like you haven't "
                       "thought about it. Always give a real example - it can be from school, college, a job, a hobby or home.")
        else:
            warning = ("Saying you're not sure or don't know makes it look like you haven't thought about it. Before an "
                       "interview, plan a few points for questions like this, even short ones.")
        caps.append(5)
    elif _MONEY.search(low):
        warning = ("Saying you're only doing it for the money is a red flag for interviewers. Talk about what you want "
                   "to learn or do instead.")
        caps.append(20)
    elif _NEGATIVE.search(low):
        warning = ("Try not to blame other people or sound negative. Interviewers want to hear what you did and "
                   "what you learned, not who was to blame.")
        caps.append(25)
    if warning:
        tips.append(warning)

    # 1. On topic (25): how many of the question's key words you used
    hits = sum(1 for k in set(q["keywords"]) if _count_phrases(low, [k]))
    if hits == 0 and len(_content_words(q["text"]) & _content_words(low)) >= 2:
        hits = 1  # uses the question's own words, so it's at least partly on topic
    if hits >= 3:
        score += 25
        strengths.append("You answered the question that was asked.")
    elif hits == 2:
        score += 18
    elif hits == 1:
        score += 10
        tips.append(f"Make sure you answer the question directly. This one was about: {q['focus'].lower()}.")
    else:
        tips.append(f"Make sure you answer the question directly. This one was about: {q['focus'].lower()}.")
        caps.append(30)

    # 2. Length (15)
    if n < lo * 0.6:
        tips.append(f"This answer was very short ({n} words). Aim for about {lo}-{hi} words "
                    "so you have time to give an example.")
        caps.append(min(35, 10 + n))
    elif n < lo:
        score += 7
        tips.append(f"Try to say a little more ({n} words). Add one more detail about what you did.")
        caps.append(65)
    elif n <= hi:
        score += 15
        strengths.append("A good length - enough detail without going on too long.")
    else:
        score += 10
        tips.append(f"This answer was quite long ({n} words). Try to keep to the main points - "
                    "about 1 to 2 minutes when spoken.")

    # 3. Content (30)
    i_count = _count_phrases(low, ["i", "i'm", "i've", "i'd", "my", "me"])
    we_count = _count_phrases(low, ["we", "we're", "we've", "our", "us"])
    if q["star"]:
        has_s = _count_phrases(low, SITUATION) > 0
        has_a = _count_phrases(low, ACTION) > 0 or bool(_I_DID.search(low))
        has_r = _count_phrases(low, RESULT) > 0 or bool(_IT_WORKED.search(low))
        score += 8 * has_s + 12 * has_a + 10 * has_r
        parts = has_s + has_a + has_r
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
            caps.append({0: 30, 1: 50, 2: 75}[parts])
    else:
        has_reason = bool(_REASON.search(low))
        has_example = bool(_EXAMPLE.search(low))
        has_detail = bool(_PERSONAL.search(low)) if qid == "intro" else bool(_STEPS.search(low))
        score += 10 * has_reason + 10 * has_example + 10 * has_detail
        if has_reason and has_example:
            strengths.append("You gave a reason and backed it up with an example.")
        if not has_reason:
            tips.append("Say why, for example 'because I enjoy...' or 'so that...'. Reasons make an answer convincing.")
        if not has_example:
            tips.append("Add an example from something you've really done, like a project, a job or a hobby.")
        if has_reason + has_example + has_detail == 0:
            caps.append(30)

    # 4. Specific detail (15): numbers, times, how many people
    specifics = len(re.findall(r"\d+", text)) + _count_phrases(low, _SPECIFIC_WORDS)
    if specifics >= 2:
        score += 15
        strengths.append("You used specific details, like numbers or times, which makes it believable.")
    elif specifics == 1:
        score += 9
        tips.append("Add one or two more specific details, such as how many people, how long it took, or a result in numbers.")
    else:
        score += 0 if q["star"] else 4
        tips.append("Make it specific: how many people, how long, what changed? Numbers stick in people's minds.")

    # 5. Your own part (10)
    if q["star"]:
        if i_count == 0:
            tips.append("You said 'we' more than 'I'. Interviewers want to hear what YOU did - "
                        "say 'I' for your own actions.")
        elif i_count >= we_count or i_count >= 4:
            score += 10
            if we_count:
                strengths.append("You were clear about your own part, not just the group's.")
        else:
            score += 3
            tips.append("You said 'we' more than 'I'. Interviewers want to hear what YOU did - "
                        "say 'I' for your own actions.")
    else:
        score += 10 if i_count else 3

    # 6. Delivery (5): filler words, only once there's enough to judge
    low_f = re.sub(r"\b(look|looks|would|i'd|feel|feels|sound|sounds|seem|seems|just) like\b", r"\1", low)
    fillers = _count_phrases(low_f, FILLERS)
    rate = fillers / max(n, 1)
    if n >= lo * 0.6:
        if rate <= 0.02:
            score += 5
        elif rate <= 0.05:
            score += 3
            tips.append(f"You used filler words like 'um' or 'like' {fillers} times. A short pause sounds more confident.")
        else:
            tips.append(f"Lots of filler words ({fillers}). Slow down and take a breath instead of saying 'um' or 'like'.")

    pace = _pace(n, seconds, tips, strengths)
    if caps:
        score = min(score, min(caps))
    if warning:
        strengths = []
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
        "warning": warning,
    }


def _pace(n, seconds, tips, strengths):
    """Speaking pace (only if spoken and timed). Advice only, not scored."""
    if not (seconds and seconds > 5 and n > 10):
        return None
    wpm = round(n / (seconds / 60))
    if wpm > 180:
        tips.append(f"You spoke quite fast (about {wpm} words a minute). Slowing down a little helps people follow you.")
    elif wpm < 90:
        tips.append(f"You spoke quite slowly (about {wpm} words a minute). Practising the answer out loud will help it flow.")
    else:
        strengths.append(f"A good speaking pace (about {wpm} words a minute).")
    return wpm


def _review_close(q, qid, text, low, n, seconds):
    """The last question: the student asks the interviewer something.
    A question you shouldn't ask in an interview scores 0, with the reason why."""
    strengths, tips = [], []
    warning = None
    if _SWEAR.search(low):
        warning = "Never swear in an interview, even casually. It's one of the quickest ways to lose a place."
    else:
        for rx, why in _CLOSE_FLAGS:
            if rx.search(low):
                warning = why
                break

    asked = "?" in text or bool(_ASKS.search(low))
    declined = not asked and bool(_DECLINE.search(low))

    if warning:
        score = 0
        tips.append(warning)
        tips.append("Good questions to ask instead: 'What would a typical day look like?', "
                    "'What training would I get?' or 'What do the best students on this placement do well?'")
    elif declined:
        score = 10
        tips.append("Always have a question ready, e.g. 'What does a typical day look like?' "
                    "or 'What training would I get?'")
    elif not asked:
        score = 20
        tips.append("This is your chance to ask the interviewer something. Always have a question ready, e.g. "
                    "'What does a typical day look like?' or 'What training would I get?'")
    else:
        score = 45
        strengths.append("You asked a question - this shows you're interested in the role.")
        if _GOOD_CLOSE.search(low):
            score += 30
            strengths.append("A thoughtful question about the work, the training or how to do well.")
        else:
            tips.append("Ask something that shows you've thought about the role, like 'What training would I get?' "
                        "or 'What would a typical day look like?'")
        if _ROLE_LINK.search(low):
            score += 15
            strengths.append("You linked your question to this placement.")
        else:
            tips.append("Link your question to this placement or to Amazon, so it's clear you've thought about the role.")
        if 6 <= n <= 60:
            score += 10
        elif n > 60:
            score += 5
            tips.append("Keep your question short and clear - one or two questions is plenty.")
    pace = _pace(n, seconds, tips, strengths)
    return {
        "id": qid, "question": q["text"], "focus": q["focus"], "answer": text, "words": n,
        "score": max(0, min(100, score)), "strengths": [] if warning else strengths[:3], "tips": tips[:3],
        "pace": pace, "warning": warning,
    }


# ---------- Things that pull a score down ----------
_SWEAR = re.compile(r"\b(fuck\w*|f\*+k\w*|shit\w*|bullshit|crap|bollocks|bastard\w*|twat\w*|wank\w*|piss(ed)?|"
                    r"arse|dickhead|bitch\w*|damn)\b")
# "I don't know", "I've never worked in a team", "nothing goes wrong"
_REFUSAL = re.compile(
    r"\b(i don'?t know|dunno|idk|no idea|not sure|can'?t think of (one|any|anything)|i don'?t have (one|any|an example)|"
    r"i'?ve never (really )?(done|had|worked|been|made|built|fixed|organised|organized|helped|created)|"
    r"nothing (ever )?(really )?(goes|went|has gone) wrong|never (really )?(goes|went) wrong|i don'?t make mistakes|"
    r"i have never (really )?(done|had|worked|been|made))\b")
# Blaming others, sounding negative or only in it for the money
_NEGATIVE = re.compile(
    r"\b(useless|lazy|annoying|stupid|idiots?|rubbish|boring|i hate|hated|can'?t be bothered|i don'?t care|"
    r"(was|were) (their|his|her|the teacher'?s|everyone else'?s) fault|(their|his|her) fault|"
    r"nothing i could (do|have done)|not my fault|copied|cheated|cheat)\b")
_MONEY = re.compile(r"\b(just (want|wanted|need) (the )?money|only (want|wanted|doing it|doing this|here) (for|because of) the money|"
                    r"(just|only) for the money|in it for the money)\b")
_I_DID = re.compile(r"\bi (\w+ed|made|did|took|went|led|ran|built|wrote|set|got|told|gave|kept|found|began|spoke|"
                    r"taught|chose|drew|bought|brought|caught|met|put|said|sent|stayed|won|sorted|split|stuck)\b")
_IT_WORKED = re.compile(r"\b(it|that|this) (worked|helped|paid off)\b|\bwe (won|finished|passed|got|managed)\b")
_SPECIFIC_WORDS = ["minutes", "hours", "days", "weeks", "months", "year", "years", "percent", "%", "people",
                   "pounds", "£", "a week", "a month", "a day", "two", "three", "four", "five", "six", "seven",
                   "eight", "nine", "ten", "twenty", "hundred", "half", "first", "second", "third"]
_REASON = re.compile(r"\b(because|so that|so i can|that'?s why|which is why|the reason|i want to|i'?d like to|"
                     r"i would like to|interested in|i'?m keen|i enjoy|i love|passion|it means|this means|that way)\b")
_EXAMPLE = re.compile(r"\b(for example|for instance|such as|like when|one time|once|last year|at school|at college|"
                      r"in year|when i|i have|i'?ve|i built|i made|i worked|i helped|i did|i used|i was)\b")
_PERSONAL = re.compile(r"\b(i'?m|i am|my name|studying|years? old|\d\d|college|school|course|hobby|hobbies|in my spare time)\b")
_STEPS = re.compile(r"\b(first|firstly|then|after that|next|finally|step|steps|i would|i'?d|i always|i make sure|"
                    r"i check|i start|start by|by)\b")

# ---------- The last question: what you ask the interviewer ----------
# Questions you shouldn't ask in an interview score 0. Each comes with the reason.
_CLOSE_FLAGS = [
    (re.compile(r"\b(how old are you|are you (single|married)|do you have (a )?(girlfriend|boyfriend|wife|husband|partner|kids|children)|"
                r"where do you live|what'?s your (number|address|instagram|snapchat)|how much do you (earn|make|get paid)|"
                r"can i (have|get) your (number|instagram|snapchat))\b"),
     "Personal questions about the interviewer aren't appropriate in an interview. Keep your questions about the role, "
     "the team or the training."),
    (re.compile(r"\b(did i (get|pass|do (ok|okay|well|good))|how did i do|have i got (the|this|it)|am i (hired|in|through)|"
                r"do i get the (job|place|placement)|did i get it)\b"),
     "Asking if you got the job puts the interviewer on the spot - they can't tell you yet. Ask about the next steps "
     "instead, like 'What happens after today?'"),
    (re.compile(r"\b(pay|paid|salary|salaries|wage|wages|money|bonus|bonuses|earn|earnings)\b|"
                r"\bhow much (do|will|would|can) (i|we|you|they) (get|make)\b"),
     "Asking about pay as your question can make it look like money is all you care about. Ask about the role or the "
     "training instead, and save pay for later, once you've been offered a place."),
    (re.compile(r"\b(holidays?|days? off|time off|annual leave|sick days?|leave early|finish early|go home early|"
                r"how many breaks|long (are|is) the breaks?|lunch break|work from home|wfh|lie in|how late can i|"
                r"do i (have|need) to (work|come in|do)|can i skip|how little|least amount)\b"),
     "Asking about time off, leaving early or doing less can make it sound like you don't want to be there. Ask about "
     "the work itself instead."),
    (re.compile(r"\bwhat (does|do) (amazon|you|the company)( actually| even| really)? (do|sell)\b|"
                r"\bwhat('?s| is) amazon( actually| even)?[?.!\s]*$|\bwho (is|are) amazon\b"),
     "Asking what the company does shows you haven't looked it up. Always read about the company before an interview."),
]
_ASKS = re.compile(r"^(what|how|why|who|where|when|which|is|are|do|does|did|can|could|would|will|should)\b|"
                   r"\b(i was wondering|i'?d like to know|i would like to know|could you tell me|can you tell me)\b")
_DECLINE = re.compile(r"^(no|nope|nah|not really|i'?m good|i am good|i think i'?m (good|ok|okay|fine)|that'?s all|"
                      r"nothing|all good)\b|\bno questions\b|\bi don'?t have any( more)? questions\b|\bnothing (else|really)\b")
_GOOD_CLOSE = re.compile(r"\b(train|training|learn|learning|mentor|buddy|support|typical day|day look like|day to day|"
                         r"day-to-day|team|progress|progression|career|next steps?|what happens (next|after)|skills?|"
                         r"success|successful|do well|best students|challenge|challenging|hardest|projects?|feedback|"
                         r"culture|improve|develop|responsibilit\w*|work on|after the placement|apprenticeship after)\b")
_ROLE_LINK = re.compile(r"\b(amazon|placement|this role|the role|this job|t ?levels?|apprentice\w*|digital|business|"
                        r"media|finance|engineering|my mentor|the team|first (few )?(weeks|days|months?)|here)\b")


# Talking over the interviewer while they speak (picked up in the practice call).
INTERRUPT_PENALTY = 10   # points off each time
INTERRUPT_MAX = 30       # most that can come off one answer


def review_answer(qid, answer, seconds=None, interruptions=0, asked=None):
    """Score one answer (see _review_core), then take points off for each time
    the student talked over the interviewer during this question."""
    review = _review_core(qid, answer, seconds, asked)
    if review is None:
        return None
    try:
        n = max(0, min(10, int(interruptions or 0)))
    except (TypeError, ValueError):
        n = 0
    base = review["score"]
    penalty = min(INTERRUPT_MAX, INTERRUPT_PENALTY * n)
    review.update({"interruptions": n, "baseScore": base, "interruptPenalty": penalty if n else 0})
    if n:
        review["score"] = max(0, base - penalty)
        times = "once" if n == 1 else "twice" if n == 2 else f"{n} times"
        tip = (f"You talked over Alex {times} while he was speaking. In a real interview, let the interviewer "
               "finish before you start - it shows you're listening.")
        warning = review.get("warning")
        rest = [t for t in review["tips"] if t != warning]
        review["tips"] = ([warning] if warning else []) + [tip] + rest[:2]
        review["tips"] = review["tips"][:3]
    return review


def review_interview(answers):
    """answers: list of {id, answer, seconds}. Returns per-question reviews and a summary."""
    reviews = []
    for a in answers:
        r = review_answer(str(a.get("id") or ""), str(a.get("answer") or ""), a.get("seconds"), a.get("interruptions"),
                          a.get("asked"))
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
            if t.startswith("Good questions to ask instead"):
                continue  # a helper line under a warning, not a separate thing to work on
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
    ("You talked over", "let me finish before you start talking. It shows you're listening."),
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
    ("This is your chance to ask", "have a question ready, like what a typical day looks like."),
    ("Ask something that shows", "ask about the role itself, like what training you'd get."),
    ("Link your question", "link your question to this placement, so it's clear you've thought about it."),
    ("Say why", "say why, for example because you enjoy it."),
    ("Add an example", "add an example from something you've really done."),
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
        # ("I like pizza" keeps it: after I / you / we / they / really / don't it's a real word)
        if lw == "like" and not (words and words[-1].lower() in (
                "look", "looks", "would", "i'd", "feel", "feels", "sound", "sounds", "seem", "seems",
                "i", "you", "we", "they", "really", "don't", "didn't", "do", "would", "also", "still", "just")):
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


def _warning_feedback(review):
    """Something you shouldn't say in an interview: Alex says so plainly."""
    w = review["warning"]
    if review["id"] == "close":
        better = "" if "'" in w else " A better question would be, what would a typical day look like for me?"
        return f"Hmm, I'd steer clear of that one in a real interview. {w}{better}"
    return f"Thanks. One important thing first. {w}"


def spoken_feedback(review, reflect_on=None):
    """What Alex says straight after an answer: react, repeat back, then one tip.

    reflect_on: text to repeat back. None = the whole answer. "" = don't repeat
    anything back (Alex already did that before asking his follow-up)."""
    if review.get("warning"):
        return _warning_feedback(review)
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
        # A good question: say it back. A weak one: say what would make it better.
        return reflection if review["score"] >= 60 else base
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
            # Already named one time ("Last year I broke my phone...")? Then ask for more of it.
            if _count_phrases(low, SITUATION) > 0:
                return {"text": "Tell me a bit more about that. What did you do yourself, and how did it turn out?",
                        "why": "Your answer was quite short, so Alex asked for more detail."}
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


_FILLER_START = re.compile(r"^(?:(?:sorry|so|um+|uh+|erm?|okay|ok|right|wait|alex|peccy|hang on|hmm+)[,.!]?\s+)+")
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
# "I don't know what to say" is asking for help, even when it's a longer sentence.
_STUCK_ASK = re.compile(r"\b(what to say|how to answer|where to start|what to talk about|can'?t think of (anything|one|an example))\b")
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


def answer_question(text, pathway=None, practice=True):
    """Alex's answer to a question about T Levels or placements, or None.
    practice=False skips the "this is a practice interview" answer."""
    low = text.lower()
    for rx, reply in _FAQ:
        if rx.search(low):
            if reply == "ROLE":
                if not practice:
                    continue
                return _role_reply(pathway)
            return reply
    return None


def safety_concern(text):
    """True if someone says they are being hurt, are unsafe or very upset."""
    return bool(_SAFETY.search((text or "").lower()))


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
    # A short "I don't know" (or "I don't know what to say") gets help. Anything
    # longer, like "Not sure really, it just seems fine", is a (weak) answer.
    if _STUCK.search(low) and not answerish and (n <= 6 or (n <= 14 and _STUCK_ASK.search(low))):
        hint = (" Your example can come from school, college, a part-time job, a hobby or home."
                if q and q["star"] else " There's no wrong answer, so just say what you think.")
        return {"type": "stuck", "say": "That's okay, it happens in real interviews too. Take a moment to think."
                + hint + " Go ahead when you're ready."}
    if context == "feedback" and n <= 6 and _SMALL_TALK.match(low) and re.search(
            r"\b(thank|thanks|thankyou|ta|cheers|ok|okay|cool|great|brilliant|got it|alright|nice|perfect)\b", low):
        thanks = re.search(r"\b(thank|thanks|thankyou|ta|cheers)\b", low)
        return {"type": "other", "fixed": True,
                "say": ("You're welcome. " if thanks else "Great. ")
                + "Say next when you're ready to move on, or try again to have another go."}
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


# ---------- A question about the student's CV (no AI) ----------
_CV_VERBS = {"led", "built", "made", "created", "organised", "organized", "helped", "trained", "managed", "raised",
             "designed", "improved", "ran", "started", "set", "served", "won", "planned", "coded", "developed",
             "taught", "supported", "volunteered", "worked", "handled", "fixed", "tested", "wrote", "presented",
             "coached", "cut", "sold", "delivered", "launched", "completed", "achieved"}


def cv_question(cv_text):
    """Pick one thing the student did from their CV and ask about it, or None."""
    best, best_score = None, 0
    for raw in (cv_text or "").splitlines():
        line = re.sub(r"^[\s\-\u2022*\u00b7\d.)]+", "", raw).strip().rstrip(".;,")
        words = line.split()
        if not 5 <= len(words) <= 26:
            continue
        low = [w.lower().strip(",.()") for w in words]
        if re.search(r"@|https?://|www\.|\d{5,}", line):  # contact details, not experience
            continue
        verb = next((i for i, w in enumerate(low[:4]) if w in _CV_VERBS), None)
        if verb is None:
            continue
        score = 2 + (2 if re.search(r"\d", line) else 0) + (1 if len(words) >= 8 else 0)
        if score > best_score:
            best, best_score = " ".join(words[verb:verb + 16]), score
    if not best:
        return None
    thing = best[0].lower() + best[1:]
    return (f"On your CV you say you {thing}. Tell me about that. "
            "What did you do yourself, and how did it turn out?")


# ---------- Ask Launchpad (the help assistant, no AI) ----------
# What each part of Launchpad is for, in plain words. The AI version gets the
# same list, so it only talks about things that are really on the site.
SITE_HOWTO = [
    (r"\bquiz\b|which pathway|what pathway|suits? me|best for me",
     "The career quiz asks a few quick questions and suggests the pathway that fits you best. "
     "It only shows your result once you have finished."),
    (r"interview|practi[cs]e",
     "Interview practice is a practice video call with Alex, a virtual interviewer. You answer five questions "
     "out loud or by typing, and get feedback after each answer."),
    (r"coffee|chat with|talk to (a|an|someone)|alumni|alum",
     "A coffee chat is a relaxed talk of about 15 minutes with a T Level student, a placement alum or an "
     "Amazon buddy. You can request one on the Coffee chats page."),
    (r"\bcv\b|resume|curriculum vitae",
     "Upload your CV on My profile to get a score out of 100 and tips to improve it."),
    (r"logbook|log book|my goals|learning goals",
     "My logbook lets you set your learning goals, add an entry each week of your placement and save it as "
     "a PDF for your review meetings."),
    (r"question board|community|other students",
     "On the question board you can ask a question for other students and the Launchpad team to answer. "
     "Every post is checked by the team before it appears."),
    (r"track|tracker|my applications",
     "The Applications tab on My profile shows every opportunity you have saved or applied for, with the "
     "stage you have reached."),
    (r"accessib|text size|bigger text|read (it |this |the page )?aloud|contrast|dark mode|colour.?blind",
     "Use the accessibility button in the top bar to change the text size, turn on high contrast, reduce "
     "motion or have the page read aloud."),
    (r"privacy|my data|delete my|download my",
     "You can download your data or delete your account in Settings, under Privacy and data."),
    (r"parent|carer|my child|my son|my daughter",
     "There is a page for parents and carers that explains T Levels, placements and how students are "
     "kept safe."),
    (r"\bsafe\b|safety|safeguard|worried",
     "The Staying safe page explains how coffee chats work, what never to share online and who to talk "
     "to if something worries you."),
    (r"sign ?up|create an account|account|log ?in|sign ?in",
     "Creating an account is free. It lets you save opportunities, track your applications, keep your CV "
     "and see your practice scores."),
]
_SITE_HOWTO = [(re.compile(p), a) for p, a in SITE_HOWTO]


def site_facts():
    """The facts the help assistant knows: what's on the site, then T Level facts."""
    return [a for _, a in SITE_HOWTO] + faq_facts()


def assistant_reply(text):
    """The help assistant's answer without AI, or None if it doesn't know."""
    low = _FILLER_START.sub("", " ".join((text or "").lower().split()))
    if not low:
        return None
    if safety_concern(low):
        return SAFEGUARD_REPLY
    for rx, reply in _SITE_HOWTO:
        if rx.search(low):
            return reply
    return answer_question(low, practice=False)


# ---------- Small talk ("thanks", "hi", "ok") ----------
# Answered with fixed words, so the AI never turns "thanks" into a random fact.
_SMALL_TALK = re.compile(
    r"^(?:(?:thanks|thank you|thank u|thankyou|ta|cheers|nice one|ok|okay|cool|great|brilliant|perfect|nice|"
    r"got it|alright|all right|fine|hi|hiya|hello|hey|bye|goodbye|see you|see ya|good morning|good afternoon|"
    r"yes|yeah|yep|no|nope|nah|sure|lol|wow)(?:\s+(?:so much|very much|a lot|loads|mate|alex|peccy|again|then|for that|"
    r"for the help|for your help|you))*[\s.!,]*)+$")


def small_talk_reply(text):
    """A short friendly reply to small talk in the help chat, or None if it's a real question."""
    low = " ".join((text or "").lower().split()).strip(" .!?,")
    if not low or not _SMALL_TALK.match(low):
        return None
    if re.search(r"\b(thank|thanks|thankyou|ta|cheers|nice one)\b", low):
        return "You're welcome! Is there anything else you'd like to know?"
    if re.search(r"\b(bye|goodbye|see you|see ya)\b", low):
        return "Bye for now, and good luck!"
    if re.search(r"\b(hi|hiya|hello|hey|good morning|good afternoon)\b", low):
        return "Hi! Ask me anything about T Levels, placements or how to use Launchpad."
    if re.search(r"\b(yes|yeah|yep|sure)\b", low):
        return "Great. What would you like to know?"
    if re.search(r"\b(no|nope|nah)\b", low):
        return "No problem. I'm here if you need me."
    return "Great. Is there anything else I can help with?"


def maybe_to_alex(utterance):
    """Could this be the student talking TO Alex rather than answering?
    Long answers never are, so only short ones get a second look from the AI."""
    raw = " ".join((utterance or "").split())
    low = _FILLER_START.sub("", raw.lower()).strip()
    n = len(re.findall(r"[a-z0-9']+", low))
    if n == 0 or n > 25:
        return False
    return bool(raw.endswith("?") or _QSTART.search(low) or _CLARIFY.search(low) or _STUCK.search(low)
                or _SKIP.search(low) or _REPEAT.search(low)
                or re.search(r"\b(alex|peccy|can you|could you|do you|would you|are you)\b", low))
