//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Issue, PullRequest, Repo } from '@dxos/types';
import { Position } from '@dxos/util';

import { Walkthrough } from '#types';

import { GitHubCard } from '../cards/index.ts';
import { PullRequestCardMenu, WalkthroughArticle } from '../containers/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'repoCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Repo.Repo),
        component: GitHubCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'issueCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Issue.Issue),
        component: GitHubCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'pullRequestCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, PullRequest.PullRequest),
        component: GitHubCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'pullRequestCardMenu',
        filter: AppSurface.object(AppSurface.CardMenu, PullRequest.PullRequest),
        component: PullRequestCardMenu,
        props: ({ data: { subject, menu } }) => ({ subject, menu }),
      }),
      Surface.create({
        id: 'walkthroughArticle',
        filter: AppSurface.object(AppSurface.Article, Walkthrough.Walkthrough),
        component: WalkthroughArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
    ]),
  ),
);
