# Pathwise AI Learning Demo

Pathwise turns a PDF or PPTX into a study plan and five-question quiz. It also
includes a guided coding workspace, a scenario challenge, and mock interviews
that can use the learner's practice decisions.

## Set up Supabase

1. Create a Supabase project. In **SQL Editor**, run these migrations once,
   in filename order: [202611100001_pathwise.sql](supabase/migrations/202611100001_pathwise.sql)
   and [202611120001_fun_practice_progress.sql](supabase/migrations/202611120001_fun_practice_progress.sql).
   They create the progress table, per-account AI quota, private course-file
   storage, and the progress key used by Fun Practice.
2. Enable the Email provider. For self-service registration, enable **Allow new
   users to sign up** and keep **Confirm Email** enabled. In **Authentication →
   URL Configuration**, add the local app URL (typically `http://localhost:5173/`)
   to **Redirect URLs**. After deploying, set **Site URL** to your Vercel app URL
   and allow that URL for redirects as well. Configure custom SMTP to send
   confirmation emails to students outside your Supabase team.
   For immediate testing, you can also create an email/password user in
   **Authentication → Users** with the email already confirmed.
3. Copy the project URL and the **Publishable** API key from the project dashboard.
   The publishable key starts with `sb_publishable_`.

## Run locally

With Node.js 24 and pnpm, run these commands from the repository root.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Fill in `.env.local` before starting Vite. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` to your project values. Choose one AI provider.

| Provider | Variables |
| --- | --- |
| DeepSeek | `AI_PROVIDER=deepseek`, `DEEPSEEK_API_KEY` |
| OpenRouter | `AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, optionally `OPENROUTER_MODEL` |

OpenRouter defaults to `deepseek/deepseek-v4.1-flash`. A replacement model must
support image inputs and JSON output to cover the full application. The AI key
stays in the server environment. Keep it out of Git and variables prefixed with
`VITE_`. Restart Vite after editing the environment file. The dev server
serves the same `/api/ai` handler used by Vercel.

Open the URL printed by Vite and sign in before uploading course material.
New learners can choose **Sign in → Create an account** and follow the
confirmation email if required. Upload a PDF or PPTX, or choose **Load sample**.
Review the extracted text and select **Recognize images on this page** when
needed, then generate a study kit. Account settings show sync status and offer
an explicit **Copy guest progress** action for records without a cloud version.

Open **Fun Practice** to try twelve offline role-play stories presented as
three study group chats. The collection covers cache freshness, asynchronous
responses, atomic transactions, and credential storage. Learners can quote a
doubtful claim, nudge the AI, reply in the group, and resolve team incidents as
group polls. Signed-in learners can generate an AI conversation from an
objective in the current study pack. Every explanation produces a new targeted
follow-up, and completed or partially completed sessions are saved with the
learner's other progress.
Use the **EN / 中文** switch in the top bar to change the interface language.
The preference is stored on the current device. Course material and AI-generated
study content keep their source language.

## Deploy to Vercel

1. Import the GitHub repository in Vercel. Use the directory containing
   `package.json`, `api/`, and `vercel.json` as the Root Directory.
2. In the project settings, select Node.js 24.x. The checked-in configuration
   uses the Vite framework, `pnpm build`, and the `dist` output directory.
3. Add the same Supabase variables and the chosen provider's variables to
   **Settings → Environment Variables**. Set them for Production and also
   Preview if needed. Add the provider's key as a sensitive variable.
4. Deploy after saving the variables so the client bundle and server function
   both receive the configuration. Sign in to the deployed site and generate
   a study kit to verify the connection.

## Practice and limits

- **Virtual Workspace** and **Try scenario challenge** support guest practice.
  After a completed task, **Practice task interview** uses the recorded decisions.
  Demo interviews use local follow-ups. Live interviews require sign-in.
- Signed-in progress is stored by account. The original course file is saved
  privately after successful study kit generation and is downloadable from
  **Progress**. A conflict in a progress record offers a choice of versions.
- PDFs and PPTX files are limited to 10 MB and 50 pages or slides, with up to
  30,000 reviewed text characters per study kit. PDF pages with images or no
  text layer can be recognized from a page preview. PPTX recognition uses
  embedded JPEG, PNG, GIF, and WebP images.
- The AI endpoint allows 60 requests per account per UTC day. Large sets of
  images are sent in batches, and each batch uses one request.

Run `pnpm test` for automated tests and `pnpm build` for the production build.
