//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

import { Blueprint } from './blueprint';

/**
 * Thread message that binds or unbinds blueprints to a conversation.
 */
export const BlueprintBinding = Schema.Struct({
  /**
   * Blueprints added to a conversation.
   */
  added: Schema.Array(Type.Ref(Blueprint)),

  /**
   * Blueprints removed from a conversation.
   */
  removed: Schema.Array(Type.Ref(Blueprint)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/BlueprintBinding',
    version: '0.1.0',
  }),
);
export interface BlueprintBinding extends Schema.Schema.Type<typeof BlueprintBinding> {}
