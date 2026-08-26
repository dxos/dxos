//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Organization from './Organization';

/**
 * A source-code repository, as hosted by GitHub, GitLab, or anything else that names repositories
 * `owner/name` and addresses them by URL.
 *
 * Host-agnostic by construction: which service a repository lives on is provenance, carried by
 * `Obj.getMeta` foreign keys (the GitHub connector writes `github.com` keys), not by the type. The
 * fields here are only what every host shares and what a reader needs to follow a reference.
 */
export class Repo extends Type.makeObject<Repo>(DXN.make('org.dxos.type.repo', '0.1.0'))(
  Schema.Struct({
    /** Repository name without its owner, e.g. `dxos`. */
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), GeneratorAnnotation.set('company.buzzNoun')),

    /** Account the repository belongs to, e.g. `dxos` — an organization or a user login. */
    owner: Schema.String.pipe(Schema.annotate({ title: 'Owner' }), GeneratorAnnotation.set('internet.username')),

    /**
     * Canonical web URL, e.g. `https://github.com/dxos/dxos`. Stored rather than derived: only the
     * host knows its own URL shape, and a self-hosted instance shares neither domain nor path with
     * the public service.
     */
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

/**
 * `owner/name` — how every host writes a repository in prose, in a URL path, and in a cross-repo
 * reference (`owner/name#123`), which is why it is derived rather than a stored field that could
 * disagree with its parts.
 */
export const fullName = (repo: Repo): string => `${repo.owner}/${repo.name}`;

/** Web URL for an issue or pull request. */
export const issueUrl = (repo: Repo, number: number): string | undefined =>
  repo.url ? `${repo.url.replace(/\/+$/, '')}/issues/${number}` : undefined;
