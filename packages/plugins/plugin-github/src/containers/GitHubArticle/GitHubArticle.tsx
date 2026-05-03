//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Organization } from '@dxos/types';

import { GitHub } from '#types';

const GITHUB_API_BASE = '/api/github';

export type GitHubArticleProps = {
  role: string;
  subject: GitHub.GitHubAccount;
  attendableId?: string;
};

//
// GitHub API types.
//

type GitHubApiRepo = {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  owner: { login: string };
  pushed_at: string;
  created_at: string;
};

const githubFetch = async (path: string, token: string): Promise<any> => {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
};

//
// Tile component.
//

type RepoTileData = {
  repo: GitHub.GitHubRepo;
};

type RepoTileProps = Pick<MosaicTileProps<RepoTileData>, 'data' | 'location' | 'current'>;

const RepoTile = forwardRef<HTMLDivElement, RepoTileProps>(({ data, location, current }, forwardedRef) => {
  const { repo } = data;
  const { setCurrentId } = useMosaicContainer('RepoTile');

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={repo.fullName} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(repo.fullName)}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon='ph--git-branch--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{repo.name ?? repo.fullName}</Card.Text>
          </Card.Toolbar>
          <Card.Content>
            {repo.description && (
              <Card.Row icon='ph--text-align-left--regular'>
                <Card.Text variant='description'>{repo.description}</Card.Text>
              </Card.Row>
            )}
            <Card.Row icon='ph--star--regular'>
              <Card.Text variant='description'>
                {repo.stars ?? 0} stars · {repo.forks ?? 0} forks · {repo.openIssues ?? 0} issues
              </Card.Text>
            </Card.Row>
            {repo.language && (
              <Card.Row icon='ph--code--regular'>
                <Card.Text variant='description'>{repo.language}</Card.Text>
              </Card.Row>
            )}
            {repo.lastSyncedAt && (
              <Card.Row icon='ph--clock--regular'>
                <Card.Text variant='description'>Synced {new Date(repo.lastSyncedAt).toLocaleString()}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

RepoTile.displayName = 'RepoTile';

//
// Main article component.
//

export const GitHubArticle = ({ role, subject: account }: GitHubArticleProps) => {
  const db = Obj.getDatabase(account);
  const repos: GitHub.GitHubRepo[] = useQuery(db, Filter.type(GitHub.GitHubRepo));
  const orgs: Organization.Organization[] = useQuery(db, Filter.type(Organization.Organization));
  const [syncing, setSyncing] = useState(false);
  const [repoViewport, setRepoViewport] = useState<HTMLElement | null>(null);

  // TODO(richburdon): Move sync logic to an operation handler (like plugin-trello sync-board.ts).
  /** Sync repos for organizations in the workspace. */
  const handleSync = useCallback(async () => {
    const token = account.accessToken?.target?.token;
    if (!db || !token) {
      return;
    }

    setSyncing(true);
    try {
      const existingByFullName = new Map(repos.map((repo) => [repo.fullName, repo]));

      // Collect org names from organizations to search for repos.
      const orgNames = new Set<string>();
      for (const org of orgs) {
        if (org.name) {
          orgNames.add(org.name.toLowerCase());
        }
        if (org.website) {
          // Extract org name from website domain.
          try {
            const domain = new URL(org.website.startsWith('http') ? org.website : `https://${org.website}`).hostname;
            const parts = domain.replace('www.', '').split('.');
            if (parts.length > 0) {
              orgNames.add(parts[0]);
            }
          } catch {
            // Skip invalid URLs.
          }
        }
      }

      // Search GitHub for repos by each org name.
      for (const orgName of orgNames) {
        try {
          const searchData = await githubFetch(
            `/search/repositories?q=org:${encodeURIComponent(orgName)}&sort=stars&per_page=10`,
            token,
          );
          const remoteRepos = (searchData.items ?? []) as GitHubApiRepo[];

          for (const remote of remoteRepos) {
            const existing = existingByFullName.get(remote.full_name);

            // Find linked org.
            const matchedOrg = orgs.find(
              (org) => org.name?.toLowerCase() === orgName || org.website?.toLowerCase().includes(orgName),
            );

            if (existing) {
              Obj.change(existing, (mutable) => {
                mutable.name = remote.full_name;
                mutable.description = remote.description ?? undefined;
                mutable.language = remote.language ?? undefined;
                mutable.stars = remote.stargazers_count;
                mutable.forks = remote.forks_count;
                mutable.openIssues = remote.open_issues_count;
                mutable.lastSyncedAt = new Date().toISOString();
                if (matchedOrg && !mutable.organization?.target) {
                  mutable.organization = Ref.make(matchedOrg);
                }
              });
            } else {
              const repo = GitHub.makeRepo({
                fullName: remote.full_name,
                name: remote.full_name,
                description: remote.description ?? undefined,
                language: remote.language ?? undefined,
                stars: remote.stargazers_count,
                forks: remote.forks_count,
                openIssues: remote.open_issues_count,
                organization: matchedOrg ? Ref.make(matchedOrg) : undefined,
                lastSyncedAt: new Date().toISOString(),
              });
              db.add(repo);
            }
          }
        } catch (error) {
          log.warn('Failed to search repos for org', { orgName, error });
        }
      }

      Obj.change(account, (mutable) => {
        mutable.lastSyncedAt = new Date().toISOString();
      });
    } catch (error) {
      log.catch(error);
    } finally {
      setSyncing(false);
    }
  }, [db, account, repos, orgs]);

  // Auto-sync on first load.
  const didAutoSync = useRef(false);
  useEffect(() => {
    if (!didAutoSync.current && account.accessToken && !account.lastSyncedAt) {
      didAutoSync.current = true;
      void handleSync();
    }
  }, [account.accessToken, account.lastSyncedAt, handleSync]);

  const sortedRepos = useMemo(
    () => [...repos].sort((repoA, repoB) => (repoB.stars ?? 0) - (repoA.stars ?? 0)),
    [repos],
  );

  const repoItems = useMemo(() => sortedRepos.map((repo) => ({ repo })), [sortedRepos]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{account.name ?? 'GitHub'}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={syncing ? 'Syncing...' : 'Sync repos'}
            icon='ph--arrows-clockwise--regular'
            iconOnly
            disabled={syncing || !account.accessToken}
            onClick={handleSync}
          />
          {account.lastSyncedAt && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>{new Date(account.lastSyncedAt).toLocaleTimeString()}</Toolbar.Text>
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Focus.Group asChild>
          <Mosaic.Container asChild withFocus autoScroll={repoViewport}>
            <ScrollArea.Root orientation='vertical' padding centered>
              <ScrollArea.Viewport ref={setRepoViewport}>
                <Mosaic.VirtualStack
                  Tile={RepoTile}
                  classNames='my-2'
                  gap={8}
                  items={repoItems}
                  draggable={false}
                  getId={(item) => item.repo.fullName}
                  getScrollElement={() => repoViewport}
                  estimateSize={() => 140}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Panel.Content>
      {!account.accessToken && (
        <Panel.Statusbar>
          <Toolbar.Text>Configure an AccessToken in account properties to enable sync.</Toolbar.Text>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
