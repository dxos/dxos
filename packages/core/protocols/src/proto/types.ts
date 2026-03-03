//
// Copyright 2024 DXOS.org
//

import { type TypedProtoMessage } from '@dxos/codec-protobuf';

import { type TYPES } from './gen/index.ts';

// TODO(burdon): Rename ProtocolMessage.
export type TypedMessage = TypedProtoMessage<TYPES>;
