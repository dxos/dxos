//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { meta } from '#meta';

export class Spec extends Type.makeObject<Spec>(DXN.make('org.dxos.type.spec', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Owned body: `SetParent` cascades it with the spec. */
    content: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: meta.profile.icon?.key ?? 'ph--code--regular', hue: meta.profile.icon?.hue }),
  ),
) {}

export const isSpec = (object: unknown): object is Spec =>
  Schema.is(Type.getSchema(Spec) as Schema.Schema<Spec>)(object);

export const make = ({ content = DEFAULT_SPEC_CONTENT, ...props }: Partial<{ name: string; content: string }> = {}) => {
  return Obj.make(Spec, { ...props, content: Ref.make(Text.make({ content })) });
};

const DEFAULT_SPEC_CONTENT = trim`
  ---
  id: com.example.spec
  name: Example spec
  version: 0.1.0
  ---

  This is an example spec.
`;
