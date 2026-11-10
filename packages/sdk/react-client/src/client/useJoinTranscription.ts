//
// Copyright 2026 DXOS.org
//

import { useContext, useMemo } from 'react';

import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { Context } from '@dxos/context';

import { ClientContext } from './context.ts';

/** Mints a participant token for this identity's one-person RealtimeKit transcription meeting. */
export type JoinTranscription = () => Promise<{ authToken: string }>;

/**
 * Hook returning the authenticated join for live transcription (`<edge>/calls/transcription/join`), or `undefined` when
 * EDGE is not configured — so a transcription control can stay disabled instead of failing once pressed.
 *
 * Returns `undefined` outside a `ClientProvider` rather than throwing, for the same reason as
 * {@link useEdgeServiceEndpoint}: its callers are app-wide drivers that render before the client arrives.
 */
export const useJoinTranscription = (): JoinTranscription | undefined => {
  const client = useContext(ClientContext)?.client;
  const configured = client ? getEdgeServiceEndpoint(client.config, EdgeServiceName.Calls) !== undefined : false;
  return useMemo(
    () => (client && configured ? () => client.edge.http.joinTranscription(Context.default()) : undefined),
    [client, configured],
  );
};
