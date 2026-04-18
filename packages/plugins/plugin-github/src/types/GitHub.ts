//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { AccessToken, Organization } from '@dxos/types';

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
  /** GitHub credentials (PAT stored as AccessToken). */
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'GitHub credentials',
      description: 'Personal access token for syncing repos and PRs.',
    }),
  ),
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

/**
 * A GitHub pull request — open, closed, or merged. One object per PR;
 * dedup key is `${fullName}#${number}`.
 */
export const GitHubPullRequest = Schema.Struct({
  /** Repository full name (owner/repo). */
  fullName: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** PR number. */
  number: Schema.Number.pipe(FormInputAnnotation.set(false)),
  /** PR title. */
  title: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** PR body (truncated to ~4 kB at ingest). */
  body: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** GitHub login of the PR author. */
  author: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** 'open' | 'closed'. When `mergedAt` is set, the PR was merged rather than just closed. */
  state: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** ISO timestamp. Present only for merged PRs. */
  mergedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** ISO timestamp the PR was opened. */
  createdAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** ISO timestamp the PR was last updated on GitHub. */
  updatedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** PR URL. */
  url: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.githubPullRequest',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--git-pull-request--regular',
    hue: 'neutral',
  }),
);

export interface GitHubPullRequest extends Schema.Schema.Type<typeof GitHubPullRequest> {}

/** Input schema for creating a GitHubAccount via the Create menu. */
export const CreateGitHubAccountSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      description: 'Display name for this GitHub account.',
    }),
  ),
});

export interface CreateGitHubAccountSchema extends Schema.Schema.Type<typeof CreateGitHubAccountSchema> {}

/** Creates a GitHubAccount object. */
export const makeAccount = (props?: { name?: string }): GitHubAccount => {
  return Obj.make(GitHubAccount, {
    name: props?.name ?? 'GitHub',
  });
};

/** Creates a GitHubRepo object with foreignKey for the GitHub full name. */
export const makeRepo = (props: Partial<Obj.MakeProps<typeof GitHubRepo>> & { fullName: string }): GitHubRepo => {
  return Obj.make(GitHubRepo, {
    [Obj.Meta]: {
      keys: [{ id: props.fullName, source: 'github.com' }],
    },
    ...props,
  });
};

/** Creates a GitHubPullRequest with foreignKey. */
export const makePullRequest = (
  props: Obj.MakeProps<typeof GitHubPullRequest> & { fullName: string; number: number },
): GitHubPullRequest => {
  return Obj.make(GitHubPullRequest, {
    [Obj.Meta]: {
      keys: [{ id: `${props.fullName}#${props.number}`, source: 'github.com' }],
    },
    ...props,
  });
};

// ── Foreign key helpers ─────────────────────────────────────────────────────

const GITHUB_SOURCE = 'github.com';

/** Extract the GitHub ID from an object's foreignKeys. */
export const getGitHubId = (obj: Obj.Any): string | undefined => {
  const meta = Obj.getMeta(obj);
  return meta.keys?.find((key: { source: string; id: string }) => key.source === GITHUB_SOURCE)?.id;
};
