//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { DataType } from '@dxos/schema';

/**
 * Source script.
 */
export const Script = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  // TODO(burdon): Change to hash of deployed content.
  // Whether source has changed since last deploy.
  changed: Schema.Boolean.pipe(FormAnnotation.set(false), Schema.optional),
  source: Type.Ref(DataType.Text).pipe(FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Script',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);
export interface Script extends Schema.Schema.Type<typeof Script> {}

type Props = Omit<Obj.MakeProps<typeof Script>, 'source'> & { source?: string };

export const make = ({ source = '', ...props }: Props = {}) =>
  Obj.make(Script, { ...props, source: Ref.make(DataType.makeText(source)) });
