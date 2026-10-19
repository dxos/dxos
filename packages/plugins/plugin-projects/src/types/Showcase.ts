//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Relation, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { File, PullRequest } from '@dxos/types';

/** What an agent makes to show that a feature or a task works: a write-up plus its screenshots, videos and PRs. */
export class Showcase extends Type.makeObject<Showcase>(DXN.make('org.dxos.type.showcase', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),

    /** What was shown and how to reproduce it. */
    content: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),

    /** Screenshots and videos; they exist only for this showcase, so it owns them. */
    media: Schema.Array(Ref.Ref(File.File)).pipe(
      Annotation.SetParent.set(),
      Annotation.FormInputAnnotation.set(false),
      Schema.annotate({ title: 'Media' }),
    ),

    /** The synced PRs the work landed in; not owned, since they belong to the repository. */
    pullRequests: Schema.Array(Ref.Ref(PullRequest.PullRequest)).pipe(Schema.annotate({ title: 'Pull requests' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--presentation-chart--regular', hue: 'amber' }),
    Annotation.UserType.set(),
  ),
) {}

type MakeProps = Pick<Obj.MakeProps<typeof Showcase>, 'name'> &
  Partial<Pick<Obj.MakeProps<typeof Showcase>, 'media' | 'pullRequests'>> & {
    /** Markdown body; wrapped in an owned `Text`. */
    content?: string;
  };

export const make = ({ content = '', ...props }: MakeProps): Showcase =>
  Obj.make(Showcase, { media: [], pullRequests: [], ...props, content: Ref.make(Text.make({ content })) });

export const instanceOf = (value: unknown): value is Showcase => Obj.instanceOf(Showcase, value);

/** Source showcase demonstrates the target, which is a `Feature` or a `Task`. */
export class Showcases extends Type.makeRelation<Showcases>(DXN.make('org.dxos.relation.showcases', '0.1.0'))({
  source: Showcase,
  target: Obj.Unknown,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeShowcases = (props: Relation.MakeProps<typeof Showcases>) => Relation.make(Showcases, props);
