//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out into client/server bot lib.

// KUBE bot service endpoint.
// TODO(burdon): NOTE: This is the initial proxy server.
export const DX_BOT_SERVICE_PORT = 7100; // TODO(burdon): Rename SERVICE.

// Port exposed to bot service by the bot's container (see Dockerfile).
export const DX_BOT_CONTAINER_RPC_PORT = 7400;
