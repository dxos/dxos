# Missing functionality

- Schedule
  - 0 Merge to main
  - 1 Technical debt + getting basics working again
  - 2 e2e testing framework (RB api, feed-store, client-services, etc.)
  - 3 rewrite MESH protocol, authentication [2 wks]
  - 4 circles, offline, bots (sync helper)

- v1
  - [ ] Profile username
  - [ ] Device management (list devices)
  - [ ] Device preferences
  - [ ] Party properties (i.e. party title)
- Out of scope for V1 release
  - [ ] Offline invitations
  - [ ] Halo recovery (requires online bot)
  - [ ] Epochs


## JW/MW

- [ ] `@dxos/protocol-plugin-replicator`
  - [ ] Don't use raw hypercore feeds - operate on FeedDescriptor instead
  - [ ] Refactor up to our code quality standards

- [ ] Mocha instead of jest
- [ ] Replace setImmediate with setTimeout()
- [ ] See if we still need tsconfig.spec.json.
- [ ] Fix/remove .js files
- [ ] Avoid using `Buffer` in types (e.g. don't depend on input parameters being `Buffer` rather then `Uint8Array`). Prefer to use `PublicKey` for keys or ids
- [ ] Devtools
- [ ] client context close error (and rename network manager close)
      ERROR Signal socket error wss://halo.dxos.org/.well-known/dx/signal WebSocket was closed before the connection was established

## DM

### Misc

- [ ] Discuss E2E testing
- [ ] Fix logger (sourcemap line number)
- [ ] Protobuf lint
- [ ] ESM?

### Per-package tech debt

- [ ] `@dxos/echo-db`
  - [ ] Fix mock imports
  - [ ] Remove dead code
  - [ ] Refactor database integration: currently space class directly depends on a specific database implementation - make specific database be injected into the space class implementation.

- [ ] `@dxos/client`
  - [ ] Fix broken services
  - [ ] Fix devtools
  - [ ] Figure out what to do with client running in local-mode (previously we passed database by pointer)

- [ ] Remove `@dxos/credentials`
- [ ] Rename `@dxos/halo-protocol` to `@dxos/credentials`

- [ ] `@dxos/keyring`
  - [ ] Move crypto stuff to @dxos/crypto

- [ ] `@dxos/crypto`
  - [ ] Remove unused functions
  - [ ] Minimize dependency on third-party crypto libraries
  - [x] remove dep on `dxos/protocols`
  - [ ] remove createId (echo-db)


## RB

- [ ] `@dxos/feed-store`
  - [ ] Refactor
  - [ ] Fix tests
  - [ ] interface abstractions
  - [x] move FeedWriter, etc. from `dxos/protocols`

- [ ] `dxos/client-services`
  - [ ] factor out invitations from client-services (and remove echo-db deps).
  - [ ] move echo-db errors to new halo module
  - [ ] move HaloInvitations from ServiceContext
  - [ ] rename service files (e.g., party-service.ts)
  - [ ] rethink ServiceContext (e.g., DataService, SpaceManager)
  - [ ] ServiceContext remove public member access
  - [ ] SpaceManager/DataInvitations constructor SigningContext
  - [ ] move from dxos/echo-db/services
  - [ ] move DataService from echo-db to client-services
  - [x] move from dxos/client
  - [x] move SpaceManager to echo-db (factor out invitations)
  - [x] remove `types.ts` files (anti-pattern)

- [x] Remove `dxos/echo-protocol`

## Phase 2

- [ ] `dxos/protocols`
  - [ ] types
    - [x] remove different keytypes (e.g., PartyKey) [discuss Dima]
  - [x] no deps from other common packages (check cycles)
  - [ ] rename Message classes (e.g., EchoEnvelope)
  - [ ] testing classes
- [ ] `dxos/feed-store`

- [x] `dxos/keys`
  - [x] PublicKey

# Misc 

- [ ] Extract crypto functions to `@dxos/crypto`. Evaluate what how much we still depend on third-party crypto libraries (sodium, hypercore).
- [ ] All packages under `./packages`
- [ ] Normalize packages (README, license, package details, etc.)
  - [ ] Beast
  - [ ] Enforce no deps out of common
- [ ] Rename (or remove?) `@dxos/protocols-toolchain`
- [ ] Cleanup protobuf definitions
