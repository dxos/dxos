//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { type PullRequest } from '@dxos/types';

import { useSyncPullRequest } from '../hooks/index.ts';
import { GitHubCard } from './GitHubCard.tsx';

/**
 * A pull request's card, re-synced from GitHub whenever it is shown: the card is often where a stale
 * pull request is first read, e.g. in a task list's popover.
 */
export const PullRequestCard = ({ role, subject }: AppSurface.ObjectCardProps<PullRequest.PullRequest>) => {
  // Subscribed so the fields the sync writes back re-render the card.
  useObject(subject);
  useSyncPullRequest(subject);
  return <GitHubCard role={role} subject={subject} />;
};
