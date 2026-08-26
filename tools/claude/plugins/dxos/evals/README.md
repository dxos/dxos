# Evals

Scored cases for this plugin, run with `claude plugin eval dxos`. Each case is a `prompt.md` plus
`graders/*.md`; the runner adds a no-plugin baseline arm so a score means the plugin caused the
behaviour rather than the model already knowing it.

`--plugin-dir` covers the fast loop (does the command resolve?); these cover behaviour (does it
produce the right thing?). See the README's "Developing this plugin" section for both.

| Case | What it protects |
| --- | --- |
| `qa-list` | `/dxos:qa list` resolves and renders the numbered flow table from `list-flows.mjs` |

`plugin eval` is early access. Where it is not enabled, the same assertion can be made directly:

```bash
claude --plugin-dir tools/claude/plugins/dxos --model haiku -p "Run /dxos:qa list and show the result."
```
