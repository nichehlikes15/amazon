# Turning on Alex's AI (interview practice)

Alex can use a language model (LLM) that runs on this computer, through a free
app called **Ollama**. With it on, Alex replies to what you actually said,
writes his own follow-up questions, and writes a short summary at the end.

If Ollama isn't running, nothing breaks: Alex uses the standard rule-based
replies instead. Scores always come from the rules, so the same answer always
gets the same score.

## What you need

- macOS Sonoma (14) or newer. An Apple M-series Mac is best; older Intel Macs work but are slow.
- About 2 GB of free space for the model.

## Set it up (once)

1. Download Ollama from **https://ollama.com/download**, open the file, and drag
   Ollama into your Applications folder.
2. Open the Ollama app. If it asks to add the `ollama` command, say yes.
3. Open Terminal and download the model (about 2 GB):

   ```
   ollama pull llama3.2
   ```

4. Check it works (press Ctrl+D to leave):

   ```
   ollama run llama3.2 "Say hello in one sentence."
   ```

## Every time you use it

1. Make sure the Ollama app is open (it sits in the menu bar).
2. Start the backend as normal:

   ```
   cd backend
   source venv/bin/activate
   python app.py
   ```

3. Open the Interview practice page. Above **Start the call** it should say
   **"Alex's AI is on."** If it says he'll use standard replies, the developer
   note under it says what's wrong.

The first reply can take a few seconds while the model loads. After that it
stays loaded for 30 minutes.

## Settings (optional)

Set these before `python app.py`, for example `OLLAMA_MODEL=gemma4:e2b python app.py`.

| Setting | Default | What it does |
|---|---|---|
| `LAUNCHPAD_AI` | `ollama` | Set to `off` to always use the standard replies (e.g. for a demo with no AI). |
| `OLLAMA_MODEL` | `llama3.2` | Which model to use. Run `ollama pull <name>` first. Bigger models are smarter but slower. |
| `OLLAMA_URL` | `http://localhost:11434` | Where Ollama is running. |
| `OLLAMA_TIMEOUT` | `15` | Seconds to wait for a reply before using the standard reply instead. |

## How it works (for the documentation)

- `interview_coach.py` scores each answer with fixed rules and decides whether
  a follow-up question is needed.
- `llm_coach.py` sends the question, the student's answer and the rule-based
  tips to the model, and asks for a short JSON reply: what Alex says, or his
  follow-up question.
- The reply is cleaned before Alex reads it out: links, symbols and emojis are
  removed, it's cut to a sensible length, and replies that sound broken (e.g.
  "As an AI language model…") are thrown away.
- The student's words are sent inside `<answer>` tags and the model is told
  never to follow instructions inside them (protection against "prompt
  injection").
- The instructions also tell the model to point a student to a trusted adult or
  Childline (0800 1111) if they say they are unsafe.
- Nothing is saved. Ollama runs on the same computer as the backend, so answers
  are not sent to an outside AI company.

## For a live site

Ollama would need to run on the same server as the backend (or set
`OLLAMA_URL` to a private server you control). A small model like `llama3.2`
runs on an ordinary server, but replies are much faster with a GPU.

## Using Amazon Bedrock (the live site)

The live site uses **Amazon Nova 2 Lite** through **Amazon Bedrock** instead of Ollama, so the AI works
without our own computer running.

- The model is called through the `eu.` inference profile, so requests stay in EU AWS Regions.
- Amazon Bedrock doesn't store prompts or replies and doesn't use them to train models.
- Scores still come from the fixed rules, and every reply still goes through the same safety checks.
- If Bedrock doesn't reply (no internet, key expired, too slow), Alex uses the standard replies.

Settings on the server (in `/opt/launchpad/launchpad.env`):

```
LAUNCHPAD_AI=bedrock
AWS_BEARER_TOKEN_BEDROCK=<Bedrock API key>
BEDROCK_REGION=eu-north-1
BEDROCK_MODEL=eu.amazon.nova-2-lite-v1:0
```

The API key belongs to an IAM user that is only allowed to call this one model. Keys expire, so make a
new one in the Bedrock console (API keys) when it runs out, then restart the backend:
`sudo systemctl restart launchpad`.

