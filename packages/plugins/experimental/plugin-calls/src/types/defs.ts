//
// Copyright 2025 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import {
  UserStateSchema,
  type RoomStateSchema,
  type UserState as UserStateProto,
} from '@dxos/protocols/buf/dxos/edge/calls_pb';

export type UserState = buf.MessageInitShape<typeof UserStateSchema>;

export type RoomState = buf.MessageInitShape<typeof RoomStateSchema>;

export const codec = {
  encode: (message: buf.MessageInitShape<typeof UserStateSchema>): Uint8Array =>
    buf.toBinary(UserStateSchema, buf.create(UserStateSchema, message)),
  decode: (message: Uint8Array): UserStateProto => buf.fromBinary(UserStateSchema, message),
};
