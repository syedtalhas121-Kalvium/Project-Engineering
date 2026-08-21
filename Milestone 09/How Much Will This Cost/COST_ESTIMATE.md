# AI Cost Estimate — Note Summarisation Endpoint

> **Validation mode:** These five calls were executed against the repository's deterministic local mock (`MOCK_AI=true`) because no OpenRouter API key was available. The logging format and arithmetic are production-shaped, but these numbers are not real provider billing data.

## Token Usage (5 Test Calls)

| Call | Note Length (words) | Prompt Tokens | Completion Tokens | Total Tokens |
|---:|---:|---:|---:|---:|
| 1 | 200 | 351 | 191 | 542 |
| 2 | 412 | 623 | 182 | 805 |
| 3 | 742 | 1045 | 189 | 1234 |
| 4 | 200 | 351 | 191 | 542 |
| 5 | 412 | 623 | 182 | 805 |
| **Average** | **393.20** | **598.60** | **187.00** | **785.60** |

The five endpoint responses returned HTTP 200 and emitted one `[AI_USAGE]` JSON record each. The logged fields were `promptTokens`, `completionTokens`, `totalTokens`, `model`, `timestamp`, `userId`, and `endpoint`.

## Model Pricing

| Model | Input $/1M tokens | Output $/1M tokens |
|---|---:|---:|
| openai/gpt-4o-mini | $0.15 | $0.60 |
| google/gemini-2.0-flash-001 | $0.10 | $0.40 |

Pricing references: [OpenRouter GPT-4o mini](https://openrouter.ai/openai/gpt-4o-mini) and [OpenRouter Gemini 2.0 Flash](https://openrouter.ai/google/gemini-2.0-flash-001). Verify provider pricing immediately before production deployment because model prices can change.

## Cost Projection Table

The workload assumes **5 AI calls per user per day**, **30 days per month**, and the measured average of **598.60 prompt tokens** plus **187.00 completion tokens** per request.

| Model | Avg Tokens/Req | Cost/Request | Daily (10 users, 5 calls) | Daily (100 users, 5 calls) | Monthly (100 users) |
|---|---:|---:|---:|---:|---:|
| openai/gpt-4o-mini | 785.60 | $0.000201990 | $0.010100 | $0.100995 | $3.029850 |
| google/gemini-2.0-flash-001 | 785.60 | $0.000134660 | $0.006733 | $0.067330 | $2.019900 |

### Arithmetic Walkthrough

For `openai/gpt-4o-mini`, cost/request = `(598.60 × $0.15 / 1,000,000) + (187.00 × $0.60 / 1,000,000)` = `$0.000089790 + $0.000112200` = **$0.000201990**. Daily for 10 users = `$0.000201990 × 10 × 5` = **$0.010100**; daily for 100 users = `$0.000201990 × 100 × 5` = **$0.100995**; monthly for 100 users = `$0.100995 × 30` = **$3.029850**.

For `google/gemini-2.0-flash-001`, cost/request = `(598.60 × $0.10 / 1,000,000) + (187.00 × $0.40 / 1,000,000)` = `$0.000059860 + $0.000074800` = **$0.000134660**. Daily for 10 users = `$0.000134660 × 10 × 5` = **$0.006733**; daily for 100 users = `$0.000134660 × 100 × 5` = **$0.067330**; monthly for 100 users = `$0.067330 × 30` = **$2.019900**.

*Formula: cost/request = (average prompt tokens × input price / 1,000,000) + (average completion tokens × output price / 1,000,000).*  
*Daily = cost/request × users × 5 calls; monthly = daily × 30.*

## Model Recommendation

I recommend **google/gemini-2.0-flash-001** at an estimated **$2.019900 per month for 100 users** under this five-call-per-day workload. It reduces the modeled cost versus GPT-4o mini, while the trade-off is that GPT-4o mini may provide more consistent structure or instruction following for difficult notes and should be preferred if quality evaluation shows a meaningful gap.

## Token Plausibility Verification

| Verification item | Result |
|---|---|
| Model tested | openai/gpt-4o-mini mock path |
| Note used | test/short-note.txt |
| Note word count | 200 words |
| Local note-token estimate | 256 tokens using the mock's 1.28 tokens/word heuristic |
| Local system-prompt allowance | 95 tokens |
| Expected mock prompt tokens | 95 + ceil(200 × 1.28) = 351 tokens |
| Logged promptTokens | 351 |
| Difference explanation | 0 tokens in mock mode; a real provider response can differ because tokenizer rules and request serialization differ, and the system prompt is included in the logged prompt total |

This verification is explicitly a **local mock plausibility check**, not a claim that the OpenAI tokenizer website was queried.

## References

[1]: https://openrouter.ai/openai/gpt-4o-mini "OpenRouter GPT-4o mini pricing page"

[2]: https://openrouter.ai/google/gemini-2.0-flash-001 "OpenRouter Gemini 2.0 Flash pricing page"
