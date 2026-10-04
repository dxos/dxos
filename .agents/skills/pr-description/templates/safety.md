# Safety (always)

Every PR carries this section. Answer each line; "No" is an answer and must be written. Where the
answer is yes, add one line saying what and why.

```markdown
## Safety

| Question                                   | Answer                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Changes existing tests?                    | <No / Yes: which tests and why the old expectation was wrong or obsolete.>                                      |
| Adds new tests?                            | <No: why none is needed / Yes: file and what each covers.>                                                      |
| Introduces new APIs?                       | <No / Yes: the exported symbols, operations, endpoints, or schema types.>                                       |
| Breaking storage change?                   | <No / Yes: what persisted data changes shape, and the migration.>                                               |
| Breaking wire change (p2p or client↔edge)? | <No / Yes: which protocol or message, and how old and new peers interoperate.>                                  |
| Safely and easily revertable?              | <Yes / No: what a revert would leave behind (migrated data, published packages, deployed workers).>             |
| Performance pitfalls?                      | <None / what could get slower or bigger (hot path, extra round trip, bundle size, memory) and how you checked.> |

**Risk of merging:** <Low / Medium / High>. <One or two sentences: what breaks and for whom if this
is wrong, and what limits the blast radius.>
```

## Guidance

- **Changes existing tests** is the line reviewers read hardest. A changed assertion needs a reason
  that is not "to make it pass".
- **Wire changes** cover the MESH/p2p protocols and the client↔edge protocol (HTTP and WebSocket
  messages, `@dxos/edge-protocol`). The client↔services RPC inside one client does not count, since
  both ends ship together.
- **Storage changes** cover ECHO/Automerge document shape, SQLite schema (see the sql-migrations
  design doc), IndexedDB/OPFS layout, D1/KV/DO storage in edge. A new optional field that old code
  ignores is not breaking; say so.
- **Revertable** is "No" whenever a revert would not restore the old state on its own: a forward-only
  migration, a published package version, a deployed worker that other workers already call.
- **Risk** weighs the answers above against test coverage. A wire or storage break with no
  compatibility test is High however small the diff.
