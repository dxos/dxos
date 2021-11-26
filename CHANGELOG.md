# Change Log

## [2.18.0](https://www.github.com/dxos/protocols/compare/v2.17.1...v2.18.0) (2021-11-26)


### Features

* Another fake feature to test release-please ([74da53e](https://www.github.com/dxos/protocols/commit/74da53ef7c4bea3b7b2dbd72f8d0f6d386857ca1))
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
