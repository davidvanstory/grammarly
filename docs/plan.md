Development Checklist — Personal-Style Grammarly Clone
A step-by-step implementation plan in dependency order. Mark items complete as you finish them.

Phase 1 — Foundation & Core Infrastructure
Goal: establish the skeleton that every later feature relies on.

[ ] Create a private GitHub repository and initialise a Next.js 18 + TypeScript project.
[ ] Commit an ESLint + Prettier config so all contributors share the same lint rules.
[ ] Add a sample page that renders “Hello World” to verify the stack builds locally and on CI.

[ ] Configure Vercel project for automatic preview deployments from main and PR branches.
[ ] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY as encrypted Vercel env vars.

[ ] Add a GitHub Actions pipeline that: lint-checks, type-checks, runs unit tests, and deploys to Vercel on merge.
[ ] Fail the build on any lint or type errors.
[ ] Publish a status badge in the README.

[ ] Implement a central configuration module (lib/config.ts) for runtime keys and constants.
[ ] Accept config via env vars and throw at boot if required keys are missing.

Phase 2 — Supabase Setup
Depends on Phase 1 repository and env vars.

[ ] Provision Supabase project and enable Row-Level Security (RLS).
[ ] Create users, documents, and writing_samples tables with UUID primary keys.
[ ] Write RLS policies so each row is accessible only to its owner.

[ ] Enable Supabase Storage and create a writing-samples bucket with “authenticated read/write” policy.

[ ] Integrate Supabase Auth UI for email + password sign-up, sign-in, and password-reset pages.
[ ] Persist the Supabase session in cookies so SSR requests know the user.

[ ] Implement server-side helper (lib/supabaseServer.ts) that injects the authenticated client into API routes.

Phase 3 — Editor & Core UI
Depends on user authentication (Phase 2) to tie editor state to a user.

[ ] Install TipTap and build a clean, responsive WYSIWYG editor component (components/Editor.tsx).
[ ] Ensure typing, bold/italic, headings, lists, and code blocks work on desktop and mobile.

[ ] Wire autosave: save the editor content to local state every keystroke and write to DB after 5 s or 2 s idle.
[ ] Throttle Supabase writes to one per document per 5 s.

[ ] Add a Grammarly-style right sidebar placeholder that can later host readability, style, and diff panels.

Phase 4 — Backend API Routes for OpenAI
Depends on Phase 1 (serverless API boilerplate) and Phase 3 (editor produces text).

[ ] Create /api/proofread route that accepts raw text and returns JSON issues.
[ ] Use a system prompt instructing the model to reply with [{type,start,end,suggestion}].
[ ] Debounce calls in the frontend to ≥ 500 ms and chunk text at 250 characters.

[ ] Create /api/readability route that calculates average word length, average sentence length, and Flesch RE score.
[ ] Expose a simple GET interface that accepts documentId.

[ ] Cache OpenAI responses in memory for the current session to reduce token spend.

Phase 5 — Inline Grammar & Style Suggestions
Depends on Phase 4 proof-of-concept routes.

[ ] Parse the JSON issues returned by /api/proofread and decorate corresponding ranges in TipTap.
[ ] Display color-coded underlines: red for grammar/spelling, blue for style warnings.

[ ] Add “Accept” and “Reject” buttons in a hover-tooltip; on click, replace text or dismiss annotation.
[ ] Remove the underline once the suggestion is accepted or rejected.

Phase 6 — Readability Analysis Sidebar
Depends on Phase 4 /api/readability.

[ ] Render live metrics in the sidebar and update them every time autosave commits.
[ ] Use simple text + progress bar visuals (no charting library required for v1).

[ ] Set thresholds: green > 60, yellow 30-59, red < 30 for Flesch score, to help users interpret results.

Phase 7 — Personal-Style Adaptation
Depends on Supabase Storage (Phase 2) and Editor UI (Phase 3).

[ ] Build an upload modal that accepts ≥ 300-word plain-text files and stores them encrypted in Supabase Storage.
[ ] Enforce word-count check before enabling “Upload” button.

[ ] Create /api/rewrite route that injects the user’s writing sample as a few-shot example in the OpenAI prompt.
[ ] Return the rewritten passage in streaming chunks to minimise latency.

[ ] Implement a /rewrite slash-command inside the editor that:
1. Detects the current paragraph.
2. Calls /api/rewrite.
3. Shows a two-pane diff view (Before vs After) with “Replace” and “Cancel” actions.

Phase 8 — Document Management
Depends on Supabase tables from Phase 2.

[ ] Create a documents dashboard where users can create, rename, open, and delete docs.
[ ] Use Supabase RPC functions for atomic renames and deletions.

[ ] Implement .txt, .docx, and .pdf (plain-text) import using the mammoth and pdf-parse libraries.
[ ] Strip all formatting during import and insert plain text into a new document.

[ ] Add export options: download as .txt or wrap plain text in a minimal .docx using docx npm package.

Phase 9 — Design & Theming
UI polish after functional pieces work.

[ ] Apply a minimal, distraction-free light theme with Inter (or system font) and generous line-height.
[ ] Add a dark theme using Tailwind’s dark: class toggle tied to the user’s OS preference.
[ ] Ensure TipTap decorations and sidebar components adhere to the color palette in both themes.

Phase 10 — Testing & Quality Assurance
Depends on all previous phases.

[ ] Write unit tests for utility functions (autosave timer, Flesch calculation) with vitest.
[ ] Add integration tests with Playwright that:
[ ] sign up a user,
[ ] create a doc,
[ ] trigger proofreading,
[ ] accept a suggestion,
[ ] verify DB rows were written.

[ ] Perform manual accessibility audit with Lighthouse and fix contrast or keyboard-navigation issues.

Phase 11 — Launch & Post-Launch Monitoring
Final gate before public release.

[ ] Set up Sentry for error monitoring on both client and serverless routes.
[ ] Add Vercel analytics to track daily active users and API-route latency.
[ ] Publish v1 to the production domain and verify sign-up, editing, and rewrite flows end-to-end.

Legend
Items are listed so that no task depends on a later one.

Sub-items are explicit acceptance criteria—mark them complete to close the parent.