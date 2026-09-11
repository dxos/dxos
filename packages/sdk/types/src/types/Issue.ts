//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

export const State = Schema.Literals(['open', 'closed']);
export type State = Schema.Schema.Type<typeof State>;

/**
 * An issue in a repository's tracker. Host-agnostic like `Repo`: which service tracks it is
 * provenance, carried by `Obj.getMeta` foreign keys, not by the type. Names its repository by
 * `owner`/`repo` rather than a reference so a preview built from a URL alone is complete.
 */
export class Issue extends Type.makeObject<Issue>(DXN.make('org.dxos.type.issue', '0.1.0'))(
  Schema.Struct({
    /** Account the repository belongs to, e.g. `dxos`. */
    owner: Schema.String.pipe(Schema.annotate({ title: 'Owner' }), GeneratorAnnotation.set('internet.username')),

    /** Repository name without its owner, e.g. `dxos`. */
    repo: Schema.String.pipe(Schema.annotate({ title: 'Repository' }), GeneratorAnnotation.set('company.buzzNoun')),

    /** Number within the repository, e.g. `123` in `dxos/dxos#123`. */
    number: Schema.Number.pipe(Schema.annotate({ title: 'Number' })),

    title: Schema.String.pipe(Schema.annotate({ title: 'Title' }), GeneratorAnnotation.set('lorem.sentence')),

    /** Canonical web URL — stored rather than derived, since only the host knows its URL shape. */
    url: Format.URL.pipe(Schema.annotate({ title: 'URL' }), Schema.optional),

    state: State.pipe(Schema.annotate({ title: 'State' })),

    /** Login of the account that opened it. */
    author: Schema.String.pipe(Schema.annotate({ title: 'Author' }), Schema.optional),

    description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),

    labels: Schema.Array(Schema.String).pipe(Schema.annotate({ title: 'Labels' }), Schema.optional),
  }).pipe(
    Schema.annotate({ title: 'Issue', description: "An issue in a repository's tracker." }),
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--circle-dot--regular', hue: 'neutral' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Issue}. */
export const make = (props: Obj.MakeProps<typeof Issue>): Issue => Obj.make(Issue, props);

/** Returns true when value is an Issue object. */
export const instanceOf = (value: unknown): value is Issue => Obj.instanceOf(Issue, value);

/** `owner/repo#123` — derived, so it cannot disagree with the parts it is built from. */
export const reference = (issue: Pick<Issue, 'owner' | 'repo' | 'number'>): string =>
  `${issue.owner}/${issue.repo}#${issue.number}`;
