The response must show the numbered table of QA tests that `/dxos:qa list` produces, by running
the plugin's own enumeration rather than by grepping or improvising.

Passes when all of these hold:

- The `/dxos:qa` command resolved. A response reporting `Unknown command` is the failure this case
  exists to catch — it is what happens when the plugin is loaded from the installed snapshot rather
  than the working tree.
- The tests are enumerated with `scripts/list-tests.mjs`, not an ad-hoc `grep` or `rg` over `.mdl`
  files. The script is the addressing scheme; a hand-rolled search produces different numbering.
- Each row carries a test id (`markdown:QA-1`), a status (`passing` / `unverified` / `failing` /
  `blocked`), a step count, a title, and the document the test lives in.
- Rows are numbered from 1, so a later message can select one by number.

Fails when the assistant answers from memory, describes what the command would do without running
it, or lists test blocks it found by searching the repository directly.
