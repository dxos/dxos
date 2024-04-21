//
// Copyright 2024 DXOS.org
//

import { type Env } from 'hono';

// TODO(burdon): Web sockets server.
//  https://developers.cloudflare.com/durable-objects/api/websockets
//  https://developers.cloudflare.com/durable-objects/examples/websocket-server

// TODO(burdon): Rust: https://github.com/cloudflare/workers-rs?tab=readme-ov-file#durable-objects

export class SignalingObject {
  constructor(
    private readonly _state: DurableObjectState,
    private readonly _env: Env,
  ) {}

  async fetch(request: Request) {
    console.log('##############');
    return Response.json({ test: 123 });
  }
}
