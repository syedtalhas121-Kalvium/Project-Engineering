# TOKEN_LOG.md

## Measurement Note

These measurements are a **local deterministic mock**, not live Anthropic API usage. The sandbox did not have an `ANTHROPIC_API_KEY`, so the harness serializes the system prompt and request messages and uses `ceil(serialized characters / 4)` as a reproducible stand-in for `response.usage.input_tokens`. The production handler still logs the real `response.usage.input_tokens` value whenever it is connected to Anthropic. The mock uses the repository’s existing 15-message conversation for both runs and keeps output tokens fixed at 24 so the input-context effect is isolated.

## Before Fix — Full History Sent Every Call

The starter sent `messages: [...session.history]`, so each request included all user and assistant messages accumulated so far.

| Turn | input_tokens | output_tokens | total_tokens |
|------|-------------:|--------------:|-------------:|
| 1 | 97 | 24 | 121 |
| 5 | 313 | 24 | 337 |
| 10 | 579 | 24 | 603 |
| 15 | 852 | 24 | 876 |

Growth: **+755 mock input tokens** from turn 1 to turn 15 (**8.8×** the turn-1 input context).

## After Fix — Sliding Window (last 10 messages)

The fixed handler sends `session.history.slice(-CONTEXT_WINDOW_SIZE)` with `CONTEXT_WINDOW_SIZE = 10`. The separate `system` parameter remains outside the window and is therefore preserved on every request.

| Turn | input_tokens | output_tokens | total_tokens |
|------|-------------:|--------------:|-------------:|
| 1 | 97 | 24 | 121 |
| 5 | 313 | 24 | 337 |
| 10 | 345 | 24 | 369 |
| 15 | 352 | 24 | 376 |

Growth after the window is full: **+7 mock input tokens** from turn 10 to turn 15, demonstrating bounded context rather than unbounded growth.

## Cost Comparison — 1,000 Users × 15 Messages × 30 Days

**Model:** `claude-haiku-4-5-20251001`  
**Input price:** **$1.00 per million tokens**, based on Anthropic’s official Haiku 4.5 pricing.[1]

The average input token count is calculated across all 15 mock turns, not just the checkpoints.

### WITHOUT FIX

- Average input tokens per call: `474.27`
- Total calls: `1,000 × 15 × 30 = 450,000`
- Total input tokens: `450,000 × 474.27 = 213,420,000`
- Monthly cost: `213,420,000 / 1,000,000 × $1.00 = $213.42`

### WITH FIX

- Average input tokens per call: `300.00`
- Total calls: `450,000`
- Total input tokens: `450,000 × 300.00 = 135,000,000`
- Monthly cost: `135,000,000 / 1,000,000 × $1.00 = $135.00`

**MONTHLY SAVING: `$213.42 - $135.00 = $78.42` per 1,000 active users.**

These dollar figures are mock projections and must be replaced with live figures if a real Anthropic key is later used.

## Coherence Verification — Mock Context Membership

A 20-message simulation confirms the intended trade-off. At turn 20, the ten-message window contains the recent messages from turns 15–20, so a reference to the specific detail from message 15 remains available. The first message has fallen out of the window, so a reference to message 1 is intentionally unavailable. This is the documented cost-control trade-off, not a regression.

| Check | Result |
|------|--------|
| Message 15 is preserved at message 20 | PASS — recent context remains in the ten-message window |
| Message 1 is preserved at message 20 | EXPECTED LOSS — earliest context has been evicted |

## References

[1]: https://platform.claude.com/docs/en/about-claude/pricing "Anthropic Claude API Pricing — Claude Haiku 4.5"
