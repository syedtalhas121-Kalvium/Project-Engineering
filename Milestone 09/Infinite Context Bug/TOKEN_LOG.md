# TOKEN_LOG.md

## Measurement Note

These measurements are a **local deterministic mock**, not live Anthropic API usage. The sandbox did not have an `ANTHROPIC_API_KEY`, so the harness serializes the system prompt and request messages and uses `ceil(serialized characters / 4)` as a reproducible stand-in for `response.usage.input_tokens`. The production handler still logs the real `response.usage.input_tokens` value whenever it is connected to Anthropic. The mock uses the same 15-message conversation for both runs and keeps output tokens fixed at 24 so the input-context effect is isolated.

## Before Fix — Full History Sent Every Call

The starter sent `messages: [...session.history]`, so each request included all user and assistant messages accumulated so far.

| Turn | input_tokens | output_tokens | total_tokens |
|------|-------------:|--------------:|-------------:|
| 1 | 97 | 24 | 121 |
| 5 | 301 | 24 | 325 |
| 10 | 553 | 24 | 577 |
| 15 | 812 | 24 | 836 |

Growth: **+715 mock input tokens** from turn 1 to turn 15 (**8.4×** the turn-1 input context).

## References

[1]: https://platform.claude.com/docs/en/about-claude/pricing "Anthropic Claude API Pricing — Claude Haiku 4.5"
