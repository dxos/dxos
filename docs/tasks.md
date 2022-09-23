# 2022-09-19 DM
 
- [ ] `@dxos/keyring`
  - Move crypto stuff to @dxos/crypto

- [ ] `@dxos/echo-db`
  - Fix mock imports
  - Remove dead code
  - Refactor database integration

- [ ] `@dxos/client`
  - Fix broken services
  - Fix devtools
  - Figure out what to do with client running in local-mode (previously we passed database by pointer)

- [ ] Remove `@dxos/credentials`

- [ ] `@dxos/feed-store`
  - [ ] Refactor
  - [ ] Fix tests

- [ ] `@dxos/crypto`
  - Remove unused function
  - Try to minimize dependency on third-party crypto libraries

# 2022-09-19 RB

- [ ] `dxos/client-services`
  - [ ] move SpaceManager to echo-db (factor out invitations)
  - [ ] move HaloInvitations from ServiceContext
  - [ ] ServiceContext remove public member access
  - [ ] document design pattern
  - [ ] client proxies vs. services
  - [ ] SpaceManager/DataInvitations constructor SigningContext
  - [x] move from dxos/client
  - [ ] move from dxos/echo-db/services
  - [ ] move DataService from echo-db to client-services
  - [ ] remove `types.ts` files (anti-pattern)
  - [ ] service factories; clientServiceBundle
  - [ ] deps check

- [x] Remove `dxos/echo-protocol`
- [ ] `dxos/protocols`
  - [ ] types
    - [x] remove different keytypes (e.g., PartyKey) [discuss Dima]
  - [x] no deps from other common packages (check cycles)
  - [ ] rename Message classes (e.g., EchoEnvelope)
  - [ ] testing classes
- [ ] `dxos/feed-store`
  - [ ] interface abstractions
  - [ ] move FeedWriter, etc. from `dxos/protocols`
- [x] `dxos/keys`
  - [x] PublicKey
- [ ] `dxos/crypto`
  - [x] remove dep on `dxos/protocols`
  - [ ] remove createId (echo-db)
- [ ] `dxos/feed-store`

- [ ] Misc
  - [ ] All packages under `./packages`
  - [ ] Normalize packages (README, license, package details, etc.)
    - [ ] Beast
    - [ ] Enforce no deps out of common
  - [ ] tsconfig.spec.json?
  - [ ] Protobuf lint
  - [ ] Rename `@dxos/protocols-toolchain`

- Fix IDE
  - Settings:
    - templates
    - keys
      - toggle split
      - toggle hidden folders (dist, etc)
