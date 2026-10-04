//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Card, Flex, Tag, type TagHue, useTranslation } from '@dxos/react-ui';
import { type Issue, type PullRequest, type Repo } from '@dxos/types';

import { meta } from '#meta';

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

const stateHue: Record<PullRequest.State, TagHue> = {
  open: 'green',
  closed: 'red',
  merged: 'purple',
  draft: 'neutral',
};

/**
 * Card content for a repository, pull request or issue: reference, state or branch, author, diff size, description and
 * the link out. Each row leads with an icon in the card's start rail, so the text lines up with the title.
 */
export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) => {
  const { t } = useTranslation(meta.profile.key);
  const { owner, number, state, author, additions, deletions, defaultBranch, description, url }: Fields = subject;
  const name = 'name' in subject ? subject.name : subject.repo;

  return (
    <Card.Body>
      <Card.Row
        icon='ph--github-logo--regular'
        trailing={
          state ? (
            <Tag hue={stateHue[state]}>{state}</Tag>
          ) : defaultBranch ? (
            <Tag hue='neutral'>{defaultBranch}</Tag>
          ) : undefined
        }
      >
        <Card.Text variant='muted'>{[`${owner}/${name}`, number].filter(Boolean).join('#')}</Card.Text>
      </Card.Row>
      {author && (
        <Card.Row icon='ph--user--regular'>
          <Card.Text variant='muted'>{author}</Card.Text>
        </Card.Row>
      )}
      {(additions !== undefined || deletions !== undefined) && (
        <Card.Row icon='ph--plus-minus--regular'>
          <Flex gap='sm' align='center'>
            {additions !== undefined && <span className='text-green-500'>+{additions}</span>}
            {deletions !== undefined && <span className='text-red-500'>−{deletions}</span>}
          </Flex>
        </Card.Row>
      )}
      {description && (
        <Card.Row icon='ph--text-align-left--regular'>
          <Card.Text classNames='line-clamp-3' variant='muted'>
            {description}
          </Card.Text>
        </Card.Row>
      )}
      {url && (
        <Card.Row icon='ph--arrow-square-out--regular'>
          <a className='dx-link-accent' href={url} target='_blank' rel='noopener noreferrer'>
            {t('open-on-github.label')}
          </a>
        </Card.Row>
      )}
    </Card.Body>
  );
};
