//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

import * as Thread from './Thread';

const _Channel = Schema.Struct({
  name: Schema.optional(Schema.String),
  defaultThread: Type.Ref(Thread.Thread).pipe(FormInputAnnotation.set(false)),
  // TODO(wittjosiah): Should be an "ordered collection".
  threads: Type.Ref(Thread.Thread).pipe(Schema.Array, Schema.mutable, FormInputAnnotation.set(false)),
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
