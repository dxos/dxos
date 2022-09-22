- [ ] @dxos/keyring
  - Move crypto stuff to @dxos/crypto

- [ ] @dxos/echo-db
  - Fix mock imports
  - Remove dead code
  - Refactor database integration

- [ ] @dxos/client
  - Fix broken services
  - Fix devtools
  - Figure out what to do with client running in local-mode (previously we passed database by pointer)

- [ ] Extract @dxos/client-services package from @dxos/client and @dxos/echo-db

- [ ] Remove @dxos/credentials

- [ ] @dxos/feed-store
  - [ ] Refactor
  - [ ] Fix tests

- [ ] @dxos/crypto
  - Remove unused function
  - Try to minimize dependency on third-party crypto libraries