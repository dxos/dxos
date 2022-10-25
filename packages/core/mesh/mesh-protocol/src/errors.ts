//
// Copyright 2020 DXOS.org
//

import nanoerror from 'nanoerror';

export const ERR_PROTOCOL_STREAM_CLOSED = nanoerror(
  'ERR_PROTOCOL_STREAM_CLOSED',
  'protocol closed'
);
export const ERR_PROTOCOL_INIT_INVALID = nanoerror(
  'ERR_PROTOCOL_INIT_INVALID',
  'protocol initialization invalid'
);
export const ERR_PROTOCOL_HANDSHAKE_FAILED = nanoerror(
  'ERR_PROTOCOL_HANDSHAKE_FAILED',
  'protocol handshake failed: %s'
);
export const ERR_PROTOCOL_CONNECTION_INVALID = nanoerror(
  'ERR_PROTOCOL_CONNECTION_INVALID',
  'cannot establish connection: %s'
);
export const ERR_PROTOCOL_EXTENSION_MISSING = nanoerror(
  'ERR_PROTOCOL_EXTENSION_MISSING',
  'extension missing: %s'
);

export const ERR_EXTENSION_INIT_FAILED = nanoerror(
  'ERR_EXTENSION_INIT_FAILED',
  'extension init failed: %s'
);
export const ERR_EXTENSION_HANDSHAKE_FAILED = nanoerror(
  'ERR_EXTENSION_HANDSHAKE_FAILED',
  'extension handshake failed: %s'
);
export const ERR_EXTENSION_FEED_FAILED = nanoerror(
  'ERR_EXTENSION_FEED_FAILED',
  'extension feed failed: %s'
);
export const ERR_EXTENSION_CLOSE_FAILED = nanoerror(
  'ERR_EXTENSION_CLOSE_FAILED',
  'extension close failed: %s'
);
export const ERR_EXTENSION_RESPONSE_TIMEOUT = nanoerror(
  'ERR_EXTENSION_RESPONSE_TIMEOUT',
  '%s'
);

export class ERR_EXTENSION_RESPONSE_FAILED extends nanoerror(
  'ERR_EXTENSION_RESPONSE_FAILED',
  '[extension: %s] [responseCode: %s] [message: %s]'
) {
  constructor(
    public readonly extension: string,
    public readonly responseCode: string,
    public readonly responseMessage: string
  ) {
    super(extension, responseCode, responseMessage);
  }
}
