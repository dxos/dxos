//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Type } from '@dxos/echo';
import { isSpace } from '@dxos/react-client/echo';
import { Issue, PullRequest, Repo } from '@dxos/types';
import * as Position from '@dxos/util/Position';

import { IMPORT_PULL_REQUEST_DIALOG } from '#meta';
import { Walkthrough } from '#types';

import { GitHubCard, PullRequestCard } from '../cards/index.ts';
import {
  ImportPullRequestDialog,
  PullRequestArticle,
  PullRequestCardMenu,
  PullRequestsArticle,
  WalkthroughArticle,
} from '../containers/index.ts';

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
        component: PullRequestCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'pullRequestCardMenu',
        filter: AppSurface.object(AppSurface.CardMenu, PullRequest.PullRequest),
        component: PullRequestCardMenu,
        props: ({ data: { subject, menu } }) => ({ subject, menu }),
      }),
      // The pull request is the article's subject, and the walkthrough it may have is something the
      // article renders — so a pull request with no narration yet still opens, and offers to write one.
      Surface.create({
        id: 'pullRequestArticle',
        filter: AppSurface.object(AppSurface.Article, PullRequest.PullRequest),
        component: PullRequestArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // The pull request type's node (the space's Database section) opens as the triage list rather
      // than the generic type collection, which knows nothing of checks, tasks or relevance.
      Surface.create({
        id: 'pullRequestsArticle',
        position: Position.first,
        filter: AppSurface.subject(AppSurface.Article, isPullRequestType),
        component: PullRequestsArticle,
        props: ({ role, data: { attendableId, properties } }) => ({
          role,
          attendableId,
          db: isSpace(properties?.space) ? properties.space.db : undefined,
        }),
      }),
      // A walkthrough opened by id (an older link, a search result) resolves to the same review.
      Surface.create({
        id: 'walkthroughArticle',
        filter: AppSurface.object(AppSurface.Article, Walkthrough.Walkthrough),
        component: WalkthroughArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: IMPORT_PULL_REQUEST_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, IMPORT_PULL_REQUEST_DIALOG),
        component: ImportPullRequestDialog,
      }),
    ]),
  ),
);

const PULL_REQUEST_TYPENAME = Type.getTypename(PullRequest.PullRequest);

const isPullRequestType = (subject: unknown): subject is Type.AnyEntity =>
  Type.isType(subject) && Type.getTypename(subject) === PULL_REQUEST_TYPENAME;
