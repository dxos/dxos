//
// Copyright 2025 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import {
  type ActivitySchema,
  type UserState as UserStateProto,
  UserStateSchema,
} from '@dxos/protocols/buf/dxos/edge/calls_pb';

import { type TrackKind } from './media-transport.ts';

export type UserState = buf.MessageInitShape<typeof UserStateSchema>;

export type ActivityState = buf.MessageInitShape<typeof ActivitySchema>;

export const codec = {
  encode: (message: UserState): Uint8Array => {
    return buf.toBinary(UserStateSchema, buf.create(UserStateSchema, message));
  },
  decode: (message: Uint8Array): UserStateProto => {
    return buf.fromBinary(UserStateSchema, message);
  },
};

/** Identifies a remote track by its publishing device (== swarm `UserState.id`) and kind. */
export type RemoteTrackKey = `${string}/${TrackKind}`;

export const remoteTrackKey = (deviceKey: string, kind: TrackKind): RemoteTrackKey => `${deviceKey}/${kind}`;
