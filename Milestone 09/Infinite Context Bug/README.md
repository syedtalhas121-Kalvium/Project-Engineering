# SupportBot — Context Window Challenge

## What This Is
SupportBot is a working AI customer support chatbot. It has multi-turn conversations and gives sensible answers. However, it also has a bug that makes it increasingly expensive with every message in a session. Your job is to find the bug, measure it, fix it, and prove the fix with real token count data.

## Getting Started
```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm start
# Server runs on http://localhost:3000
```

### Local Mock Demo

When an Anthropic key is unavailable, run the demo provider explicitly with `MOCK_ANTHROPIC=true npm start`. This mode is deterministic and intended for local verification only; production uses the Anthropic API by default and logs `response.usage.input_tokens` on every request.

## Running the 15-Message Test
```bash
# In one terminal: npm start
# In another terminal: node test-conversation.js
```

## Context Policy

The chat handler keeps a sliding window of the last **10 messages** with `session.history.slice(-CONTEXT_WINDOW_SIZE)`. The system prompt is passed separately to Anthropic, so it is never evicted. This bounds prompt growth for long-running conversations while intentionally allowing the earliest context to fall out after the window fills. See [`TOKEN_LOG.md`](./TOKEN_LOG.md) for the before/after evidence and cost arithmetic.

## Endpoints
- `POST /chat` — body: `{ message: string, sessionId: string }` → `{ reply: string, turn: number }`
- `DELETE /chat/:sessionId` — clears session history
- `GET /health` — health check

## Your Task
1. **Explore the Code**: Read every file. Understand how the chat handler maintains state and interacts with the Anthropic API.
2. **Add Token Logging**: Modify `index.js` to capture and log `input_tokens` from the Anthropic response object on every API call.
3. **Capture Baseline Data**: Run `test-conversation.js` and record the `input_tokens` at turns 1, 5, 10, and 15 in a new file called `TOKEN_LOG.md`. **Commit TOKEN_LOG.md before touching any other code.**
4. **Identify and Fix the Bug**: Find the line of code causing unbounded context growth. Fix it by implementing a sliding window (e.g., only keeping the last 5-10 messages).
5. **Verify the Fix**: Run the test again and add the post-fix token counts to `TOKEN_LOG.md`.
6. **Calculate Cost Savings**: Add a cost comparison for 1,000 users × 15 messages × 30 days to `TOKEN_LOG.md`. You must show your arithmetic and provide a final dollar figure.
7. **Deploy**: Deploy your fixed application to a live URL.

## Rules
- `TOKEN_LOG.md` must be committed before any code changes.
- All work must be on a branch named `fix/context-window`.
- The application must remain fully functional after the fix.
- Cost comparison must show visible arithmetic.
- Deploy to a live URL before final submission.

## Deployment

The application listens on `process.env.PORT || 3000` and serves the chat UI and API from the same Node process. Configure `ANTHROPIC_API_KEY` in the deployment environment; do not commit `.env`. The included mock mode is not a substitute for production credentials or live usage measurement.

**Live demo:** [SupportBot mock-mode deployment](https://4173-ie4serbw6pnilgja75ece-da89755d.sg1.manus.computer) (temporary sandbox URL; uses the explicit local mock provider because no Anthropic key was available).

## Submission
Submit your PR link and a 3–5 minute video demonstration of your process and results.
