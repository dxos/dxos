//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Relation, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

/** What an agent makes to show that a feature or a task works: a write-up plus the artifacts that prove it. */
export class Showcase extends Type.makeObject<Showcase>(DXN.make('org.dxos.type.showcase', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),

    /** What was shown and how to reproduce it. */
    content: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),

    /**
     * The evidence: screenshots and videos (`File`), the pull requests the work landed in, and anything else
     * that shows the result. Refs rather than owned children, as for `Task.artifacts`: a PR belongs to its
     * repository and a file may be filed elsewhere, so deleting the showcase must not cascade to them.
     */
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(
      Annotation.FormInputAnnotation.set(false),
      Schema.annotate({ title: 'Artifacts' }),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--presentation-chart--regular', hue: 'amber' }),
    Annotation.UserType.set(),
  ),
) {}

type MakeProps = Pick<Obj.MakeProps<typeof Showcase>, 'name'> &
  Partial<Pick<Obj.MakeProps<typeof Showcase>, 'artifacts'>> & {
    /** Markdown body; wrapped in an owned `Text`. */
    content?: string;
  };

export const make = ({ content = '', ...props }: MakeProps): Showcase =>
  Obj.make(Showcase, { artifacts: [], ...props, content: Ref.make(Text.make({ content })) });

export const instanceOf = (value: unknown): value is Showcase => Obj.instanceOf(Showcase, value);

/** Source showcase demonstrates the target, which is a `Feature` or a `Task`. */
export class Demonstrates extends Type.makeRelation<Demonstrates>(DXN.make('org.dxos.relation.demonstrates', '0.1.0'))({
  source: Showcase,
  target: Obj.Unknown,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeDemonstrates = (props: Relation.MakeProps<typeof Demonstrates>) => Relation.make(Demonstrates, props);
