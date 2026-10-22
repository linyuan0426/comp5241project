# Pathwise AI Learning Demo

A browser-only learning demo that turns a text-based PDF into a study plan,
learning objectives, and a five-question quiz using DeepSeek.

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
- Login, cloud storage, the virtual code workspace, and the mock interview are
  intentionally outside this first demo.
