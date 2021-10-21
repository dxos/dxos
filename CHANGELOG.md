# Change Log

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
  - [ ] useInvitation
  - [ ] useOfflineInvitation (merge with useInvitation)
  - [ ] useInvitationRedeemer
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
  - [ ] RedeemDialog
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
