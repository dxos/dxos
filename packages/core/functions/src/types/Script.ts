//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

/**
 * Source script.
 */
export const Script = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  // TODO(burdon): Change to hash of deployed content.
  // Whether source has changed since last deploy.
  changed: Schema.Boolean.pipe(FormInputAnnotation.set(false), Schema.optional),
  source: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.script',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--code--regular',
    hue: 'sky',
  }),
);

export interface Script extends Schema.Schema.Type<typeof Script> {}

type Props = Omit<Obj.MakeProps<typeof Script>, 'source'> & { source?: string };

export const make = ({ source = '', ...props }: Props = {}): Script =>
  Obj.make(Script, { ...props, source: Ref.make(Text.make({ content: source })) });
