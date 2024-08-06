//
// Copyright 2024 DXOS.org
//

import { SwarmRequest, SwarmResponse, TextMessage } from './messenger_pb';
import { Protocol } from './protocol';

export const protocol = new Protocol([SwarmRequest, SwarmResponse, TextMessage]);
