//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Issue from './Issue';

export const State = Schema.Literals(['open', 'closed', 'merged', 'draft']);
export type State = Schema.Schema.Type<typeof State>;

/**
 * A proposed change to a repository. Host-agnostic like `Repo` and `Issue`, and named by
 * `owner`/`repo`/`number` for the same reason: a preview built from a URL alone is complete.
 */
export class PullRequest extends Type.makeObject<PullRequest>(DXN.make('org.dxos.type.pullRequest', '0.1.0'))(
  Schema.Struct({
    /** Account the repository belongs to, e.g. `dxos`. */
    owner: Schema.String.pipe(Schema.annotate({ title: 'Owner' }), GeneratorAnnotation.set('internet.username')),

    /** Repository name without its owner, e.g. `dxos`. */
    repo: Schema.String.pipe(Schema.annotate({ title: 'Repository' }), GeneratorAnnotation.set('company.buzzNoun')),

    /** Number within the repository, shared with issues, e.g. `123` in `dxos/dxos#123`. */
    number: Schema.Number.pipe(Schema.annotate({ title: 'Number' })),

    title: Schema.String.pipe(Schema.annotate({ title: 'Title' }), GeneratorAnnotation.set('lorem.sentence')),

    /** Canonical web URL — stored rather than derived, since only the host knows its URL shape. */
    url: Format.URL.pipe(Schema.annotate({ title: 'URL' }), Schema.optional),

    state: State.pipe(Schema.annotate({ title: 'State' })),

    /** Login of the account that opened it. */
    author: Schema.String.pipe(Schema.annotate({ title: 'Author' }), Schema.optional),

    description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),

    /** Branch the change is proposed against, e.g. `main`. */
    baseBranch: Schema.String.pipe(Schema.annotate({ title: 'Base branch' }), Schema.optional),

    /** Branch carrying the change. */
    headBranch: Schema.String.pipe(Schema.annotate({ title: 'Head branch' }), Schema.optional),

    additions: Schema.Number.pipe(Schema.annotate({ title: 'Additions' }), Schema.optional),

    deletions: Schema.Number.pipe(Schema.annotate({ title: 'Deletions' }), Schema.optional),
  }).pipe(
    Schema.annotate({ title: 'Pull request', description: 'A proposed change to a repository.' }),
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--git-pull-request--regular', hue: 'neutral' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link PullRequest}. */
export const make = (props: Obj.MakeProps<typeof PullRequest>): PullRequest => Obj.make(PullRequest, props);

/** Returns true when value is a PullRequest object. */
export const instanceOf = (value: unknown): value is PullRequest => Obj.instanceOf(PullRequest, value);

/** `owner/repo#123` — the same reference form as an issue, since the numbers share one sequence. */
export const reference = Issue.reference;
