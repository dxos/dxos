//
// Copyright 2023 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import { UserStateSchema, type UserState } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Space, isSpace } from '@dxos/react-client/echo';

import { CALLS_PLUGIN } from './meta';

export const codec = {
  encode: (message: buf.MessageInitShape<typeof UserStateSchema>): Uint8Array =>
    buf.toBinary(UserStateSchema, buf.create(UserStateSchema, message)),
  decode: (message: Uint8Array): UserState => buf.fromBinary(UserStateSchema, message),
};

/**
 * Endpoint to the calls service.
 */
export const CALLS_URL = 'https://calls.dxos.workers.dev';
const CALLS_ACTION = `${CALLS_PLUGIN}/action`;

export enum CallsAction {
  CREATE = `${CALLS_ACTION}/create`,
}

export type Call = {
  type: string;
  space: Space;
};

export const isCall = (data: any): data is Call => data.type === `${CALLS_PLUGIN}/space` && isSpace(data.space);
