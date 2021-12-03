# Change Log

### [2.18.4](https://www.github.com/dxos/protocols/compare/v2.18.3...v2.18.4) (2021-12-03)


### Features

* Protocol plugin RPC ([#707](https://www.github.com/dxos/protocols/issues/707)) ([3544390](https://www.github.com/dxos/protocols/commit/35443906a1a4010da969cca0b1a0ce23e5768290))
* Support hierarchical items and links in remote databases ([#722](https://www.github.com/dxos/protocols/issues/722)) ([ed9b639](https://www.github.com/dxos/protocols/commit/ed9b6397a477719f54f888288276ac46441dd89d))

### [2.18.3](https://www.github.com/dxos/protocols/compare/v2.18.2...v2.18.3) (2021-12-02)


### Bug Fixes

* config v1. ([#705](https://www.github.com/dxos/protocols/issues/705)) ([33c09fc](https://www.github.com/dxos/protocols/commit/33c09fc7a14f4898d96ee7ccfcd9ee7f4c504a1d))
* Incorrect model meta on re-hydrated models ([#712](https://www.github.com/dxos/protocols/issues/712)) ([ef09cea](https://www.github.com/dxos/protocols/commit/ef09cea7be45a43d1e313ce45ffb0583bcf9b4f8))
* Remove asserts around error handling [#711](https://www.github.com/dxos/protocols/issues/711) ([0606dc8](https://www.github.com/dxos/protocols/commit/0606dc86332e4fa0368a63e56fa57a1e56884953))
* Split bot definition and bot start ([#716](https://www.github.com/dxos/protocols/issues/716)) ([c5406d7](https://www.github.com/dxos/protocols/commit/c5406d7f28b7b1cf7a8bcc2ab0e75cfe861aa778))

### [2.18.2](https://www.github.com/dxos/protocols/compare/v2.18.1...v2.18.2) (2021-11-30)


### Features

* Remove invitation url slash ([#699](https://www.github.com/dxos/protocols/issues/699)) ([3f82802](https://www.github.com/dxos/protocols/commit/3f82802a434947d441d128be0b15ab4f8aad4a3d))


### Bug Fixes

* Add "chore" prefix to automatic job ([a720b44](https://www.github.com/dxos/protocols/commit/a720b44cc1f994dbefa2af230840915babb0ab8a))
* Apply code-review comments for remote database PR ([#696](https://www.github.com/dxos/protocols/issues/696)) ([f5d2486](https://www.github.com/dxos/protocols/commit/f5d2486c4ea21073248bb049f7b71f204f38c59b))
* remove model assertion ([#701](https://www.github.com/dxos/protocols/issues/701)) ([e264bc9](https://www.github.com/dxos/protocols/commit/e264bc9592fd171cc6176354b27b985a649c7f6e))

### [2.18.1](https://www.github.com/dxos/protocols/compare/v2.18.0...v2.18.1) (2021-11-26)


### Features

* Fake feature to test release please ([b32cf02](https://www.github.com/dxos/protocols/commit/b32cf027bfc64fba26a81220a9161ecaffe92af7))
* Introduce Release Pleaase ([#679](https://www.github.com/dxos/protocols/issues/679)) ([a40316c](https://www.github.com/dxos/protocols/commit/a40316c63aecb6f0bcb7e465636f74c26bfa37e0))

## [2.18.0](https://www.github.com/dxos/protocols/compare/v2.17.1...v2.18.0) (2021-11-26)


### ⚠ BREAKING CHANGES

* breaking feature to test release-please

### Features

* Another fake feature to test release-please ([74da53e](https://www.github.com/dxos/protocols/commit/74da53ef7c4bea3b7b2dbd72f8d0f6d386857ca1))
* breaking feature to test release-please ([34b1554](https://www.github.com/dxos/protocols/commit/34b1554db716e343d2b83890444ff397a6b0c0e8))
* Fake feature to test release-please ([a6ff171](https://www.github.com/dxos/protocols/commit/a6ff17116965471620730f0be1f121c85e903cd3))


### Bug Fixes

* Additional config defs for infra. ([eb4fa95](https://www.github.com/dxos/protocols/commit/eb4fa95f5d0d5ab96ae74501e7bc817f605862c3))
* **sliding-drawer:** add fixes from old react-appkit-new package ([#670](https://www.github.com/dxos/protocols/issues/670)) ([7397437](https://www.github.com/dxos/protocols/commit/73974371052faf871fb2005d7ac43f5ba503de89))

## 2021-10-11

- [ ] Config structure
  - [x] Default config (in memory swarm) [BREAKING CHANGE]
  - [ ] Default client config disable signaling (otherwise storybooks show connection warning)
  - [ ] Config structure (e.g., snapshots)

- [ ] Client API
  - [ ] Client vs echo methods (createParty, createInvitation, joinParty, etc.)
  - [ ] Normalize join/invitation methods
    - [ ] Use of InvitationAuthenticator (and defaults)
    - [ ] Options/callbacks
    - [ ] Use of PublicKey vs string
  - [ ] Construct HALO outside of ECHO and pass in? (reduce complexity)
  - [ ] useProfile type definition; displayName vs username, etc.
  - [ ] ECHO "items" should be called "objects"

- [ ] Error handling
  - [ ] Client API errors
  - [ ] Invitation flow errors
  - [ ] Global error handler, logging, reporter, etc.

- [ ] Hooks
  - [ ] Normalize THREE client invitation methods (party, offline party, halo)
  - [x] useInvitation
  - [x] useOfflineInvitation (merge with useInvitation)
  - [x] useInvitationRedeemer
  - [ ] useAuthenticator (merge with useInvitationRedeemer)

- [ ] Initializers
  - [x] Remove ErrorBoundary from ClientInitializer
  - [ ] Rethink initializers: Loading indicator until all async have finished
    - [ ] ClientInitializer, ClientInitializerProperties (clean-up)
    - [ ] RegistryClientInitializer
    - [ ] ProfileInitializer

```html
  <ClientInitializer
    client={() => Client}     // Config object or callback.
    asyncInit={[              // Async functions that are passed a constructed client object.
      createRegistry,
      createClient,
      createProfile
    ]}>
  </ClientInitializer>
```

- [ ] react-client testing
  - [x] Invitation Storybooks
  - [ ] React tests for major flows (mocha with jsdom)
  - [ ] Convert storybooks to using esapp

- [ ] react-components lib
  - [ ] Move low-level components: Fullscreen, JSON, Editable, etc.

- [ ] react-framework dialogs
  - [x] RedeemDialog
  - [ ] ProfileDialog
  - [ ] wallet components/containers

- [ ] General
  - [ ] Standard for shims (e.g., client/src/shims.d.ts vs demo/src/@types)
  - [ ] Prevent default exports
  - [ ] Prefer arrow functions

- [ ] Dependencies
  - [ ] Update Braneframe
  - [ ] Teamwork backwards compatible?
  - [ ] Update Tutorial tasks app
  - [ ] Text app, etc.
