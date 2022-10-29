# TODOs

Staging area for internal work-in-progress (written-up into GH issues).

## Issues

- https://github.com/dxos/dxos/issues/1576

## Network/Hypercore

- [ ] Basic hypercore multiplexer prototype/tests (dynamically add plug-ins).
- [ ] Hypercore v10.

## Invitations

- [ ] https://github.com/dxos/dxos/issues/1745
- [ ] Observer pattern (pending, connected, verified, done, error, fatal, timed-out, etc.)
- [ ] Reconcile Signer/CredentialsSigner
- [ ] Client API (class names)
- [ ] Client services API
- [ ] Client services normalized invitation flows
- [x] Clean-up protobuf defs (incl. service defs).

## Protocols

- [ ] Clean-up defs; remove "party".

## Tools

- [ ] Unify `@dxos/log`, `@dxos/util` spy, and `@dxos/spyglass`.
- [ ] Add `@dxos/x` tools (deps, sorting, etc.)
- [ ] Unify `@dxos/beast`, `@dxos/ridoculous`).
- [ ] `@testing` directive.
- [ ] Logging indicator to match open/close (e.g., with timing); indented levels?
- [ ] Convert Buffers into lengths when logging.
- [ ] Utils to randomize tests.

## Clean-up

- [ ] `@dxos/feed-store` benchmark/stress-test/metrics (dump RAS blocks/size).
- [ ] Move tests to `chai`.
- [ ] Standardize (and write-up) logging format, test names, etc.
- [ ] Remove `party` vars.
- [ ] Standardize debug inspect pattern; hook into logger JSON.stringify.
- [ ] Rationalize `@dxos/async` (e.g., triggers, events).
- [ ] Rationalize `@dxos/debug` (e.g., range).
- [ ] Rationalize `@dxos/util`.
- [ ] Use TestItemBuilder pattern from `@dxos/feed-store` in `@dxos/network-manager`.

## Misc

- [ ] Document IDEA tricks, keys, etc.
  - [ ] https://youtrack.jetbrains.com/issues?q=by:%20me&preview=WEB-57606
