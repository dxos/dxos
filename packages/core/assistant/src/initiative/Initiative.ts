import * as Schema from 'effect/Schema';
import { Obj, Type } from '@dxos/echo';

export const Initiative = Schema.Struct({
  name: Schema.String,
  artifacts: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      data: Type.Ref(Obj.Any),
    }),
  ),
  chats: Schema.Array(Type.Ref(Chat)),
});
