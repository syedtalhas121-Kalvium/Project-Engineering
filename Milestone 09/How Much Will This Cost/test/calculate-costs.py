from statistics import mean

rows = [
    {"call": 1, "words": 200, "prompt": 351, "completion": 191},
    {"call": 2, "words": 412, "prompt": 623, "completion": 182},
    {"call": 3, "words": 742, "prompt": 1045, "completion": 189},
    {"call": 4, "words": 200, "prompt": 351, "completion": 191},
    {"call": 5, "words": 412, "prompt": 623, "completion": 182},
]
avg_prompt = mean(r["prompt"] for r in rows)
avg_completion = mean(r["completion"] for r in rows)
avg_total = mean(r["prompt"] + r["completion"] for r in rows)
print(f"averages prompt={avg_prompt:.2f} completion={avg_completion:.2f} total={avg_total:.2f}")
for name, input_price, output_price in [("openai/gpt-4o-mini", .15, .60), ("google/gemini-2.0-flash-001", .10, .40)]:
    cost = avg_prompt * input_price / 1_000_000 + avg_completion * output_price / 1_000_000
    daily10 = cost * 10 * 5
    daily100 = cost * 100 * 5
    monthly100 = daily100 * 30
    print(name, f"cost={cost:.9f} daily10={daily10:.6f} daily100={daily100:.6f} monthly100={monthly100:.6f}")
