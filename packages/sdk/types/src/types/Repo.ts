//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Organization from './Organization';

/**
 * A source-code repository. Host-agnostic: which service it lives on is provenance, carried by
 * `Obj.getMeta` foreign keys (the GitHub connector writes `github.com` keys), not by the type.
 */
export class Repo extends Type.makeObject<Repo>(DXN.make('org.dxos.type.repo', '0.1.0'))(
  Schema.Struct({
    /** Repository name without its owner, e.g. `dxos`. */
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), GeneratorAnnotation.set('company.buzzNoun')),

    /** Account the repository belongs to, e.g. `dxos` — an organization or a user login. */
    owner: Schema.String.pipe(Schema.annotate({ title: 'Owner' }), GeneratorAnnotation.set('internet.username')),

    /** Canonical web URL — stored rather than derived, since only the host knows its URL shape. */
    url: Format.URL.pipe(Schema.annotate({ title: 'URL' }), GeneratorAnnotation.set('internet.url'), Schema.optional),

    description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),

    /** Branch a reference resolves against when none is named, e.g. `main`. */
    defaultBranch: Schema.String.pipe(Schema.annotate({ title: 'Default branch' }), Schema.optional),

    /** The organization the owner corresponds to, when one is modelled. */
    organization: Schema.optional(Ref.Ref(Organization.Organization).annotate({ title: 'Organization' })),
  }).pipe(
    Schema.annotate({ title: 'Repository', description: 'A source-code repository.' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--git-branch--regular', hue: 'neutral' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Repo}. */
export const make = (props: Obj.MakeProps<typeof Repo>): Repo => Obj.make(Repo, props);

/** Returns true when value is a Repo object. */
export const instanceOf = (value: unknown): value is Repo => Obj.instanceOf(Repo, value);

/** `owner/name` — derived, so it cannot disagree with the parts it is built from. */
export const fullName = (repo: Repo): string => `${repo.owner}/${repo.name}`;

/** Web URL for an issue or pull request. */
export const issueUrl = (repo: Repo, number: number): string | undefined =>
  repo.url ? `${repo.url.replace(/\/+$/, '')}/issues/${number}` : undefined;
