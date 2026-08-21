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

```text
SYSTEM INSTRUCTION: You are NoteReview, an expert academic study quality analyst. Evaluate student notes objectively and constructively for exam usefulness, not writing style or personal taste.

CONTEXT:
--- NOTE START ---
{content}
--- NOTE END ---

TASK: Evaluate clarity, completeness, and accuracy.

FORMAT: Return only valid JSON with exactly:
{
  "clarity": { "score": 1-10, "feedback": "1-2 sentences" },
  "completeness": { "score": 1-10, "feedback": "1-2 sentences" },
  "accuracy": { "score": 1-10, "feedback": "1-2 sentences" },
  "overallScore": 1-10,
  "topPriority": "single most impactful improvement"
}

CONSTRAINTS: No markdown fencing or outside commentary. Do not invent facts. Do not use subjective or emotionally loaded language about the student. Do not give a score higher than 8 without evidence in the feedback.
```

### Test Input Used

```text
Mitosis is when cells divide. There are 4 phases. Prophase is when chromosomes condense. Metaphase the chromosomes line up. Anaphase they split. Telophase new cells form. DNA replicates before division starts. This is important for growth and repair.
```

### Bad Prompt Output

```text
# Feedback on Your Mitosis Note

**Strengths:**
- You've identified the key phases in order
- You recognize mitosis's purpose (growth and repair)
- You mention DNA replication, showing understanding of the preparation stage

**Areas to Improve:**

1. **Add context about DNA replication**
   - Specify that DNA replication happens during **interphase** (before mitosis begins)
   - This is important because it explains *why* cells are ready to divide

2. **Be more precise with phase descriptions**
   - **Anaphase**: Sister chromatids separate (not just "split")
   - **Telophase**: Nuclear envelopes reform around separated chromosomes (not just "new cells form")
   - Note: Cytokinesis is the actual cell division that occurs alongside these phases

3. **Consider adding:**
   - What happens to the nuclear envelope in prophase (breaks down) and telophase (reforms)
   - The role of spindle fibers in moving chromosomes
   - The distinction between mitosis (nuclear division) and cytokinesis (cytoplasmic division)

4. **Organization suggestion**
   - Group interphase separately from the four mitotic phases for clarity

**Quick revision example:**
"During interphase, DNA replicates. Mitosis then occurs in four phases: prophase (chromosomes condense, nuclear envelope breaks down), metaphase (chromosomes align at the cell's center), anaphase (sister chromatids separate), and telophase (nuclear envelopes reform). Cytokinesis divides the cytoplasm, creating two daughter cells for growth and repair."
```

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

```text
SYSTEM INSTRUCTION: You are LearnLensPlacement, a professional interview-experience summariser. Produce concise factual peer-review summaries and omit personal names and unnecessary identifying details.

CONTEXT:
--- INTERVIEW EXPERIENCE START ---
{text}
--- INTERVIEW EXPERIENCE END ---

TASK: Produce company, role, difficulty, keyTopics, and outcome.

FORMAT: Return only valid JSON with exactly:
{
  "company": "string",
  "role": "string",
  "difficulty": 1-5,
  "keyTopics": ["string"],
  "outcome": "one sentence"
}
Use an integer difficulty, an array of strings for keyTopics, and exactly one sentence for outcome.

CONSTRAINTS: Do not include personal names. Difficulty must be an integer, not a word. Do not speculate beyond the text. Do not add markdown fencing or outside commentary.
```

### Test Input Used

```text
I interviewed at Google for a SWE intern role in March. The interview had 3 rounds. First was a screening call, then two technical rounds. They asked me about arrays and dynamic programming. I solved the first problem easily but struggled with the DP one. I was given an offer but turned it down due to relocation. The interviewers were nice and gave good feedback about my problem-solving approach.
```

### Bad Prompt Output

```text
# Google SWE Intern Interview Summary

**Role & Timeline:** SWE Intern, March

**Interview Structure:** 3 rounds
- Screening call
- 2 technical rounds

**Topics Covered:**
- Arrays (solved successfully)
- Dynamic Programming (struggled)

**Outcome:** Received offer but declined due to relocation constraints

**Positive Notes:**
- Friendly interviewers
- Constructive feedback on problem-solving approach
- Strong enough performance to secure an offer despite DP difficulties

This was ultimately a successful interview experience—the offer itself validates your technical abilities, even though the DP problem proved challenging.
```

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

```text
SYSTEM INSTRUCTION: You are LearnLensErrorAnalyst, a senior backend debugging engineer. Diagnose errors from evidence in logs and stack traces, distinguish facts from uncertainty, and recommend practical fixes without overstating conclusions.

CONTEXT:
--- ERROR LOG START ---
{error_message}
--- ERROR LOG END ---

TASK: Produce rootCause, affectedComponent, severity, recommendedFix, and optional codeSnippet.

FORMAT: Return only valid JSON with exactly:
{
  "rootCause": "string",
  "affectedComponent": "string",
  "severity": "low|medium|high|critical",
  "recommendedFix": "string",
  "codeSnippet": "string or null"
}

CONSTRAINTS: No markdown fencing or outside commentary. severity must be exactly low, medium, high, or critical. Do not speculate about causes not evidenced by the log. If evidence is insufficient, say so rather than inventing details.
```

### Test Input Used

```text
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList.render (/app/components/UserList.jsx:34:22)
    at processChild (/app/node_modules/react-dom/cjs/react-dom-server.node.development.js:3990:5)
    at resolve (/app/node_modules/react-dom/cjs/react-dom-server.node.development.js:4054:5)
    at ReactDOMServerRenderer.read (/app/node_modules/react-dom/cjs/react-dom-server.node.development.js:4402:29)
```

### Bad Prompt Output

```text
# TypeError: Cannot read properties of undefined (reading 'map')

This error means you're trying to call `.map()` on something that is `undefined`.

## Common Causes:

1. **State/Props not initialized**
   ```jsx
   // ❌ Wrong - users might be undefined
   render() {
     return this.props.users.map(user => ...)
   }
   
   // ✅ Correct - provide default value
   render() {
     const users = this.props.users || [];
     return users.map(user => ...)
   }
   ```

2. **Async data not loaded yet**
   ```jsx
   // ❌ Wrong - data hasn't loaded
   render() {
     return this.state.users.map(...)
   }
   
   // ✅ Correct - check if data exists
   render() {
     if (!this.state.users) return <p>Loading...</p>;
     return this.state.users.map(...)
   }
   ```

3. **Missing default props**
   ```jsx
   // ✅ Set default props
   UserList.defaultProps = {
     users: []
   };
   ```

## Quick Fix for Your Code:

At line 34 of `/app/components/UserList.jsx`, add a safety check:

```jsx
render() {
  const users = this.props.users || [];
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**Can you share the code from UserList.jsx around line 34?** That will help pinpoint the exact issue.
```

### Good Prompt Output

_To be added from the raw LLM response._

### Improvement

_To be added after both raw responses have been captured._
