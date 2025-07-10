import { Schema } from 'effect';
import { Blueprint } from './blueprint';
import { Type } from '@dxos/echo';

/**
 * Thread message that binds or unbinds blueprints to a conversation.
 */
export const BlueprintBinding = Schema.Struct({
  /**
   * Blueprints added to a conversation.
   */
  added: Type.Ref(Blueprint),

  /**
   * Blueprints removed from a conversation.
   */
  removed: Type.Ref(Blueprint),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/BlueprintBinding',
    version: '0.1.0',
  }),
);
