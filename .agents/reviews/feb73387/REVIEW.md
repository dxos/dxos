---
branch: dm/wizardly-turing-x32wpa
commit: feb7338706c740e7a302b3ee0700816cde1424bf
base: 7bddbf5a53d0beaa42188b3cf8fb1bfc01791626
mode: fast
createdAt: 2026-09-27T04:07:04.865Z
isFinalized: true
groups: 4
rules: [catalog-is-dependency-source-of-truth, moon-yml-entrypoint-registration, private-new-packages, workspace-deps]
reviewId: feb73387
---

_Clean: no issues._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

<!-- no issues -->

## Appendix

### System One pass

- model: jev-latest
- base for context: `7bddbf5a53d0beaa42188b3cf8fb1bfc01791626`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 0 violations written to fragments, 3 uncertain, 7 clean, 0 unanswered

```text
requests: 11 (1 verdicts re-asked with context the model requested)
estimated input tokens: 29442
billed input tokens: 31157 (cost $0.0013)
measured chars per token: 2.83
```

## Agentic follow-up

System One left one group uncertain; it was reviewed by hand against its rule.

- `moon-yml-entrypoint-registration`: `packages/common/crx-protocol/package.json` (p=0.16), `packages/plugins/plugin-crx/package.json` (p=0.22), `packages/plugins/plugin-github/package.json` (p=0.16). No diagnostics: the diff removes `private` and adds `publishConfig`, and adds or changes no `exports`/`imports` entry.
