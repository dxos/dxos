# Safety (always)

Every PR carries this section, last. Copy this block verbatim and replace every `{{…}}` slot. Every
row is answered; `No` is an answer and must be written.

```markdown
## Safety

| Question                                   | Answer            |
| ------------------------------------------ | ----------------- |
| Changes existing tests?                    | {{CHANGES_TESTS}} |
| Adds new tests?                            | {{ADDS_TESTS}}    |
| Introduces new APIs?                       | {{NEW_APIS}}      |
| Breaking storage change?                   | {{STORAGE}}       |
| Breaking wire change (p2p or client↔edge)? | {{WIRE}}          |
| Safely and easily revertable?              | {{REVERTABLE}}    |
| Performance pitfalls?                      | {{PERFORMANCE}}   |

**Risk of merging:** {{RISK_LEVEL}} — {{RISK_REASON}}
```

Each answer cell starts with exactly one of the words shown, followed, where the slot says so, by
`: ` and one line.

| Slot                | Fill with                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `{{CHANGES_TESTS}}` | `No`, or `Yes: <which tests> — <why the old expectation was wrong or obsolete>`.                   |
| `{{ADDS_TESTS}}`    | `No: <why none is needed>`, or `Yes: <file> — <what it covers>`.                                   |
| `{{NEW_APIS}}`      | `No`, or `Yes: <the exported symbols, operations, endpoints, or schema types>`.                    |
| `{{STORAGE}}`       | `No`, or `Yes: <what persisted data changes shape> — <the migration>`.                             |
| `{{WIRE}}`          | `No`, or `Yes: <which protocol or message> — <how old and new peers interoperate>`.                |
| `{{REVERTABLE}}`    | `Yes`, or `No: <what a revert would leave behind>`.                                                |
| `{{PERFORMANCE}}`   | `None`, or `Yes: <what could get slower or bigger> — <how you checked>`.                           |
| `{{RISK_LEVEL}}`    | `Low`, `Medium`, or `High`.                                                                        |
| `{{RISK_REASON}}`   | One or two sentences: what breaks and for whom if this is wrong, and what limits the blast radius. |

## Guidance

- **Changes existing tests** is the line reviewers read hardest. A changed assertion needs a reason
  that is not "to make it pass".
- **Wire changes** cover the MESH/p2p protocols and the client↔edge protocol (HTTP and WebSocket
  messages, `@dxos/edge-protocol`). The client↔services RPC inside one client does not count, since
  both ends ship together.
- **Storage changes** cover ECHO/Automerge document shape, SQLite schema (see the sql-migrations
  design doc), IndexedDB/OPFS layout, D1/KV/DO storage in edge. A new optional field that old code
  ignores is not breaking; answer `No` and say so in Risk.
- **Revertable** is `No` whenever a revert would not restore the old state on its own: a forward-only
  migration, a published package version, a deployed worker that other workers already call.
- **Risk** weighs the answers above against test coverage. A wire or storage break with no
  compatibility test is `High` however small the diff.
