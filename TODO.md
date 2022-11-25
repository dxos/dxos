# TODOs

Staging area for internal work-in-progress (written-up into GH issues).

## Issues

- https://github.com/dxos/dxos/issues/1576

## Client Services

- [ ] Fix "double connect" mesh bug.
- [ ] Replace service host proxy with getters for InvitationService.
- [ ] RPC Streams error handling https://github.com/dxos/dxos/issues/1766.
- [ ] Propagate error from `createRpcPlugin`.
- [ ] Go-like Context (ctx) for global life-cycle management (and logging). Open/Close/Dispose.

## Client API

- [ ] Testing framework (factor out sync tests).
- [ ] Review/remove re-exports from `@dxos/client`.
- [ ] Halo key management (factor out usage by `@dxos/registry-client`.
- [ ] Move DXOS errors from `@dxos/debug`. Reconcile debug/mesh-protocol (nanoerror).
- [x] Move InvitationWrapper to client.
- [x] Remove `spaceKey` vars, etc.

## Invitations (https://github.com/dxos/dxos/issues/1745)

- [x] Manage invitations in client.
- [x] Observer pattern (pending, connected, verified, done, error, fatal, timed-out, etc.)
  - [x] Remove callbacks (see profile.createInvitation).
- [x] Reconcile Signer/CredentialsSigner (delete obsolete Signer).
- [x] Remove `invitation` field from proto and wrappers.
- [x] Clean-up protobuf defs (incl. service defs).

## Protocols

- [x] Clean-up defs; remove "space".
- [ ] ProtoRpcPeerOptions (rename requested/exposed options).

## Tools

- [ ] Unify `@dxos/log`, `@dxos/util` spy, and `@dxos/spyglass`.
- [ ] Add `@dxos/x` tools (deps, sorting, etc.)
- [ ] Unify `@dxos/beast`, `@dxos/ridoculous`).
- [ ] `@testing` directive.
- [ ] Logging indicator to match open/close (e.g., with timing); indented levels?
- [ ] Convert Buffers into lengths when logging.
- [ ] Utils to randomize tests (e.g., timeouts).

## Network/Hypercore

- [ ] Basic hypercore multiplexer prototype/tests (dynamically add plug-ins).
- [ ] Hypercore v10.

## Clean-up

- [ ] `@dxos/feed-store` benchmark/stress-test/metrics (dump RAS blocks/size).
- [ ] Move tests to `chai`.
- [ ] Standardize (and write-up) logging format, test names, etc.
- [ ] Standardize debug inspect pattern; hook into logger JSON.stringify.
- [ ] Rationalize `@dxos/async` (e.g., triggers, events).
- [ ] Rationalize `@dxos/debug` (e.g., range).
- [ ] Rationalize `@dxos/util`.
- [ ] Use TestItemBuilder pattern from `@dxos/feed-store` in `@dxos/network-manager`.

## Misc

- [ ] Document IDEA tricks, keys, etc.
  - [ ] https://youtrack.jetbrains.com/issues?q=by:%20me&preview=WEB-57606
