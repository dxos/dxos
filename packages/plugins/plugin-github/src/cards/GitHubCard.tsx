//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';
import { type Issue, type PullRequest, type Repo } from '@dxos/types';

type Subject = Repo.Repo | Issue.Issue | PullRequest.PullRequest;

/**
 * What the card reads off any of the three types: each field is present on some of them and
 * optional here, so one render path shows whatever the subject carries.
 */
type Fields = {
  owner: string;
  number?: number;
  state?: PullRequest.State;
  author?: string;
  additions?: number;
  deletions?: number;
  defaultBranch?: string;
  description?: string;
  url?: string;
};

const stateHue: Record<PullRequest.State, string> = {
  open: 'green',
  closed: 'red',
  merged: 'purple',
  draft: 'neutral',
};

/** Card content for a repository, pull request or issue: reference, state or branch, author, diff size, description and the link out. */
export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) => {
  const { owner, number, state, author, additions, deletions, defaultBranch, description, url }: Fields = subject;
  const name = 'name' in subject ? subject.name : subject.repo;
  return (
    <Card.Body>
      <Card.Row>
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-description'>{[`${owner}/${name}`, number].filter(Boolean).join('#')}</span>
          {state && (
            <span className='dx-tag' data-hue={stateHue[state]}>
              {state}
            </span>
          )}
          {defaultBranch && (
            <span className='dx-tag' data-hue='neutral'>
              {defaultBranch}
            </span>
          )}
          {author && <span className='text-description whitespace-nowrap'>{author}</span>}
          {additions !== undefined && <span className='text-green-500'>+{additions}</span>}
          {deletions !== undefined && <span className='text-red-500'>−{deletions}</span>}
        </div>
      </Card.Row>
      {description && (
        <Card.Row>
          <Card.Text classNames='line-clamp-3 text-description'>{description}</Card.Text>
        </Card.Row>
      )}
      {url && (
        <Card.Row>
          <a className='dx-link text-sm' href={url} target='_blank' rel='noopener noreferrer'>
            Open on GitHub
          </a>
        </Card.Row>
      )}
    </Card.Body>
  );
};
