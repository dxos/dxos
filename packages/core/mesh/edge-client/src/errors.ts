//
// Copyright 2024 DXOS.org
//

export class WebsocketClosedError extends Error {
  constructor() {
    super('WebSocket connection closed');
  }
}
