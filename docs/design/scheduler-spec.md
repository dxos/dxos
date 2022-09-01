Re: 

# Spec
- Simple install (on all platforms) along with (or part of) current `kube` install/update mech.
- Isolation (processes cannot access/influence each other's state).
- Support 50 concurrent processes (8-16G). [100-200M per instance].
- Life cycle management: start, stop, restart, hydrate, rehydrate on machine reboot.
- Basic security (HALO credential required to deploy/initiate).
  - Signed operations.
  - Root credential from KUBE.
- Basic presence management.
- Monitoring (via curl, CLI, etc.)

# Issues
- Deno migration
  - Go support: (WebRTC, Web crypto, storage, etc.) [also benefits HALO work]
  - Create Go-bridge for WebRTC.

# Plan
- [ ] Create Deno scheduler and life-cycle (Go).
- [ ] Create WebRTC bridge (Go).
- [ ] CLI integration.
- [ ] Defer other DXOS deps to HALO refactoring.

