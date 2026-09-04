The response must show the numbered table of QA flows that `/dxos:qa list` produces, by running
the plugin's own enumeration rather than by grepping or improvising.

Passes when all of these hold:

- The `/dxos:qa` command resolved. A response reporting `Unknown command` is the failure this case
  exists to catch — it is what happens when the plugin is loaded from the installed snapshot rather
  than the working tree.
- The flows are enumerated with `scripts/list-flows.mjs`, not an ad-hoc `grep` or `rg` over `.mdl`
  files. The script is the addressing scheme; a hand-rolled search produces different numbering.
- Each row carries a flow id (`QA-1`), a status (`passing` / `unverified` / `failing`), a step
  count, a title, and the document the flow lives in.
- Rows are numbered from 1, so a later message can select one by number.

Fails when the assistant answers from memory, describes what the command would do without running
it, or lists flow blocks it found by searching the repository directly.
