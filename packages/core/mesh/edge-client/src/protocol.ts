//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { buf, bufWkt } from '@dxos/protocols/buf';
import { type Message, MessageSchema, type PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { bufferToArray } from '@dxos/util';

export type PeerData = buf.MessageInitShape<typeof PeerSchema>;

export const getTypename = (typeName: string) => `type.googleapis.com/${typeName}`;

/**
 * NOTE: The type registry should be extended with all message types.
 */
export class Protocol {
  private readonly _typeRegistry: buf.Registry;

  constructor(types: buf.DescMessage[]) {
    this._typeRegistry = buf.createRegistry(...types);
  }

  get typeRegistry(): buf.Registry {
    return this._typeRegistry;
  }

  toJson(message: Message): any {
    try {
      return buf.toJson(MessageSchema, message, { registry: this.typeRegistry });
    } catch (err) {
      return { type: this.getPayloadType(message) };
    }
  }

  /**
   * Return the payload with the given type.
   */
  getPayload<Desc extends buf.DescMessage>(message: Message, type: Desc): buf.MessageShape<Desc> {
    invariant(message.payload);
    const payloadTypename = this.getPayloadType(message);
    if (type && type.typeName !== payloadTypename) {
      throw new Error(`Unexpected payload type: ${payloadTypename}; expected ${type.typeName}`);
    }

    invariant(bufWkt.anyIs(message.payload, type), `Unexpected payload type: ${payloadTypename}}`);
    const payload = bufWkt.anyUnpack(message.payload, this.typeRegistry) as buf.MessageShape<Desc>;
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
  createMessage<Desc extends buf.DescMessage>(
    type: Desc,
    {
      source,
      target,
      payload,
      serviceId,
    }: {
      source?: PeerData;
      target?: PeerData[];
      payload?: buf.MessageInitShape<Desc>;
      serviceId?: string;
    },
  ): Message {
    return buf.create(MessageSchema, {
      timestamp: new Date().toISOString(),
      source,
      target,
      serviceId,
      payload: payload ? bufWkt.anyPack(type, buf.create(type, payload)) : undefined,
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
