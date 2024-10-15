//
// Copyright 2024 DXOS.org
//

import { bufWkt } from '@dxos/protocols/buf';
import { SwarmRequestSchema, SwarmResponseSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { Protocol } from './protocol';

export const protocol = new Protocol([SwarmRequestSchema, SwarmResponseSchema, TextMessageSchema, bufWkt.AnySchema]);
