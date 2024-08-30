import { create } from '@dxos/echo-schema';
import type { MeetingRoomType } from '../types';
import { useEffect, useState } from 'react';
import { batch } from '@preact/signals-core';
import { getSpace, type Space } from '@dxos/client/echo';
import type { Client } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { log } from '@dxos/log';
import type { Identity } from '@dxos/client/halo';

export type RoomState = {
  participants: {
    id: string;
    name: string;
  }[];
  isJoined: boolean;
};

const INITIAL_STATE: RoomState = {
  participants: [],
  isJoined: false,
};

export class MeetModel {
  private _client?: Client = undefined;
  private _space?: Space = undefined;
  private _room?: MeetingRoomType = undefined;
  private _joinedWithIdentity?: Identity = undefined;

  public state = create<RoomState>(INITIAL_STATE);

  constructor() {}

  // Synchronous to interface with React better.
  // Idempotent.
  initialize(client: Client, room: MeetingRoomType) {
    this._client = client;
    this._room = room;
    this._space = getSpace(room);
  }

  // Synchronous to interface with React better.
  // Idempotent.
  destroy() {
    this._room = undefined;
    this._space = undefined;
    this._joinedWithIdentity = undefined;
    Object.assign(this.state, INITIAL_STATE);
  }

  join() {
    if (!this._client) {
      return;
    }
    const identity = this._client.halo.identity.get();
    if (!identity) {
      log.warn('Cannot join meeting room without identity.');
      return;
    }
    this._joinedWithIdentity = identity;
    batch(() => {
      this.state.isJoined = true;
      this.state.participants = [
        { id: identity.identityKey.toHex(), name: identity.profile?.displayName ?? identity.identityKey.toHex() },
      ];
    });
  }

  leave() {
    if (!this._joinedWithIdentity) {
      return;
    }
    batch(() => {
      this.state.isJoined = false;
      this.state.participants = this.state.participants.filter(
        (participant) => participant.id !== this._joinedWithIdentity!.identityKey.toHex(),
      );
    });
  }
}

export const useMeetModel = (room: MeetingRoomType) => {
  const client = useClient();
  const [model] = useState(() => new MeetModel());

  useEffect(() => {
    model.initialize(client, room);
    return () => model.destroy();
  }, [client, room]);

  return model;
};
