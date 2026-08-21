# Prompt Quality Comparison

This comparison uses the same test input, model, and temperature for each bad-versus-good pair. The raw model responses are preserved verbatim as evidence; the improvement statements describe structural differences rather than subjective quality judgments.

---

## Task A — Notes Reviewer

### Missing Components in Original

- **Missing: System Instruction** — the prompt does not define an identity, expertise, or quality standard, so the model is free to adopt inconsistent reviewer behaviour.
- **Present only partially: Context** — the note content is injected directly into the instruction without start/end delimiters, so the boundary between prompt instructions and user content is not explicit.
- **Present only partially: Task** — “give feedback” indicates a general direction but does not name the three UI-required evaluation dimensions: clarity, completeness, and accuracy.
- **Missing: Format** — no JSON object, field names, nested shape, score range, or feedback-length requirement is specified, so the model can return prose, lists, grades, or other shapes.
- **Missing: Constraints** — there are no rules against markdown fencing, commentary outside the response, invented facts, or subjective/editorial language about the student.

### Original Prompt

```js
const prompt = `give feedback on this note: ${content}`
```

### Rewritten Prompt

_To be added after the five-component rewrite is implemented._

### Test Input Used

_To be added before the LLM comparison calls._

### Bad Prompt Output

_To be added from the raw LLM response._

### Good Prompt Output

_To be added from the raw LLM response._

### Improvement

_To be added after both raw responses have been captured._

---

## Task B — Placement Summariser

### Missing Components in Original

- **Missing: System Instruction** — the prompt does not define a summariser role or a privacy-aware quality standard.
- **Present only partially: Context** — the interview text is interpolated without delimiters, so the input is not clearly bounded.
- **Present only partially: Task** — “summarize” does not state that the result must contain company, role, difficulty, key topics, and outcome.
- **Missing: Format** — the prompt does not require a JSON object, a numeric 1–5 difficulty value, an array for key topics, or a one-sentence outcome.
- **Missing: Constraints** — it does not prohibit personal names, word-based difficulty labels, or speculation beyond the submitted experience.

### Original Prompt

```js
const prompt = `summarize this interview experience: ${text}`
```

### Rewritten Prompt

_To be added after the five-component rewrite is implemented._

### Test Input Used

_To be added before the LLM comparison calls._

### Bad Prompt Output

_To be added from the raw LLM response._

### Good Prompt Output

_To be added from the raw LLM response._

### Improvement

_To be added after both raw responses have been captured._

---

## Task C — Error Analyst

### Missing Components in Original

- **Missing: System Instruction** — the prompt does not establish the senior debugging-engineer identity or an evidence-based diagnostic standard.
- **Present only partially: Context** — the error log is interpolated without delimiters, so the stack trace is not explicitly bounded as input data.
- **Present only partially: Task** — “why is there a bug” asks for a general explanation but does not name rootCause, affectedComponent, severity, or recommendedFix.
- **Missing: Format** — no JSON shape, severity enum, or optional codeSnippet field is specified, so the dashboard cannot rely on stable fields.
- **Missing: Constraints** — there are no rules requiring raw JSON, restricting severity to the supported enum, or preventing unsupported speculation about causes.

### Original Prompt

```js
const prompt = `why is there a bug: ${error_message}`
```

### Rewritten Prompt

_To be added after the five-component rewrite is implemented._

### Test Input Used

_To be added before the LLM comparison calls._

### Bad Prompt Output

_To be added from the raw LLM response._

### Good Prompt Output

_To be added from the raw LLM response._

### Improvement

_To be added after both raw responses have been captured._
