# TODOs

## https://github.com/dxos/dxos/pull/1670

- [ ] Organize this list by package (and figure out where to put it).

- [ ] Factor out PRs: 
  - [ ] `mocha` runner.
  - [ ] Rename `@dxos/test-utils`.
  - [ ] Rename `@dxos/shims` => `@dxos/typings`; Remove/rename all `shims.d.ts`.

- [ ] Client services (close iterator)? 
- [ ] Factor out invitations (echo/halo).
- [ ] Remove `party` vars.

- [ ] `@dxos/feed-store` benchmark/stress-test/metrics (dump RAS blocks/size).
- [ ] `@dxos/feed-store` error types?
- [ ] Utils to randomize tests.

- [ ] Standardize debug inspect pattern; hook into logger JSON.stringify.
- [ ] Rationalize `@dxos/async` (e.g., triggers, events).
- [ ] Rationalize `@dxos/debug` (e.g., range).
- [ ] Rationalize `@dxos/util`.
- [ ] Use TestItemBuilder pattern from `@dxos/feed-store` in `@dxos/network-manager`.

- [ ] Convert Buffers into lengths when logging.
- [ ] Logging indicator to match open/close (e.g., with timing); indented levels?
- [ ] Move tests to `chai`.
- [ ] `@testing` directive.
- [ ] Unify `@dxos/log`, `@dxos/util` spy, and `@dxos/spyglass`.
- [ ] Add `@dxos/x` tools (deps, sorting, etc.)
- [ ] Unify `@dxos/beast`, `@dxos/ridoculous`).
- [ ] Standardize (and write-up) logging format, test names, etc.

- [ ] Basic hypercore multiplexer prototype/tests (dynamically add plug-ins).
- [ ] Hypercore v10.

- [ ] Document IDEA tricks, keys, etc.
