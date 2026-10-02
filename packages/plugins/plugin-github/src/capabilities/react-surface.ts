//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Issue, PullRequest, Repo } from '@dxos/types';
import * as Position from '@dxos/util/Position';

import { IMPORT_PULL_REQUEST_DIALOG } from '#meta';
import { Walkthrough } from '#types';

import { GitHubCard, PullRequestCard } from '../cards/index.ts';
import {
  ImportPullRequestDialog,
  PullRequestArticle,
  PullRequestCardMenu,
  WalkthroughArticle,
} from '../containers/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'repoCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Repo.Repo),
        component: GitHubCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'issueCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Issue.Issue),
        component: GitHubCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'pullRequestCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, PullRequest.PullRequest),
        component: PullRequestCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'pullRequestCardMenu',
        filter: AppSurface.object(AppSurface.CardMenu, PullRequest.PullRequest),
        component: PullRequestCardMenu,
        props: ({ data: { subject, menu } }) => ({ subject, menu }),
      }),
      // The pull request is the article's subject, and the walkthrough it may have is something the
      // article renders — so a pull request with no narration yet still opens, and offers to write one.
      Surface.Root.create({
        id: 'pullRequestArticle',
        filter: AppSurface.object(AppSurface.Article, PullRequest.PullRequest),
        component: PullRequestArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // A walkthrough opened by id (an older link, a search result) resolves to the same review.
      Surface.Root.create({
        id: 'walkthroughArticle',
        filter: AppSurface.object(AppSurface.Article, Walkthrough.Walkthrough),
        component: WalkthroughArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.Root.create({
        id: IMPORT_PULL_REQUEST_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, IMPORT_PULL_REQUEST_DIALOG),
        component: ImportPullRequestDialog,
      }),
    ]),
  ),
);
