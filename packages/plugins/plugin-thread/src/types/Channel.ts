//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Thread } from '@dxos/types';

// TODO(burdon): What is the difference between Thread and Channel.
export const Channel = Schema.Struct({
  name: Schema.optional(Schema.String),
  defaultThread: Ref.Ref(Thread.Thread).pipe(FormInputAnnotation.set(false)),
  // TODO(wittjosiah): Should be an "ordered collection".
  threads: Ref.Ref(Thread.Thread).pipe(Schema.Array, FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.channel',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--hash--regular',
    hue: 'rose',
  }),
);

export interface Channel extends Schema.Schema.Type<typeof Channel> {}

export const make = (props: Pick<Obj.MakeProps<typeof Channel>, 'name'> = {}) =>
  Obj.make(Channel, {
    ...props,
    defaultThread: Ref.make(Obj.make(Thread.Thread, { messages: [], status: 'active' })),
    threads: [],
  });
