//
// Copyright 2026 DXOS.org
//

import { type Context } from '@dxos/context';
import { type EdgeHttpClient, type JoinCallRoomRequest, type JoinCallRoomResponse } from '@dxos/edge-client';

/** Resolves a RealtimeKit meeting and a participant token for a room, authenticated as the caller. */
export type RoomJoiner = (ctx: Context, request: JoinCallRoomRequest) => Promise<JoinCallRoomResponse>;

/** Room joiner backed by the client's EDGE HTTP client, so the RealtimeKit API token never reaches the client. */
export const createEdgeRoomJoiner =
  (edge: Pick<EdgeHttpClient, 'joinCallRoom'>): RoomJoiner =>
  (ctx, request) =>
    edge.joinCallRoom(ctx, request);
