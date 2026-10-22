# Pathwise AI Learning Demo

A browser-only learning demo that turns a text-based PDF into a study plan,
learning objectives, and a five-question quiz using DeepSeek. It also includes
an entry-level software engineering mock interview with one follow-up per
question and a formative learning report.

## Run locally

The Codex desktop environment includes Node and pnpm. From this directory:

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite, then either upload a text-based PDF or choose
**Load sample**. Click **Add DeepSeek key** to enter an API key. The key is kept
only in the current browser tab's `sessionStorage`; learning progress is stored
in `localStorage`.

The **Mock Interview** section supports:

- **Live AI**: DeepSeek generates one contextual follow-up per answer and a
  structured learning report.
- **Demo mode**: a complete offline flow with labeled simulated follow-ups and
  local rubric-based feedback. No API key or network is required.

## Available commands

```bash
pnpm test
pnpm build
pnpm preview
```

## Demo limits

- PDFs must contain selectable text, be no larger than 10 MB, have at most 50
  pages, and extract to no more than 30,000 characters.
- The browser calls DeepSeek directly. This is suitable for a local course demo,
  but a production application should move model requests behind a trusted
  backend and protect the API key.
- Interview feedback is formative practice feedback, not a real hiring decision.
- Login, cloud storage, and the virtual code workspace remain outside this demo.
