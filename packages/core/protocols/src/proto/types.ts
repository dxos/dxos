//
// Copyright 2024 DXOS.org
//

import { type TypedProtoMessage } from '@dxos/codec-protobuf';

import { type TYPES } from './gen/index.js';

// TODO(burdon): Rename ProtocolMessage.
export type TypedMessage = TypedProtoMessage<TYPES>;
