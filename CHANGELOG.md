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

- Test with tutorial-tasks-app

- [ ] RegistryClientInitializer
- [ ] ProfileInitializer
- [ ] ClientInitializer, ClientInitializerProperties (clean-up)
- [ ] RedeemDialog (remove hooks)

- [ ] Replace/remove hooks
  - [ ] useInvitationRedeemer
  - [ ] useOfflineInvitation
  - [ ] useInviation
  - [ ] useAuthenticator
  
- [ ] Remove functions
- [ ] Double/single quotes
- [ ] No default exports

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
