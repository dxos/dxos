//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Ref, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
>>>>>>> main
import { Thread } from '@dxos/types';

const _Channel = Schema.Struct({
  name: Schema.optional(Schema.String),
<<<<<<< HEAD
  defaultThread: Type.Ref(Thread.Thread).pipe(Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
  defaultThread: Type.Ref(Thread.Thread).pipe(FormAnnotation.set(false)),
=======
  defaultThread: Type.Ref(Thread.Thread).pipe(FormInputAnnotation.set(false)),
>>>>>>> main
  // TODO(wittjosiah): Should be an "ordered collection".
<<<<<<< HEAD
  threads: Type.Ref(Thread.Thread).pipe(Schema.Array, Schema.mutable, Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
  threads: Type.Ref(Thread.Thread).pipe(Schema.Array, Schema.mutable, FormAnnotation.set(false)),
=======
  threads: Type.Ref(Thread.Thread).pipe(Schema.Array, Schema.mutable, FormInputAnnotation.set(false)),
>>>>>>> main
}).pipe(Type.Obj({ typename: 'dxos.org/type/Channel', version: '0.1.0' }));
export interface Channel extends Schema.Schema.Type<typeof _Channel> {}
export interface ChannelEncoded extends Schema.Schema.Encoded<typeof _Channel> {}
export const Channel: Schema.Schema<Channel, ChannelEncoded> = _Channel;

export const make = (props: Pick<Obj.MakeProps<typeof Channel>, 'name'> = {}) =>
  Obj.make(Channel, {
    ...props,
    defaultThread: Ref.make(Obj.make(Thread.Thread, { messages: [], status: 'active' })),
    threads: [],
  });
