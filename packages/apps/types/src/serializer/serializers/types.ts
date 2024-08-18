//
// Copyright 2024 DXOS.org
//

import { type Expando } from '@dxos/echo-schema';

export type SerializerMap = Record<string, TypedObjectSerializer>;

export interface TypedObjectSerializer<T extends Expando = Expando> {
  serialize(params: { object: T; serializers: SerializerMap }): Promise<string>;

  /**
   * @param params.content
   * @param params.serializers
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: { content: string; newId?: boolean; serializers: SerializerMap }): Promise<T>;
}
