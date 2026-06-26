//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { Text } from '@dxos/schema';

/**
 * Source script.
 */
export class Script extends Type.makeObject<Script>(DXN.make('org.dxos.type.script', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    // TODO(burdon): Change to hash of deployed content.
    // Whether source has changed since last deploy.
    changed: Schema.Boolean.pipe(FormInputAnnotation.set(false), Schema.optional),
    source: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
  }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

type Props = Omit<Obj.MakeProps<typeof Script>, 'source'> & { source?: string };

export const make = ({ source = '', ...props }: Props = {}): Script =>
  Obj.make(Script, { ...props, source: Ref.make(Text.make(source)) });
