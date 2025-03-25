//
// Copyright 2024 DXOS.org
//

import { type Space, isSpace } from '@dxos/react-client/echo';

import { MEETING_PLUGIN } from '../meta';

/**
 * Endpoint to the calls service.
 */
export const CALLS_URL = 'https://calls-service.dxos.workers.dev';

export namespace CallsAction {
  // const CALLS_ACTION = `${MEETING_PLUGIN}/action`;
}

export type Call = {
  type: string;
  space: Space;
};

export const isCall = (data: any): data is Call => data?.type === `${MEETING_PLUGIN}/space` && isSpace(data?.space);
