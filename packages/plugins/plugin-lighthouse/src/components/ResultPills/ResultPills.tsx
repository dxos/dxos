//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { meta } from '#meta';

import { asRecord, asString } from '../../client/decode.ts';
import { type Pick } from '../../client/types.ts';
import { PICKS_ROLE, type Pill, RESULTS_ROLE } from '../../model/trajectory.ts';

const parse = (children: WidgetProps['children']): Record<string, unknown> | undefined => {
  try {
    return asRecord(JSON.parse(getXmlTextChild(children) ?? ''));
  } catch {
    return undefined;
  }
};

const toPills = (value: unknown): Pill[] =>
  (Array.isArray(value) ? value : []).flatMap((item): Pill[] => {
    const record = asRecord(item);
    const id = asString(record?.id);
    const title = asString(record?.title);
    return id && title
      ? [
          {
            id,
            title,
            kind: asString(record?.kind) ?? '',
            url: asString(record?.url),
            detail: asString(record?.detail),
          },
        ]
      : [];
  });

const toPicks = (value: unknown): Pick[] =>
  (Array.isArray(value) ? value : []).flatMap((item): Pick[] => {
    const record = asRecord(item);
    const title = asString(record?.title);
    return title ? [{ title, why: asString(record?.why) ?? '', url: asString(record?.url) }] : [];
  });

const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
  } catch {
    return undefined;
  }
};

const Title = ({ title, url }: { title: string; url?: string }) =>
  url ? (
    <Typography.Link href={url} target='_blank' rel='noreferrer' title={title} classNames='truncate'>
      {title}
    </Typography.Link>
  ) : (
    <span className='truncate' title={title}>
      {title}
    </span>
  );

/** The agent's report, inline: one compact row per pick, then the gaps in a line. */
const Picks = ({ picks, gaps }: { picks: Pick[]; gaps?: string }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex column gap='xs' classNames='py-2 text-sm' data-testid='lighthouse.picks'>
      <Typography.Text classNames='text-xs uppercase tracking-wide text-fg-subtle'>
        {t('picks.label', { count: picks.length })}
      </Typography.Text>
      <Layout.Flex asChild column gap='xs'>
        <ol>
          {picks.map((pick, index) => (
            <Layout.Grid asChild key={index} cols={['min', 'fill', 'min']} gap='sm' align='start'>
              <li>
                <span className='text-fg-subtle tabular-nums'>{index + 1}</span>
                <Layout.Flex column classNames='min-w-0'>
                  <Title title={pick.title} url={pick.url} />
                  {pick.why && <span className='text-fg-muted line-clamp-2'>{pick.why}</span>}
                </Layout.Flex>
                <span className='text-xs text-fg-subtle'>{hostOf(pick.url)}</span>
              </li>
            </Layout.Grid>
          ))}
        </ol>
      </Layout.Flex>
      {gaps && <span className='text-fg-muted'>{t('gaps.label', { gaps })}</span>}
    </Layout.Flex>
  );
};

/** What one tool call put into the graph, as compact rows under it: title, kind or rank, price. */
const Results = ({ total, pills, followed }: { total: number; pills: Pill[]; followed: boolean }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex column gap='xs' classNames='py-2 text-sm' data-testid='lighthouse.results'>
      <Typography.Text classNames='text-xs uppercase tracking-wide text-fg-subtle'>
        {t(followed ? 'pills-followed.label' : 'pills.label', { count: total })}
      </Typography.Text>
      <Layout.Flex asChild column>
        <ul>
          {pills.map((pill) => (
            <Layout.Grid asChild key={pill.id} cols={['min', 'fill', 'min']} gap='sm' align='center'>
              <li>
                <span className='text-xs text-fg-subtle whitespace-nowrap'>{pill.kind}</span>
                <Title title={pill.title} url={pill.url} />
                <span className='text-xs text-fg-muted tabular-nums whitespace-nowrap'>{pill.detail}</span>
              </li>
            </Layout.Grid>
          ))}
        </ul>
      </Layout.Flex>
      {total > pills.length && (
        <span className='text-xs text-fg-subtle'>{t('pills-more.label', { count: total - pills.length })}</span>
      )}
    </Layout.Flex>
  );
};

/**
 * The thread's `surface` widget: a tool call's results as pills, or the report's picks. Other surface roles render
 * nothing, so a block another client wrote never breaks the thread.
 */
export const ResultPills = ({ role, children }: WidgetProps) => {
  const data = parse(children);
  if (!data) {
    return null;
  }
  if (role === PICKS_ROLE) {
    const picks = toPicks(data.picks);
    return picks.length ? <Picks picks={picks} gaps={asString(data.gaps)} /> : null;
  }
  if (role === RESULTS_ROLE) {
    const pills = toPills(data.pills);
    return pills.length ? (
      <Results
        total={typeof data.total === 'number' ? data.total : pills.length}
        pills={pills}
        followed={data.followed === true}
      />
    ) : null;
  }
  return null;
};
