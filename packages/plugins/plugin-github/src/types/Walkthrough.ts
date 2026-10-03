//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { PullRequest } from '@dxos/types';

/**
 * A narrated reading of a pull request: one markdown document whose prose, headings and ```diff
 * fences describe the change in the order a reviewer should meet it.
 *
 * Generated against ONE commit and stale the moment the branch moves, which is why `commit` is part
 * of the record rather than something to infer — see {@link isStale}.
 */
export class Walkthrough extends Type.makeObject<Walkthrough>(DXN.make('org.dxos.type.walkthrough', '0.1.0'))(
  Schema.Struct({
    /** The pull request this narrates. */
    pullRequest: Ref.Ref(PullRequest.PullRequest),

    /** `owner/repo#123: title`, copied at generation so the label needs no ref load. */
    title: Schema.String.pipe(Schema.annotate({ title: 'Title' }), Schema.optional),

    /**
     * The whole document, as a plain string rather than a text object.
     *
     * A walkthrough is replaced wholesale on every regeneration and is never co-edited character by
     * character, so the CRDT a text object would impose is pure cost: it would keep per-character
     * history for a document nobody edits.
     */
    body: Schema.String.pipe(Schema.annotate({ title: 'Body' })),

    /** Head SHA the walkthrough was generated from; anything else means it describes another change. */
    commit: Schema.String.pipe(Schema.annotate({ title: 'Commit' })),

    generatedAt: Format.DateTime.pipe(Schema.annotate({ title: 'Generated' }), Schema.optional),

    /** Model that produced the prose, so a regression can be attributed after the default moves. */
    model: Schema.String.pipe(Schema.annotate({ title: 'Model' }), Schema.optional),

    /** Hunks the prose accounts for, over the patch's total — how much of the change it narrates. */
    covered: Schema.Number.pipe(Schema.annotate({ title: 'Hunks covered' }), Schema.optional),
    total: Schema.Number.pipe(Schema.annotate({ title: 'Hunks total' }), Schema.optional),
  }).pipe(
    Schema.annotate({ title: 'Walkthrough', description: 'A narrated reading of a pull request.' }),
    LabelAnnotation.set(['title', 'commit']),
    Annotation.IconAnnotation.set({ icon: 'ph--path--regular', hue: 'indigo' }),
    Annotation.UserType.set(),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Walkthrough}. */
export const make = (props: Obj.MakeProps<typeof Walkthrough>): Walkthrough => Obj.make(Walkthrough, props);

/** Returns true when value is a Walkthrough object. */
export const instanceOf = (value: unknown): value is Walkthrough => Obj.instanceOf(Walkthrough, value);

/** The label a walkthrough of this pull request carries. */
export const makeTitle = (pullRequest: PullRequest.PullRequest, title = pullRequest.title): string =>
  `${PullRequest.reference(pullRequest)}: ${title}`;

/** Whether the walkthrough describes a commit other than the one given. */
export const isStale = (walkthrough: Walkthrough, head: string): boolean => walkthrough.commit !== head;
