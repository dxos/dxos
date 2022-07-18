//
// Copyright 2020 DXOS.org
//

import { SignalData } from 'simple-peer';

import { PublicKey } from '@dxos/protocols';

// TODO(burdon): Define message types as protobuf.

export namespace SignalApi {
  export enum State {
    /** Connection is being established. */
    CONNECTING = 'CONNECTING',

    /** Connection is being re-established. */
    RE_CONNECTING = 'RE_CONNECTING',

    /** Connected. */
    CONNECTED = 'CONNECTED',

    /** Server terminated the connection. Socket will be reconnected. */
    DISCONNECTED = 'DISCONNECTED',

    /** Socket was closed. */
    CLOSED = 'CLOSED'
  }

  export type Status = {
    host: string
    state: State
    error?: string
    reconnectIn: number
    connectionStarted: number
    lastStateChange: number
  }

  export type CommandTrace = {
    messageId: string
    host: string
    incoming: boolean
    time: number
    method: string
    payload: any
    response?: any
    error?: string
  }

  export type SignalMessage = {
    /**
     *  Sender's public key.
     */
    id: PublicKey
    /**
     *  Receiver`s public key.
     */
    remoteId: PublicKey
    topic: PublicKey
    sessionId: PublicKey
    data: SignalData
  }

  export type Answer = {
    accept: boolean
  }
}
