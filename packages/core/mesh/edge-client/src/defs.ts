//
// Copyright 2024 DXOS.org
//

import { SwarmRequestSchema, SwarmResponseSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { Protocol } from './protocol';

export const protocol = new Protocol([SwarmRequestSchema, SwarmResponseSchema, TextMessageSchema]);
