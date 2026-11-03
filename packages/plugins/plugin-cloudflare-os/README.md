# @dxos/plugin-cloudflare-os

Uses a [Cloudflare OS](https://github.com/cloudflare/cloudflare-os) deployment as a backend for a Composer space.

- **Connector.** Sign in to a deployment with a username and password. The password is hashed in the browser and exchanged for a session token, which is the only thing stored.
- **One workspace per space.** Binding the connection to the space picks one of the account's workspaces, or creates one, and stores it as a `Workspace` object.
- **Gadgets.** The workspace article lists the workspace's gadgets and runs the picked one in the same sandbox Cloudflare OS uses: a null-origin frame with no network, talking to its server over a `MessagePort`.
- **Agent.** The workspace's agent appears in Composer's agent picker. Its proposed gadget changes and the actions it queues behind a gatekeeper come back as approval cards in the chat.

The plugin talks to the deployment over Cap'n Web, against the subset of the Workshop API declared in `src/api/protocol.ts`.

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the spec and [`docs/DESIGN.md`](./docs/DESIGN.md) for the design and its open questions.
