//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { type Context } from '@dxos/context';
import { EdgeHttpClient, type JoinCallRoomResponse } from '@dxos/edge-client';

export type RoomJoinRequest = {
  roomId: string;
  /** HALO device key hex (== swarm `UserState.id`). */
  deviceKey: string;
  /** Existing meeting id coordinated via the swarm; omitted by the first joiner. */
  meetingId?: string;
};

/** Resolves a RealtimeKit meeting + participant auth token for a room, authenticated as the caller. */
export type RoomJoiner = (ctx: Context, request: RoomJoinRequest) => Promise<JoinCallRoomResponse>;

/**
 * Room joiner backed by the authenticated {@link EdgeHttpClient} (the same client the AI provider uses),
 * pointed at the calls-service. `setIdentity` runs per call so the verifiable-presentation auth header
 * tracks the current HALO identity; the RealtimeKit API token never reaches the client.
 */
export const createEdgeRoomJoiner = (client: Client): RoomJoiner => {
  const httpClient = new EdgeHttpClient(getEdgeServiceEndpoint(client.config, EdgeServiceName.Calls));
  return (ctx, request) => {
    if (client.halo.identity.get()) {
      httpClient.setIdentity(createEdgeIdentity(client));
    }
    return httpClient.joinCallRoom(ctx, request);
  };
};
