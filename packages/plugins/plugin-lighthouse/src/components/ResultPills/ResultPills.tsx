//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { asNumber, asRecord, asString } from '../../client/decode.ts';
import { type Pick } from '../../client/types.ts';
import { toImageRefs } from '../../model/images.ts';
import {
  IMAGES_ROLE,
  PICKS_ROLE,
  type Pill,
  RUN_ROLE,
  type RunCall,
  type RunData,
  decodeRuns,
} from '../../model/trajectory.ts';
import { LighthouseNamespace } from '../../namespace.ts';
import { InputImages } from '../InputImages/InputImages.tsx';

const parse = (children: WidgetProps['children']): Record<string, unknown> | undefined => {
  try {
    return asRecord(JSON.parse(getXmlTextChild(children) ?? ''));
  } catch {
    return undefined;
  }
};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toPills = (value: unknown): Pill[] =>
  list(value).flatMap((item): Pill[] => {
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

const toCalls = (value: unknown): RunCall[] =>
  list(value).flatMap((item): RunCall[] => {
    const record = asRecord(item);
    const tool = asString(record?.tool);
    if (!record || !tool) {
      return [];
    }
    return [
      {
        tool,
        args: asString(record.args) ?? '',
        ...(typeof record.ok === 'boolean' ? { ok: record.ok } : {}),
        ...(asString(record.error) ? { error: asString(record.error) } : {}),
        ...(asNumber(record.ms) !== undefined ? { ms: asNumber(record.ms) } : {}),
        ...(asString(record.output) ? { output: asString(record.output) } : {}),
      },
    ];
  });

const toRun = (data: Record<string, unknown>): RunData => {
  const pills = toPills(data.pills);
  return {
    ...(asString(data.narration) ? { narration: asString(data.narration) } : {}),
    calls: toCalls(data.calls),
    pills,
    total: asNumber(data.total) ?? pills.length,
    followed: asNumber(data.followed) ?? 0,
  };
};

/** The run rows a surface carries: base64 JSON of a list (or one row), or a plain row from an older thread. */
const toRuns = (data: Record<string, unknown>): RunData[] => {
  const b64 = asString(data.b64);
  if (!b64) {
    return [toRun(data)];
  }
  try {
    const decoded = decodeRuns(b64);
    return (Array.isArray(decoded) ? decoded : [decoded]).flatMap((row) => {
      const record = asRecord(row);
      return record ? [toRun(record)] : [];
    });
  } catch {
    return [];
  }
};

const toPicks = (value: unknown): Pick[] =>
  list(value).flatMap((item): Pick[] => {
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

const duration = (ms?: number) => (ms === undefined ? '' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

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

const Heading = ({ children }: { children: string }) => (
  <Typography.Text classNames='text-xs uppercase tracking-wide text-fg-subtle'>{children}</Typography.Text>
);

/** The agent's report, inline: one compact row per pick, then the gaps in a line. */
const Picks = ({ picks, gaps }: { picks: Pick[]; gaps?: string }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  return (
    <Layout.Flex column gap='xs' classNames='py-2 text-sm' data-testid='lighthouse.picks'>
      <Heading>{t('picks.label', { count: picks.length })}</Heading>
      <Layout.Flex asChild column gap='xs'>
        <ol>
          {picks.map((pick, index) => (
            <Layout.Grid asChild key={index} cols={['auto', 'fill', 'auto']} gap='sm' align='start'>
              <li>
                <span className='text-fg-subtle tabular-nums'>{index + 1}</span>
                <Layout.Flex column classNames='min-w-0'>
                  <Title title={pick.title} url={pick.url} />
                  {pick.why && <span className='text-fg-muted line-clamp-2'>{pick.why}</span>}
                </Layout.Flex>
                <span className='text-xs text-fg-subtle whitespace-nowrap truncate max-w-32'>{hostOf(pick.url)}</span>
              </li>
            </Layout.Grid>
          ))}
        </ol>
      </Layout.Flex>
      {gaps && <span className='text-fg-muted'>{t('gaps.label', { gaps })}</span>}
    </Layout.Flex>
  );
};

/** The results a run put into the graph, as compact rows: kind or rank, title, price. */
const PillList = ({ run }: { run: RunData }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  return (
    <Layout.Flex column gap='xs' classNames='p-2 border-t border-separator text-sm' data-testid='lighthouse.results'>
      <Heading>
        {`${t('pills.label', { count: run.total })}${run.followed > 0 ? ` · ${t('pills-followed.label', { count: run.followed })}` : ''}`}
      </Heading>
      <Layout.Flex asChild column classNames='max-h-56 overflow-y-auto'>
        <ul>
          {run.pills.map((pill) => (
            <Layout.Grid asChild key={pill.id} cols={['auto', 'fill', 'auto']} gap='sm' align='center'>
              <li className='py-0.5'>
                <span className='text-xs text-fg-subtle whitespace-nowrap'>{pill.kind}</span>
                <Title title={pill.title} url={pill.url} />
                <span className='text-xs text-fg-muted tabular-nums whitespace-nowrap'>{pill.detail}</span>
              </li>
            </Layout.Grid>
          ))}
        </ul>
      </Layout.Flex>
      {run.total > run.pills.length && (
        <span className='text-xs text-fg-subtle'>{t('pills-more.label', { count: run.total - run.pills.length })}</span>
      )}
    </Layout.Flex>
  );
};

/** One call: its tool, arguments, outcome and time; its output or error opens below it. */
const CallRow = ({ call }: { call: RunCall }) => {
  const failed = call.ok === false;
  const body = failed ? call.error : call.output;
  const head = (
    <Layout.Grid cols={['auto', 'auto', 'fill', 'auto']} gap='sm' align='center' classNames='w-full min-w-0 text-xs'>
      <Icon.Icon
        icon={
          call.ok === undefined ? 'ph--circle-notch--regular' : failed ? 'ph--warning--regular' : 'ph--check--regular'
        }
        size='xs'
        classNames={[call.ok === undefined && 'animate-spin', failed ? 'text-error-text' : 'text-fg-subtle']}
      />
      <span
        className={['font-mono font-medium whitespace-nowrap', failed && 'text-error-text'].filter(Boolean).join(' ')}
      >
        {call.tool}
      </span>
      <span className='font-mono text-fg-subtle truncate' title={call.args}>
        {call.args}
      </span>
      <span className='text-fg-subtle tabular-nums whitespace-nowrap'>{duration(call.ms)}</span>
    </Layout.Grid>
  );
  if (!body) {
    return <li className='px-2 py-0.5'>{head}</li>;
  }
  return (
    <li className='px-2 py-0.5'>
      <Collapsible.Root>
        <Collapsible.Trigger classNames='w-full min-w-0'>{head}</Collapsible.Trigger>
        <Collapsible.Content>
          <pre
            className={[
              'ms-6 my-1 p-2 max-h-48 overflow-auto rounded-sm bg-group-surface text-[0.625rem] whitespace-pre-wrap break-words',
              failed && 'text-error-text',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {body}
          </pre>
        </Collapsible.Content>
      </Collapsible.Root>
      {failed && <span className='block ms-6 text-xs text-error-text break-words'>{call.error}</span>}
    </li>
  );
};

/**
 * One run of tool calls and what they produced, as lighthouse's web UI shows it: collapsed, one line with the
 * narration, how many calls and results, failures and the time; open, every call, then the results as pills.
 */
const RunRow = ({ run }: { run: RunData }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const failed = run.calls.filter((call) => call.ok === false).length;
  const running = run.calls.some((call) => call.ok === undefined);
  const ms = run.calls.reduce((total, call) => total + (call.ms ?? 0), 0);
  const label = run.narration ?? t('run-commands.label', { count: run.calls.length });
  return (
    <TogglePanel.Root classNames='w-0 min-w-full'>
      <TogglePanel.Header caret='end' classNames='group/disclosure gap-1' data-testid='lighthouse.run-row'>
        <Layout.Flex gap='sm' align='center' classNames='min-w-0 text-fg-muted tabular-nums'>
          <Icon.Icon
            icon={running ? 'ph--circle-notch--regular' : 'ph--wrench--regular'}
            size='sm'
            classNames={running ? 'animate-spin' : undefined}
          />
          <span className='truncate group-hover/disclosure:text-fg' title={label}>
            {label}
          </span>
          <Layout.Flex gap='sm' classNames='text-xs whitespace-nowrap'>
            {run.narration && run.calls.length > 0 && <span>{t('run-calls.label', { count: run.calls.length })}</span>}
            {run.total > 0 && (
              <span className='text-fg font-medium'>{t('run-results.label', { count: run.total })}</span>
            )}
            {failed > 0 && <span className='text-error-text'>{t('run-failed.label', { count: failed })}</span>}
            {ms > 0 && <span>{duration(ms)}</span>}
          </Layout.Flex>
        </Layout.Flex>
      </TogglePanel.Header>
      <TogglePanel.Body>
        <Layout.Flex column classNames='border border-separator rounded-md min-w-0'>
          {run.calls.length > 0 && (
            <Layout.Flex asChild column classNames='py-1'>
              <ul aria-label={t('run-calls-list.label')}>
                {run.calls.map((call, index) => (
                  <CallRow key={index} call={call} />
                ))}
              </ul>
            </Layout.Flex>
          )}
          {run.pills.length > 0 && <PillList run={run} />}
        </Layout.Flex>
      </TogglePanel.Body>
    </TogglePanel.Root>
  );
};

/**
 * The thread's `surface` widget: a run row (a narration, its calls and their results), or the report's picks. Other
 * surface roles render nothing, so a block another client wrote never breaks the thread.
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
  if (role === IMAGES_ROLE) {
    const b64 = asString(data.b64);
    try {
      const decoded = asRecord(b64 ? decodeRuns(b64) : data);
      const images = toImageRefs(decoded?.images);
      return images.length ? <InputImages images={images} /> : null;
    } catch {
      return null;
    }
  }
  if (role === RUN_ROLE) {
    const runs = toRuns(data).filter((run) => run.calls.length || run.pills.length);
    return runs.length ? (
      <Layout.Flex column data-testid='lighthouse.runs'>
        {runs.map((run, index) => (
          <RunRow key={index} run={run} />
        ))}
      </Layout.Flex>
    ) : null;
  }
  return null;
};
