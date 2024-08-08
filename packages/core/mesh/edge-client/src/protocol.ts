//
// Copyright 2024 DXOS.org
//

import {
  DescMessage,
  MessageInitShape,
  MessageShape,
  create,
  createRegistry,
  toJson,
  type Registry,
} from '@bufbuild/protobuf';
import { anyIs, anyPack, anyUnpack } from '@bufbuild/protobuf/wkt';

import { invariant } from '@dxos/invariant';
import { Message, MessageSchema, type Peer as PeerProto } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { bufferToArray } from '@dxos/util';

export type PeerData = Partial<PeerProto>;

export const getTypename = (typeName: string) => `type.googleapis.com/${typeName}`;

/**
 * NOTE: The type registry should be extended with all message types.
 */
export class Protocol {
  private readonly _typeRegistry: Registry;

  constructor(types: DescMessage[]) {
    this._typeRegistry = createRegistry(...types);
  }

  get typeRegistry(): Registry {
    return this._typeRegistry;
  }

  toJson(message: Message): any {
    try {
      return toJson(MessageSchema, message, { registry: this.typeRegistry });
    } catch (err) {
      return { type: this.getPayloadType(message) };
    }
  }

  /**
   * Return the payload with the given type.
   */
  getPayload<Desc extends DescMessage>(message: Message, type: Desc): MessageShape<Desc> {
    invariant(message.payload);
    const payloadTypename = this.getPayloadType(message);
    if (type && type.typeName !== payloadTypename) {
      throw new Error(`Unexpected payload type: ${payloadTypename}; expected ${type.typeName}`);
    }

    invariant(anyIs(message.payload, type), `Unexpected payload type: ${payloadTypename}}`);
    const payload = anyUnpack(message.payload, this.typeRegistry) as MessageShape<Desc>;
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
  createMessage<Desc extends DescMessage>(
    type: Desc,
    {
      source,
      target,
      payload,
    }: {
      source?: PeerData;
      target?: PeerData[];
      payload?: MessageInitShape<Desc>;
    },
  ) {
    return create(MessageSchema, {
      timestamp: new Date().toISOString(),
      source,
      target,
      payload: payload ? anyPack(type, create(type, payload)) : undefined,
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
