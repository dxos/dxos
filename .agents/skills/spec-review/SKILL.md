---
name: spec-review
description: >-
  Review how far the code meets a `.mdl` spec (`PLUGIN.mdl`, `SPEC.mdl`) and write the result as a
  `<SPEC>.review.mdl` beside it: one `verdict` per feature requirement, type, op, component and
  service, each with a status (done, untested, partial, diverged, missing), a note, and `github:`
  evidence keys that point at the code. Composer's spec viewer reads the latest review and marks
  each item in the margin and on the definition graph. Use when asked to review a spec against its
  code, check spec compliance, find what a spec promises that the code does not do, or refresh a
  spec's review. For rule-driven code review use `agentic-review`; to change the spec itself use `mdl`.
---

# Spec review

A spec review answers one question per spec item: **does the code do what this item says?** The
answer is a `verdict` block in a review document beside the spec. The format is the review dialect,
`packages/reflect/deus/lang/review.mdl`; read it once.

A review never edits the spec. If the spec is wrong, say so in a verdict's note (`diverged`); a person
decides whether the code or the spec changes.

## Procedure

1. **List the items.** `deus review items` prints every item the review must judge (a `feat` with `req`
   items is judged through its requirements):

   ```bash
   pnpm deus review items <path/to/PLUGIN.mdl>
   ```

2. **Map the package.** Read the package's `src/` layout, its `index.ts` exports, capabilities,
   operations and containers before judging anything. Most items map to one or two files.

   For a `plugin` block, judge its `dependsOn` against `dx.config.ts`'s `plugin.dependsOn` beside the spec;
   a mismatch is `diverged`, and `deus review check` errors if the verdict says otherwise.

3. **Judge each item against the code, not against names.** Find where the behaviour lives and read
   it. A symbol with the right name that does something else is `diverged`, not `done`.

   | Status     | Use when                                                                  |
   | ---------- | ------------------------------------------------------------------------- |
   | `done`     | The code does what the item says.                                         |
   | `untested` | It does, but no test file exercises it (check `*.test.ts`, stories, e2e). |
   | `partial`  | Part is done; the note says which part is not.                            |
   | `diverged` | The code does something different; the note says what the code does.      |
   | `missing`  | Nothing does it. Searched and not found — say where you looked.           |

   Use `untested` rather than `done` when the item states behaviour a test could check and no test
   does. A test against a stand-in (a mock file system, a fake service) counts if it exercises the
   item's behaviour. A type or component whose fields and shape match is still `untested` until a
   test exercises it, since the viewer shows every `done` as tested. Any status may carry a note;
   `done` needs none.

4. **Cite evidence as source keys** — `github:<owner>/<repo>/<path>#<Symbol>`, the symbol being the
   declaration that carries the behaviour (`openDirectoryPicker`, `Class.method`). The viewer opens
   these on click, so a key must name a file that exists and a symbol _declared_ in it — a mention is
   not evidence. An anonymous default export (most op handlers and capability modules) has no
   symbol: cite the file alone, `github:<owner>/<repo>/<path>`.

   Cite the **tests** that exercise the item in `tests:`, as test file keys without a `#`
   (`github:<owner>/<repo>/<path>.test.ts`, a story or an e2e spec). A `done` verdict cites at least
   one; an `untested` verdict cites none. The viewer shows `tested` or `untested` beside the item
   from these, and "no code" when `evidence:` is empty.

   A **`scenario` or `test`** block is judged on whether automation exercises it, not on whether code
   implements it: `done` when an automated test runs it end to end, `partial` when a test covers some
   of its steps, `diverged` when the test runs something else, `missing` when nothing runs it (a manual
   QA run does not count). `untested` does not apply. `tests:` names the test files and is required
   unless the status is `missing`; `evidence:` may name the code the test drives. The viewer shows
   tested, partly tested or not tested, with a chip per test file.

   When an item is implemented **in more than one place**, add a `walkthrough:` of 1 to 5 steps
   in reading order, each `- <one sentence>. github:<key>` naming the declaration it describes:

   ```mdl
   verdict importSpec: Links a checkout file to a new Spec.
     status: done
     evidence: [github:dxos/dxos/packages/plugins/plugin-code/src/types/CodeOperation.ts#ImportSpec, github:dxos/dxos/packages/plugins/plugin-code/src/operations/import-spec.ts]
     walkthrough:
       - The operation declares its key input and the Spec it returns. github:dxos/dxos/packages/plugins/plugin-code/src/types/CodeOperation.ts#ImportSpec
       - The handler resolves the checkout, reads the file and creates the Spec. github:dxos/dxos/packages/plugins/plugin-code/src/operations/import-spec.ts
   ```

   Say what each piece does for this item, not how it works line by line. A `type` or anything with
   one implementation gets no walkthrough: hovering its code chip already shows the declaration. An
   `op` walks its declaration, then each handler; a `feat` or `req` walks the pieces in the order a
   request passes through them. The viewer shows the steps in the item's Review card and on hover
   of its status chip.

5. **Write the review** to the spec's directory as `<SPEC>.review.mdl` (`PLUGIN.mdl` →
   `PLUGIN.review.mdl`), replacing any previous one. Frontmatter:

   ```yaml
   ---
   spec: github:dxos/dxos/packages/plugins/plugin-x/PLUGIN.mdl
   commit: <git rev-parse HEAD>
   date: <YYYY-MM-DD>
   by: agent:claude-code
   ---
   ```

   Then `# Review: <spec name>`, a summary paragraph (what is solid, what is missing, the biggest
   divergence), the `## Extensions` table declaring `verdict` (`org.dxos.mdl.verdict@1.0`), and
   `## Verdicts` with one fenced `mdl` block per item, in spec order:

   ````markdown
   ```mdl
   verdict F-1.2: The OS directory picker opens on the action.
     status: done
     evidence: [github:dxos/dxos/packages/plugins/plugin-file-system/src/util.ts#openDirectoryPicker]
     tests: [github:dxos/dxos/packages/plugins/plugin-file-system/src/util.test.ts]
   ```
   ````

   The inline title is the verdict in one line. `note:` is required unless the status is `done`.
   Fields sit at exactly two spaces of indent; a multi-line value (`note: |`) continues at four.

6. **Check it.** Fix every error before you report:

   ```bash
   pnpm deus review check <path/to/PLUGIN.review.mdl>
   ```

   It fails on a missing or malformed frontmatter field, an unknown status, a non-`done` verdict
   without a note, an item with no verdict, a verdict for an id the spec does not have, and evidence
   that names a missing file or a symbol the file does not declare. It warns when the `commit` is not
   in the clone, when a done, untested or partial verdict cites no evidence, and when a done verdict
   cites no tests. A test key with a `#`, a missing test file, or tests on an `untested` verdict is an
   error.

7. **Report** the counts per status and the three findings that matter most.

## How the viewer uses it

Composer's spec article (plugin-code) looks for `<SPEC>.review.mdl` beside the spec in the local
checkout and re-reads it every few seconds, so a review appears while the spec is open:

- each reviewed item's declaration line gets a coloured bar and a status chip in the margin;
- each box on the **Definitions** graph gets a status badge; a `feat` shows the worst of its reqs;
- the **Review** tab lists verdicts worst first; evidence keys open the code at the symbol.

The review file is an ordinary `.mdl` file: commit it with the change it reviewed, or leave it
uncommitted as a working note. It is not a spec, so it needs no changelog entry.
