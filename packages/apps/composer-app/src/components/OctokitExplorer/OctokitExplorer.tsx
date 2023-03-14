//
// Copyright 2023 DXOS.org
//

import type { components } from '@octokit/openapi-types';
import { Octokit } from 'octokit';
import React, { Suspense, useMemo } from 'react';
import { Await } from 'react-router-dom';

import {
  Button,
  DensityProvider,
  Dialog,
  DialogProps,
  List,
  ListItem,
  ListItemHeading,
  Loading,
  useTranslation
} from '@dxos/react-components';

import { useOctokitContext } from '../OctokitProvider';

type Repo = components['schemas']['repository'];

const OctokitExplorerTreeRoot = ({ repos }: { repos: Repo[] }) => {
  return (
    <DensityProvider density='fine'>
      <List labelId='todo'>
        {repos.map((repo) => {
          return (
            <ListItem key={repo.id}>
              <ListItemHeading className='sr-only'>{repo.name}</ListItemHeading>
              <Button variant='ghost' className='is-full'>
                {repo.name}
              </Button>
            </ListItem>
          );
        })}
      </List>
    </DensityProvider>
  );
};

const OctokitExplorerImpl = ({ octokit }: { octokit: Octokit }) => {
  const { t } = useTranslation('composer');

  const resolveRepos = useMemo(
    () =>
      octokit.rest.repos
        .listForAuthenticatedUser({ per_page: 100 })
        .then(({ data: repos }) => repos.filter(({ permissions }) => permissions?.push)),
    [octokit]
  );

  return (
    <Suspense fallback={<Loading label={t('fetching from github message')} />}>
      <Await resolve={resolveRepos} errorElement={<p>{t('failed to fetch from github message')}</p>}>
        {(repos: Repo[]) => <OctokitExplorerTreeRoot {...{ repos }} />}
      </Await>
    </Suspense>
  );
};

export const OctokitExplorer = (props: Omit<DialogProps, 'title' | 'children'>) => {
  const { octokit, patError } = useOctokitContext();
  const { t } = useTranslation('composer');
  return (
    <Dialog
      {...props}
      title={t('github explorer title')}
      slots={{ content: { className: 'max-bs-[96vh] overflow-y-auto' } }}
    >
      {octokit ? (
        <OctokitExplorerImpl {...{ octokit }} />
      ) : (
        <p>{t(patError ? 'error github pat message' : 'empty github pat message')}</p>
      )}
    </Dialog>
  );
};
