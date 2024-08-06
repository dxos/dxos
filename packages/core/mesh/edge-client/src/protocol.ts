//
// Copyright 2024 DXOS.org
//

import {
  createRegistry,
  Any,
  type Message as ProtoMessage,
  type MessageType,
  type PartialMessage,
  type IMessageTypeRegistry,
} from '@bufbuild/protobuf';

import { invariant } from '@dxos/invariant';
import { bufferToArray } from '@dxos/util';

import { Message, type Peer as PeerProto } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

export type PeerData = PartialMessage<PeerProto>;

export const getTypename = (typeName: string) => `type.googleapis.com/${typeName}`;

/**
 * NOTE: The type registry should be extended with all message types.
 */
export class Protocol {
  private readonly _typeRegistry: IMessageTypeRegistry;

  constructor(types: MessageType[]) {
    this._typeRegistry = createRegistry(...types);
  }

  get typeRegistry(): IMessageTypeRegistry {
    return this._typeRegistry;
  }

  toJson(message: Message) {
    try {
      return message.toJson({ typeRegistry: this.typeRegistry });
    } catch (err) {
      return { type: this.getPayloadType(message) };
    }
  }

  /**
   * Return the payload with the given type.
   */
  getPayload<T extends ProtoMessage<T>>(message: Message, type: MessageType<T>): T {
    invariant(message.payload);
    const payloadTypename = this.getPayloadType(message);
    if (type && type.typeName !== payloadTypename) {
      throw new Error(`Unexpected payload type: ${payloadTypename}; expected ${type.typeName}`);
    }

    const payload = message.payload.unpack(this.typeRegistry) as T;
    invariant(payload, `Empty payload: ${payloadTypename}}`);
    return payload;
  }

  /**
   * Get the payload type.
   */
  getPayloadType(message: Message): string | undefined {
    if (!message.payload) {
      return undefined;
    }

    const [, type] = message.payload.typeUrl.split('/');
    return type;
  }

  /**
   * Create a packed message.
   */
  createMessage<T extends ProtoMessage<T>>({
    source,
    target,
    payload,
  }: {
    source?: PeerData;
    target?: PeerData[];
    payload?: T;
  }) {
    return new Message({
      timestamp: new Date().toISOString(),
      source,
      target,
      payload: payload ? Any.pack(payload) : undefined,
    });
  }
}

/**
 * Convert websocket data to Uint8Array.
 */
export const toUint8Array = async (data: any): Promise<Uint8Array> => {
  // Node.
  if (data instanceof Buffer) {
    return bufferToArray(data);
  }

  // Browser.
  if (data instanceof Blob) {
    return new Uint8Array(await (data as Blob).arrayBuffer());
  }

  throw new Error(`Unexpected datatype: ${data}`);
};
