//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Organization } from '@dxos/types';

/**
 * A GitHub repository being tracked in the workspace.
 */
export const GitHubRepo = Schema.Struct({
  /** Repository display name (owner/repo). */
  name: Schema.optional(Schema.String),
  /** GitHub repository full name (owner/repo). */
  fullName: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Repository description. */
  description: Schema.optional(Schema.String),
  /** Primary language. */
  language: Schema.optional(Schema.String),
  /** Star count at last sync. */
  stars: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Fork count at last sync. */
  forks: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Open issue count at last sync. */
  openIssues: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Linked organization. */
  organization: Schema.optional(Ref.Ref(Organization.Organization).pipe(FormInputAnnotation.set(false))),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.githubRepo',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--git-branch--regular',
    hue: 'neutral',
  }),
);

export interface GitHubRepo extends Schema.Schema.Type<typeof GitHubRepo> {}

/**
 * GitHubAccount schema for personal access token and sync configuration.
 */
export const GitHubAccount = Schema.Struct({
  /** Display name. */
  name: Schema.optional(Schema.String),
  /** GitHub personal access token. */
  accessToken: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.githubAccount',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--github-logo--regular',
    hue: 'neutral',
  }),
);

export interface GitHubAccount extends Schema.Schema.Type<typeof GitHubAccount> {}

/** Input schema for creating a GitHubAccount. */
export const CreateGitHubAccountSchema = Schema.Struct({
  accessToken: Schema.String.annotations({
    title: 'Personal Access Token',
    description: 'GitHub personal access token (fine-grained or classic).',
  }),
});

export interface CreateGitHubAccountSchema extends Schema.Schema.Type<typeof CreateGitHubAccountSchema> {}

/** Creates a GitHubAccount object. */
export const makeAccount = (props: CreateGitHubAccountSchema): GitHubAccount => {
  return Obj.make(GitHubAccount, {
    name: 'GitHub',
    accessToken: props.accessToken,
  });
};

/** Creates a GitHubRepo object. */
export const makeRepo = (props: Partial<Obj.MakeProps<typeof GitHubRepo>> & { fullName: string }): GitHubRepo => {
  return Obj.make(GitHubRepo, props);
};
