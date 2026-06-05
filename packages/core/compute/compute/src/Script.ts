//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
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
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--code--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.script', '0.1.0')),
);

export type Script = Type.InstanceType<typeof Script>;
type Props = Omit<Obj.MakeProps<typeof Script>, 'source'> & { source?: string };

export const make = ({ source = '', ...props }: Props = {}): Script =>
  Obj.make(Script, { ...props, source: Ref.make(Text.make({ content: source })) });
