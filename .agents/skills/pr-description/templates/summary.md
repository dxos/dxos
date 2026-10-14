# Summary (always)

Copy this block verbatim and replace every `{{…}}` slot.

```markdown
## Summary

{{EFFECT_AND_WHY}}

**Sections:** {{SECTIONS}}
**Linear:** {{LINEAR}}
```

| Slot                 | Fill with                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{EFFECT_AND_WHY}}` | Two to four sentences, one paragraph. Lead with the effect a user or caller sees, then why. No file or commit lists; the diff has those.                                        |
| `{{SECTIONS}}`       | The conditional sections that follow, in body order, comma-separated: `Bug, Architecture, UI`, any subset of those, or `none`. Summary and Safety are implied and never listed. |
| `{{LINEAR}}`         | `closes DX-123`, `part of DX-123`, several joined with `, `, or `none`.                                                                                                         |
