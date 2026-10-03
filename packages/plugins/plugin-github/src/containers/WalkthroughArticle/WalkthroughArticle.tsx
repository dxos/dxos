//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { PullRequest } from '@dxos/types';

import { type Walkthrough } from '#types';

import { PullRequestArticle } from '../PullRequestArticle/PullRequestArticle.tsx';

export type WalkthroughArticleProps = AppSurface.ObjectArticleProps<Walkthrough.Walkthrough>;

/**
 * A walkthrough opened directly — from a search result, or a link written before the pull request
 * became the subject — shown as the review of the pull request it narrates.
 *
 * The ref is resolved to a snapshot and the live object queried back by id: the article writes to
 * the pull request (approve, comment) through a ref of its own, which a snapshot cannot give.
 */
export const WalkthroughArticle = ({ subject, ...props }: WalkthroughArticleProps) => {
  const [target] = useObject(subject.pullRequest);
  const objects = useQuery(Obj.getDatabase(subject), target ? Filter.id(target.id) : Filter.nothing());
  const pullRequest = objects.find(PullRequest.instanceOf);

  return pullRequest ? <PullRequestArticle {...props} subject={pullRequest} /> : null;
};
