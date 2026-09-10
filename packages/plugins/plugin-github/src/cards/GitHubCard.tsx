//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';
import { Issue, PullRequest } from '@dxos/types';

type Subject = Issue.Issue | PullRequest.PullRequest;

const stateHue: Record<PullRequest.State, string> = {
  open: 'green',
  closed: 'red',
  merged: 'purple',
  draft: 'neutral',
};

/** Card content for a pull request or issue: reference, state, author, the diff size for a pull request, and the link out. */
export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) => {
  const pull = PullRequest.instanceOf(subject) ? subject : undefined;
  return (
    <Card.Body>
      <Card.Row>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-description'>{Issue.reference(subject)}</span>
          <span className='dx-tag' data-hue={stateHue[subject.state]}>
            {subject.state}
          </span>
          {subject.author && <span className='text-description'>{subject.author}</span>}
          {pull?.additions !== undefined && <span className='text-green-500'>+{pull.additions}</span>}
          {pull?.deletions !== undefined && <span className='text-red-500'>−{pull.deletions}</span>}
        </div>
      </Card.Row>
      {subject.description && (
        <Card.Row>
          <Card.Text classNames='line-clamp-3 text-description'>{subject.description}</Card.Text>
        </Card.Row>
      )}
      {subject.url && (
        <Card.Row>
          <a className='dx-link text-sm' href={subject.url} target='_blank' rel='noopener noreferrer'>
            Open on GitHub
          </a>
        </Card.Row>
      )}
    </Card.Body>
  );
};
