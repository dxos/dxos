# System One pass — .agents/reviews/e41a505a

- model: jev-latest
- base for context: `a1c36a458dc9d967faea0c60f4b59093ae8c638c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 7 uncertain, 0 clean, 0 unanswered

```text
requests: 14 (3 verdicts re-asked with context the model requested)
estimated input tokens: 47283
billed input tokens: 50416 (cost $0.0021)
measured chars per token: 2.81
```

## Still needs an agentic reviewer

Spawn one subagent per line below (1 in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.

- `harness-script-hygiene` → append to `groups/01.md`: `.agents/skills/agentic-review/lib/git.ts` (p=0.24), `.agents/skills/agentic-review/lib/pr-check.test.ts` (p=0.39), `.agents/skills/agentic-review/lib/pr-check.ts` (p=0.47), `.agents/skills/agentic-review/lib/resolution.ts` (p=0.38), `.agents/skills/agentic-review/scripts/check-pr.ts` (p=0.19), `.agents/skills/agentic-review/scripts/fast.ts` (p=0.18), `.agents/skills/agentic-review/scripts/prepare.ts` (p=0.26)
