//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out into client/server bot lib.

// KUBE bot service endpoint.
// TODO(burdon): NOTE: This is the initial proxy server.
export const DX_BOT_SERVICE_PORT = 7100; // TODO(burdon): Rename SERVICE.

// Per-instance ports assigned to the bot for Client DXRPC.
export const DX_BOT_RPC_PORT_MIN = 7200;
export const DX_BOT_RPC_PORT_MAX = 7300;

// Port exposed to bot service by the bot's container (see Dockerfile).
export const DX_BOT_CONTAINER_RPC_PORT = 7400;
