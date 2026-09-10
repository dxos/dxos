//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import type * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { type Issue, type PullRequest } from '@dxos/types';

import { meta } from '#meta';

import { type GitHubLink } from '../extensions';

/**
 * Where a previewed link's pull request or issue comes from. The plugin's default fetches it from
 * the GitHub API with the space's connection token (anonymously when there is none); a host that
 * contributes one — a story, a test, an offline build — replaces the fetch.
 */
export type GitHubLinkSource = (
  link: GitHubLink,
  context: PreviewCapabilities.PreviewLinkContext,
) => Effect.Effect<Issue.Issue | PullRequest.PullRequest | undefined>;

export const LinkSource = Capability.make<GitHubLinkSource>()(`${meta.profile.key}.capability.linkSource`);
