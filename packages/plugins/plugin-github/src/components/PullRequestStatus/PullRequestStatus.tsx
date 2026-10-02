//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import { type PullRequest } from '@dxos/types';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

const stateHue: Record<PullRequest.State, string> = {
  open: 'green',
  closed: 'red',
  merged: 'purple',
  draft: 'neutral',
};

const reviewHue: Record<GitHubOperation.ReviewState, string> = {
  approved: 'green',
  changes_requested: 'red',
  none: 'neutral',
};

const ciHue: Record<GitHubOperation.CiState, string> = {
  success: 'green',
  failure: 'red',
  pending: 'amber',
  none: 'neutral',
};

export type PullRequestStatusProps = {
  reference: string;
  title?: string;
  state?: PullRequest.State;
  /** Absent until the live status has arrived; the review and CI tags read as unknown until then. */
  review?: { state: GitHubOperation.ReviewState; approvals: number };
  ci?: { state: GitHubOperation.CiState; checks: GitHubOperation.CheckCounts };
};

/** One line answering where the pull request stands: open or merged, approved or not, CI green or red. */
export const PullRequestStatus = ({ reference, title, state, review, ci }: PullRequestStatusProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <div
      role='status'
      className='flex items-center gap-2 px-3 py-1.5 border-b border-subdued-separator text-sm min-w-0'
      data-testid='pull-request.status'
    >
      <span className='dx-tag shrink-0' data-hue='neutral'>
        {reference}
      </span>
      {title && <span className='truncate grow'>{title}</span>}
      <div className='flex items-center gap-2 shrink-0 ml-auto'>
        {state && (
          <span className='dx-tag' data-hue={stateHue[state]} data-testid='pull-request.status.state'>
            {t(`pull-request-state.${state}.label`)}
          </span>
        )}
        <span
          className='dx-tag'
          data-hue={review ? reviewHue[review.state] : 'neutral'}
          data-testid='pull-request.status.review'
        >
          {review
            ? t(`review-status.${review.state}.label`, { count: review.approvals })
            : t('review-status.unknown.label')}
        </span>
        <span className='dx-tag' data-hue={ci ? ciHue[ci.state] : 'neutral'} data-testid='pull-request.status.ci'>
          {ci ? t(`ci-status.${ci.state}.label`) : t('ci-status.unknown.label')}
          {ci && ci.checks.total > 0 && ` ${ci.checks.passed}/${ci.checks.total}`}
        </span>
      </div>
    </div>
  );
};
