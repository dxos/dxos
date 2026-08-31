//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { Flex, IconButton, ScrollArea, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

const DEFAULT_REPO = 'dxos/dxos';
const DEFAULT_LIMIT = 20;

type GithubUser = {
  login: string;
  avatar_url: string;
  html_url: string;
};

type GithubPullRequest = {
  number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
  user: GithubUser;
};

type ComponentContextValue = {
  repo: string;
  pulls: GithubPullRequest[];
  unavailable: boolean;
};

const ComponentContext = createContext<ComponentContextValue | null>(null);

const useComponentContext = () => {
  const ctx = useContext(ComponentContext);
  if (!ctx) {
    throw new Error('GithubComponent.* parts must be rendered inside GithubComponent.Root.');
  }
  return ctx;
};

export type GithubComponentRootProps = {
  /** `<owner>/<name>`. Defaults to `dxos/dxos`. */
  repo?: string;
  /** Maximum number of merged PRs to fetch. */
  limit?: number;
  children?: ReactNode;
};

const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: GithubComponentRootProps) => {
  const [pulls, setPulls] = useState<GithubPullRequest[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setPulls([]);
    setUnavailable(false);
    void (async () => {
      try {
        const url = new URL(`https://api.github.com/repos/${repo}/pulls`);
        url.searchParams.set('state', 'closed');
        url.searchParams.set('sort', 'updated');
        url.searchParams.set('direction', 'desc');
        url.searchParams.set('per_page', String(limit * 2));
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!response.ok) {
          setUnavailable(true);
          return;
        }
        const items = (await response.json()) as GithubPullRequest[];
        setPulls(items.filter((pull) => pull.merged_at !== null).slice(0, limit));
        setUnavailable(false);
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setPulls([]);
        setUnavailable(true);
      }
    })();
    return () => controller.abort();
  }, [repo, limit]);

  return <ComponentContext.Provider value={{ repo, pulls, unavailable }}>{children}</ComponentContext.Provider>;
};

const Header = () => {
  const { t } = useTranslation(meta.profile.key);
  const { repo, pulls, unavailable } = useComponentContext();
  return (
    <header className='flex items-center justify-between gap-1 px-4 py-3 dx-modal-surface border-b border-subdued-separator'>
      <a
        href={`https://github.com/${repo}`}
        target='_blank'
        rel='noopener noreferrer'
        className='text-sm font-medium truncate'
      >
        @{repo}
      </a>
      <div className='text-xs text-description'>
        {unavailable
          ? t('github-unavailable.message')
          : pulls.length > 0
            ? t('recent-prs.label', { count: pulls.length })
            : t('github-loading.message')}
      </div>
    </header>
  );
};

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

const formatRelative = (iso: string): string => {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diffSeconds = (Date.parse(iso) - Date.now()) / 1000;
  const absDiff = Math.abs(diffSeconds);
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (absDiff >= secondsInUnit) {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return formatter.format(Math.round(diffSeconds), 'second');
};

const PullRow = ({ pull }: { pull: GithubPullRequest }) => (
  <li>
    <Flex asChild align='start' gap='sm' classNames='px-trim-sm py-trim-xs rounded-sm hover:bg-hover-surface'>
      <a href={pull.html_url} target='_blank' rel='noopener noreferrer'>
        <img src={pull.user.avatar_url} alt='' className='size-6 rounded-full shrink-0' />
        <Flex column classNames='min-w-0 flex-1'>
          {/* `leading-6` gives the title the avatar's line box, so the two align on their own. */}
          <span className='text-sm leading-6 truncate'>{pull.title}</span>
          <span className='text-xs text-description truncate'>
            #{pull.number} · {pull.user.login} · {pull.merged_at ? formatRelative(pull.merged_at) : ''}
          </span>
        </Flex>
      </a>
    </Flex>
  </li>
);

const Content = () => {
  const { pulls } = useComponentContext();
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>
        <ul className='flex flex-col p-1'>
          {pulls.map((pull) => (
            <PullRow key={pull.number} pull={pull} />
          ))}
        </ul>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const StatusBar = () => {
  const { t } = useTranslation(meta.profile.key);
  const { repo } = useComponentContext();
  return (
    <IconButton
      icon='ph--github-logo--regular'
      label={t('view-on-github.button')}
      variant='primary'
      classNames='w-full'
      onClick={() => {
        window.open(`https://github.com/${repo}`, '_blank', 'noopener,noreferrer');
      }}
    />
  );
};

export const GithubComponent = {
  Root,
  Header,
  Content,
  StatusBar,
};
