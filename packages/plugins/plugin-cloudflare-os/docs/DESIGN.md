# Cloudflare OS plugin: design

Composer is the frontend; a Cloudflare OS deployment is the backend for gadgets, its agent and its
gatekeepers. ECHO remains the system of record for everything else in the space.

## The contract

Cloudflare OS has no REST or MCP surface. The Workshop frontend talks to its kernel over one Cap'n Web
session at `wss://<deployment>/api`, typed by `packages/workshop-shared/src/api.ts` upstream. That file
says it exists to allow alternative clients. The package is unpublished and moves with each
deployment, so this plugin vendors only the calls it makes (`src/api/protocol.ts`) and must follow
upstream changes by hand.

## Authentication

A deployment behind Cloudflare Access refuses `/api` from any other origin and needs an email claim
in the Access JWT. A browser cannot add Access headers to a WebSocket, so Composer cannot use such a
deployment. The plugin uses the deployment's own password sign-in instead, which accepts requests
from any origin and authenticates in-band:

1. The connector form takes the deployment URL, a username and a password.
2. The plugin computes argon2id over the password, salted with the service salt plus the username, as
   the Workshop frontend does, and calls `login()`.
3. The returned session token is stored as the connection's `AccessToken`; its `source` is the
   deployment's hostname, so the token also says where it is valid.
4. Every later session calls `authenticate(token)`.

## Mapping

| Cloudflare OS     | Composer                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Account           | `Connection` + `AccessToken` (connector `cloudflare-os`)            |
| Workspace         | `Workspace` object, one per space, the connection's sync target     |
| Gadget            | Entry in `Workspace.gadgets`; runs in `GadgetFrame` in the article  |
| Chat + agent      | Agent `cloudflare-os` in the chat's agent picker                    |
| Proposed changes  | Request block: accept (`mergeChanges`) or revert (`revertChanges`)  |
| Gatekeeper action | Request block: approve (`approveAction`) or reject (`rejectAction`) |

A Composer chat records the workspace chat it continues as a foreign key (`cloudflare-os-chat`), so
each turn after the first calls `sendChatMessage` on the same workspace chat.

## Following a turn

A turn sends the prompt, then polls the workspace chat every 1.5 s: each poll is one HTTP batch request
(`getChatHistory` and `listChats`, pipelined after `authenticate` and `openWorkspace`). Messages past
the chat's last sequence before the prompt are added to the Composer chat; the turn ends when the
chat's `activeAgent` clears after it was seen running or answered. A WebSocket subscription was the
first design; a dropped socket ended it silently and left the turn waiting after the agent had
finished.

## Gadget sandbox

`GadgetFrame` reproduces the Workshop's `GadgetUI`: the gadget's UI bundle is loaded with `srcdoc`
into a frame sandboxed to scripts and user-opened popups, with a CSP that forbids every network
request. A prelude imports Cap'n Web from a `data:` URL and posts a `MessagePort` to the parent; the
plugin bridges that port to `GadgetClient.connectToGadget()`. A `srcdoc` frame inherits the parent's
CSP, so a host page whose CSP forbids `data:` scripts cannot run gadgets. The web app sets none.

## Not yet

- Account connect flows for gatekeepers (GitHub, Google…) complete only on the deployment's own
  origin; connect them in the Workshop.
- Streaming text deltas: a turn's messages are added as each one completes, not token by token.
- Workspace collaborators are not mirrored from space members.
- Cloudflare OS agents reaching ECHO, through `gatekeeper-mcp` and the DXOS MCP server.
