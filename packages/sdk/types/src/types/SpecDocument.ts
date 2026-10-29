//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Migration, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

/** The normative text of a spec, in the Deus language (`.mdl`), its body owned by the object. */
export class SpecDocument extends Type.makeObject<SpecDocument>(DXN.make('org.dxos.type.specDocument', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Owned body: `SetParent` cascades it with the document. */
    content: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--code--regular', hue: 'indigo' }), Annotation.UserType.set()),
) {}

export const instanceOf = (object: unknown): object is SpecDocument => Obj.instanceOf(SpecDocument, object);

export const make = ({ content = DEFAULT_CONTENT, ...props }: Partial<{ name: string; content: string }> = {}) =>
  Obj.make(SpecDocument, { ...props, content: Ref.make(Text.make({ content })) });

const DEFAULT_CONTENT = trim`
  ---
  id: com.example.spec
  name: Example spec
  version: 0.1.0
  ---

  This is an example spec.
`;

/**
 * The document as stored before its rename, under the `org.dxos.type.spec` typename. Kept solely so
 * {@link migrations} can read existing data; never constructed.
 */
export class Legacy extends Type.makeObject<Legacy>(DXN.make('org.dxos.type.spec', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
  }),
) {}

/** `org.dxos.type.spec` 0.1.0 → `org.dxos.type.specDocument` 0.1.0: the same fields under the new typename. */
export const migrations: Migration.Migration[] = [
  Migration.define({
    from: Legacy,
    to: SpecDocument,
    transform: async ({ name, content }) => ({ name, content }),
  }),
];
