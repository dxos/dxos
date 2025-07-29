//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

import { Blueprint } from '../blueprint';
/**
 * Thread message that binds or unbinds contextual objects to a conversation.
 */
// TODO(burdon): Make ContentBlock.
export const ContextBinding = Schema.Struct({
  blueprints: Schema.Struct({
    added: Schema.Array(Type.Ref(Blueprint)),
    removed: Schema.Array(Type.Ref(Blueprint)),
  }),

  // TODO(burdon): Type.Expando => Type.Obj (or Obj.Any?)
  objects: Schema.Struct({
    added: Schema.Array(Type.Ref(Type.Expando)),
    removed: Schema.Array(Type.Ref(Type.Expando)),
  }),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ContextBinding',
    version: '0.1.0',
  }),
);

export interface ContextBinding extends Schema.Schema.Type<typeof ContextBinding> {}
