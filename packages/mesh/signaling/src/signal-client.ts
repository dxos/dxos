import { PublicKey } from "packages/common/protocols/dist/src"
import { Any } from "./proto/gen/google/protobuf"

export enum SignalState {
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

export type SignalStatus = {
  host: string
  state: SignalState
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


export interface SignalClient {
  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join: (topic: PublicKey, peerId: PublicKey) => Promise<void>

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave: (topic: PublicKey, peerId: PublicKey) => Promise<void>

  /**
   * Send message to peer.
   */
  message: (author: PublicKey, recipient: PublicKey, payload: Any) => Promise<void>

  /**
   * Start receiving messages from 
   */
  subscribeMessages: (peerId: PublicKey)  => Promise<void>
}