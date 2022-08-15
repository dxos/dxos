//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Factor out constants to client.
export const WRN_TYPE_BOT = 'wrn:bot';
export const WRN_TYPE_BOT_FACTORY = 'wrn:bot-factory';

// Registry client has no types.
export interface QueryRecord {
  attributes: {
    version: string
    name: string
    topic: string
    keywords?: string[]
  }
  names: string[]
}
