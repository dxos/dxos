//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tabs from '@dxos/react-ui/Tabs';
import { Tag } from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';

import { type Issue, type IssueStatus, type Plugin, type Predicate, type StorageReport } from '../../client/types.ts';
import { type PruneReport, type Storage, ago, formatBytes, formatCount, localName, readStorage } from './storage.ts';

export const META_TABS = ['plugins', 'vocabulary', 'issues', 'storage'] as const;

export type MetaTab = (typeof META_TABS)[number];

export const ISSUE_STATUSES: readonly IssueStatus[] = ['open', 'in-progress', 'fixed', 'wontfix'];

type IssueFilter = 'active' | 'all' | IssueStatus;

const ISSUE_FILTERS: readonly IssueFilter[] = ['active', 'all', ...ISSUE_STATUSES];

export type LighthouseMetaProps = {
  role?: string;
  plugins?: Plugin[];
  predicates?: Predicate[];
  issues?: Issue[];
  storage?: StorageReport;
  /** The snapshot prune's dry run: what a prune would delete. */
  prune?: PruneReport;
  error?: string;
  /** The action in flight: `cache:<namespace>`, `cache:*`, `prune`, or `issue:<id>`. */
  busy?: string;
  /** The last action's outcome, shown above the storage tab. */
  message?: string;
  defaultTab?: MetaTab;
  /** Trails the tabs in the toolbar (e.g. the connection's name). */
  toolbar?: ReactNode;
  onReload?: () => void;
  onComment?: (id: string, text: string) => void;
  onSetStatus?: (id: string, status: IssueStatus, note?: string) => void;
  onClearCache?: (namespace?: string) => void;
  onPrune?: () => void;
};

const isActive = (issue: Issue) => issue.status === 'open' || issue.status === 'in-progress';

const statusHue = (status: IssueStatus) =>
  status === 'open' ? 'warning' : status === 'in-progress' ? 'info' : status === 'fixed' ? 'success' : 'neutral';

/** The plugin an issue's domain belongs to: a host it lists, or a parent domain of one. */
const pluginFor = (plugins: readonly Plugin[], domain?: string) =>
  domain
    ? plugins.find(
        (plugin) =>
          plugin.id === domain ||
          plugin.hosts.some((host) => host === domain || (host.startsWith('*.') && domain.endsWith(host.slice(1)))),
      )
    : undefined;

const matches = (filter: string, ...fields: Array<string | undefined>) =>
  !filter || fields.join(' ').toLowerCase().includes(filter);

const Heading = ({ children }: { children: ReactNode }) => (
  <Typography.Text classNames='text-xs uppercase tracking-wide text-fg-subtle'>{children}</Typography.Text>
);

//
// Plugins
//

const CONTRIBUTION_KINDS = ['searchEngines', 'browsers', 'models', 'proxies', 'services', 'extractors'] as const;

const Plugins = ({ plugins, issues, filter }: { plugins: Plugin[]; issues: Issue[]; filter: string }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const openByPlugin = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of issues.filter(isActive)) {
      const plugin = pluginFor(plugins, issue.domain);
      if (plugin) {
        counts.set(plugin.id, (counts.get(plugin.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [plugins, issues]);
  const shown = plugins.filter((plugin) =>
    matches(filter, plugin.id, plugin.name, plugin.description, plugin.hosts.join(' ')),
  );
  if (shown.length === 0) {
    return <Status.Empty>{t('meta-empty.message')}</Status.Empty>;
  }
  return (
    <Layout.Grid gap='md' align='start' classNames='p-trim-md grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]'>
      {shown.map((plugin) => {
        const open = openByPlugin.get(plugin.id) ?? 0;
        const access = plugin.contributes.access;
        return (
          <Card.Root key={plugin.id} data-testid='lighthouse.meta.plugin' data-plugin={plugin.id}>
            <Card.Header>
              <Card.Title lines={2}>{plugin.name ?? plugin.id}</Card.Title>
            </Card.Header>
            <Card.Row>
              <Layout.Flex gap='xs' wrap align='center'>
                <span className='font-mono text-xs text-fg-subtle'>{plugin.id}</span>
                {plugin.core && <Tag hue='neutral'>{t('meta-core.label')}</Tag>}
                {open > 0 && <Tag hue='warning'>{t('meta-open-issues.label', { count: open })}</Tag>}
              </Layout.Flex>
            </Card.Row>
            {plugin.description && (
              <Card.Row>
                <Typography.Text lines={3} classNames='text-sm text-fg-muted whitespace-normal'>
                  {plugin.description}
                </Typography.Text>
              </Card.Row>
            )}
            {plugin.hosts.length > 0 && plugin.hosts[0] !== plugin.id && (
              <Card.Row icon='ph--globe--regular'>
                <Typography.Text truncate classNames='text-sm'>
                  {plugin.hosts.join(', ')}
                </Typography.Text>
              </Card.Row>
            )}
            <Card.Row>
              <Layout.Flex gap='xs' wrap>
                {typeof access === 'number' && <Tag hue='neutral'>{t('meta-access.label', { count: access })}</Tag>}
                {CONTRIBUTION_KINDS.flatMap((kind) => {
                  const ids = plugin.contributes[kind];
                  return Array.isArray(ids)
                    ? ids.map((id) => (
                        <Tag key={`${kind}:${id}`} hue={kind === 'extractors' ? 'neutral' : 'sky'}>
                          {kind === 'extractors' ? id : `${t(`meta-kind.${kind}`)}: ${id}`}
                        </Tag>
                      ))
                    : [];
                })}
              </Layout.Flex>
            </Card.Row>
          </Card.Root>
        );
      })}
    </Layout.Grid>
  );
};

//
// Vocabulary
//

const Vocabulary = ({ predicates, filter }: { predicates: Predicate[]; filter: string }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const shown = predicates.filter((predicate) =>
    matches(filter, predicate.iri, predicate.label, predicate.description, predicate.synonyms.join(' ')),
  );
  if (shown.length === 0) {
    return <Status.Empty>{t('meta-empty.message')}</Status.Empty>;
  }
  return (
    <Layout.Flex asChild column classNames='p-trim-md text-sm'>
      <ul>
        {shown.map((predicate) => {
          const [prefix, ...rest] = predicate.iri.split(':');
          return (
            <Layout.Grid
              asChild
              key={predicate.iri}
              cols={['16rem', 'fill', '12rem']}
              gap='md'
              align='start'
              classNames='py-2 border-b border-separator'
            >
              <li data-testid='lighthouse.meta.predicate' data-iri={predicate.iri}>
                <Layout.Flex column classNames='min-w-0'>
                  <span className='font-mono truncate' title={predicate.iri}>
                    {rest.length ? (
                      <>
                        <span className='text-fg-subtle'>{prefix}:</span>
                        {rest.join(':')}
                      </>
                    ) : (
                      predicate.iri
                    )}
                  </span>
                  {predicate.range && (
                    <span className='text-xs text-fg-subtle'>
                      {'->'} {predicate.range}
                    </span>
                  )}
                </Layout.Flex>
                <Layout.Flex column classNames='min-w-0'>
                  <span className='whitespace-normal'>{predicate.description ?? predicate.label}</span>
                  {predicate.synonyms.length > 0 && (
                    <span className='text-xs text-fg-subtle'>
                      {t('meta-synonyms.label', { synonyms: predicate.synonyms.join(', ') })}
                    </span>
                  )}
                </Layout.Flex>
                <span className='text-xs text-fg-subtle break-words'>{predicate.extractors.join(', ')}</span>
              </li>
            </Layout.Grid>
          );
        })}
      </ul>
    </Layout.Flex>
  );
};

//
// Issues
//

const IssueItem = ({
  issue,
  plugin,
  busy,
  onComment,
  onSetStatus,
}: {
  issue: Issue;
  plugin?: Plugin;
  busy?: boolean;
  onComment?: LighthouseMetaProps['onComment'];
  onSetStatus?: LighthouseMetaProps['onSetStatus'];
}) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [comment, setComment] = useState('');
  const note = comment.trim();
  return (
    <li className='border-b border-separator' data-testid='lighthouse.meta.issue' data-status={issue.status}>
      <Collapsible.Root>
        <Collapsible.Trigger classNames='w-full min-w-0'>
          <Layout.Flex gap='sm' align='center' classNames='min-w-0 w-full text-sm'>
            <Tag hue={statusHue(issue.status)}>{t(`issue-status.${issue.status}`)}</Tag>
            <Tag hue='neutral'>{issue.kind}</Tag>
            <span className='truncate grow text-start'>{issue.title}</span>
            {issue.domain && <span className='text-xs text-fg-subtle'>{plugin?.id ?? issue.domain}</span>}
            {issue.seen > 1 && (
              <span className='text-xs text-fg-subtle'>{t('issue-seen.label', { count: issue.seen })}</span>
            )}
            <span className='text-xs text-fg-subtle whitespace-nowrap'>{ago(issue.updated)}</span>
          </Layout.Flex>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Layout.Flex column gap='sm' classNames='ps-8 pe-2 pb-3 text-sm'>
            <Typography.Text classNames='whitespace-pre-wrap'>{issue.body}</Typography.Text>
            <Layout.Flex gap='xs' wrap align='center'>
              {issue.severity && <Tag hue='neutral'>{issue.severity}</Tag>}
              {issue.by && <Tag hue='neutral'>{t('issue-by.label', { by: issue.by })}</Tag>}
              {issue.url && (
                <Typography.Link href={issue.url} target='_blank' rel='noreferrer' classNames='truncate'>
                  {issue.url}
                </Typography.Link>
              )}
            </Layout.Flex>
            {issue.notes.length > 0 && (
              <Layout.Flex asChild column gap='xs'>
                <ol>
                  {issue.notes.map((entry, index) => (
                    <li key={index}>
                      <span className='text-xs text-fg-subtle'>
                        {ago(entry.t)} · {entry.by ?? t('issue-someone.label')}
                        {entry.status ? ` -> ${t(`issue-status.${entry.status}`)}` : ''}
                      </span>{' '}
                      {entry.text}
                    </li>
                  ))}
                </ol>
              </Layout.Flex>
            )}
            {issue.resolution && <span className='text-fg-muted'>{issue.resolution}</span>}
            {onSetStatus && (
              <Layout.Flex gap='xs' wrap>
                {ISSUE_STATUSES.filter((status) => status !== issue.status).map((status) => (
                  <Button.Root
                    key={status}
                    variant='ghost'
                    disabled={busy}
                    label={t('issue-mark.label', { status: t(`issue-status.${status}`) })}
                    onClick={() => {
                      onSetStatus(issue.id, status, note || undefined);
                      setComment('');
                    }}
                    data-testid={`lighthouse.meta.issue.mark-${status}`}
                  />
                ))}
              </Layout.Flex>
            )}
            {onComment && (
              <Layout.Grid cols={['fill', 'auto']} gap='sm' align='center'>
                <Input.Root
                  placeholder={t('issue-comment.placeholder')}
                  aria-label={t('issue-comment.label')}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && note) {
                      onComment(issue.id, note);
                      setComment('');
                    }
                  }}
                  data-testid='lighthouse.meta.issue.comment'
                />
                <Button.Root
                  variant='primary'
                  label={t('issue-comment.label')}
                  disabled={busy || !note}
                  onClick={() => {
                    onComment(issue.id, note);
                    setComment('');
                  }}
                />
              </Layout.Grid>
            )}
          </Layout.Flex>
        </Collapsible.Content>
      </Collapsible.Root>
    </li>
  );
};

const Issues = ({
  issues,
  plugins,
  filter,
  busy,
  onComment,
  onSetStatus,
}: {
  issues: Issue[];
  plugins: Plugin[];
  filter: string;
  busy?: string;
  onComment?: LighthouseMetaProps['onComment'];
  onSetStatus?: LighthouseMetaProps['onSetStatus'];
}) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [status, setStatus] = useState<IssueFilter>('active');
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const issue of issues) {
      byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
    }
    return byStatus;
  }, [issues]);
  const countOf = (candidate: IssueFilter) =>
    candidate === 'all'
      ? issues.length
      : candidate === 'active'
        ? (counts.open ?? 0) + (counts['in-progress'] ?? 0)
        : (counts[candidate] ?? 0);
  const shown = issues.filter(
    (issue) =>
      (status === 'all' || (status === 'active' ? isActive(issue) : issue.status === status)) &&
      matches(filter, issue.title, issue.body, issue.domain, issue.kind),
  );
  return (
    <Layout.Flex column gap='sm' classNames='p-trim-md'>
      <Layout.Flex gap='xs' wrap>
        {ISSUE_FILTERS.map((candidate) => (
          <Button.Root
            key={candidate}
            variant={status === candidate ? 'primary' : 'ghost'}
            aria-pressed={status === candidate}
            label={`${t(`issue-filter.${candidate}`)} ${countOf(candidate)}`}
            onClick={() => setStatus(candidate)}
            data-testid={`lighthouse.meta.issues.filter-${candidate}`}
          />
        ))}
      </Layout.Flex>
      {shown.length ? (
        <ul>
          {shown.map((issue) => (
            <IssueItem
              key={issue.id}
              issue={issue}
              plugin={pluginFor(plugins, issue.domain)}
              busy={busy === `issue:${issue.id}`}
              onComment={onComment}
              onSetStatus={onSetStatus}
            />
          ))}
        </ul>
      ) : (
        <Status.Empty>{t('issues-empty.message')}</Status.Empty>
      )}
    </Layout.Flex>
  );
};

//
// Storage
//

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Layout.Flex column classNames='min-w-0'>
    <span className='text-xs text-fg-subtle'>{label}</span>
    <span className='text-lg font-semibold tabular-nums'>{value}</span>
    {sub && <span className='text-xs text-fg-muted'>{sub}</span>}
  </Layout.Flex>
);

/** A ranked list with in-row bars: each bar is the row's share of the largest. */
const Bars = ({
  rows,
  format,
}: {
  rows: Array<{ key: string; label: string; sub?: string; n: number }>;
  format: (n: number) => string;
}) => {
  const max = Math.max(1, ...rows.map((row) => row.n));
  return (
    <Layout.Flex column gap='xs' classNames='text-sm'>
      {rows.map((row) => (
        <Layout.Grid key={row.key} cols={['minmax(0, 14rem)', 'fill', 'auto']} gap='sm' align='center'>
          <span className='truncate' title={row.key}>
            {row.label}
            {row.sub && <span className='text-fg-subtle'> {row.sub}</span>}
          </span>
          <span className='h-1.5 rounded-full bg-group-surface overflow-hidden'>
            <span className='block h-full bg-accent-bg' style={{ width: `${(row.n / max) * 100}%` }} />
          </span>
          <span className='tabular-nums text-fg-muted whitespace-nowrap'>{format(row.n)}</span>
        </Layout.Grid>
      ))}
    </Layout.Flex>
  );
};

const Section = ({
  title,
  sub,
  actions,
  children,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <Card.Root>
    <Card.Header>
      <Layout.Flex gap='sm' align='center' classNames='min-w-0 w-full py-1'>
        <Card.Title>{title}</Card.Title>
        {sub && <span className='text-xs text-fg-subtle truncate grow'>{sub}</span>}
        {actions}
      </Layout.Flex>
    </Card.Header>
    <Card.Row>
      <Layout.Flex column gap='sm' classNames='w-full min-w-0 pb-2'>
        {children}
      </Layout.Flex>
    </Card.Row>
  </Card.Root>
);

const StorageTab = ({
  storage,
  prune,
  busy,
  message,
  onClearCache,
  onPrune,
}: {
  storage: Storage;
  prune?: PruneReport;
  busy?: string;
  message?: string;
  onClearCache?: LighthouseMetaProps['onClearCache'];
  onPrune?: LighthouseMetaProps['onPrune'];
}) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // A destructive action asks once more in place: the first press arms it, the second runs it.
  const [armed, setArmed] = useState<string>();
  const { disk, snapshots, cache, store } = storage;
  const cacheBytes = cache.reduce((total, entry) => total + entry.bytes, 0);
  const confirmable = (key: string, run: () => void) => () => {
    if (armed === key) {
      setArmed(undefined);
      run();
    } else {
      setArmed(key);
    }
  };
  return (
    <Layout.Flex column gap='md' classNames='p-trim-md' data-testid='lighthouse.meta.storage'>
      <Layout.Grid cols={5} gap='md'>
        <Stat
          label={t('storage-disk.label')}
          value={formatBytes(disk.total)}
          sub={t('storage-files.label', { count: disk.areas.reduce((total, area) => total + area.files, 0) })}
        />
        <Stat
          label={t('storage-quads.label')}
          value={store.quads !== undefined ? formatCount(store.quads) : '-'}
          sub={store.graphs ? t('storage-graphs.label', { count: store.graphs.all }) : undefined}
        />
        <Stat
          label={t('storage-snapshots.label')}
          value={formatCount(snapshots.n)}
          sub={formatBytes(snapshots.bytes)}
        />
        <Stat
          label={t('storage-cache.label')}
          value={formatCount(cache.reduce((total, entry) => total + entry.entries, 0))}
          sub={t('storage-namespaces.label', { count: cache.length })}
        />
        <Stat
          label={t('storage-daemon.label')}
          value={t(store.daemon?.pid ? 'storage-daemon-up.label' : 'storage-daemon-down.label')}
          sub={
            store.daemon?.uptimeSeconds !== undefined
              ? t('storage-uptime.label', {
                  minutes: Math.round(store.daemon.uptimeSeconds / 60),
                  requests: formatCount(store.daemon.requests ?? 0),
                })
              : undefined
          }
        />
      </Layout.Grid>

      {message && (
        <Layout.Flex gap='sm' align='center' classNames='text-sm' role='status'>
          <Icon.Icon icon='ph--check-circle--regular' />
          {message}
        </Layout.Flex>
      )}

      <Section title={t('storage-disk.title')} sub={storage.workspace}>
        <Layout.Flex classNames='h-3 rounded-sm overflow-hidden' aria-label={t('storage-disk.title')}>
          {disk.areas.map((area, index) => (
            <span
              key={area.id}
              className='h-full bg-accent-bg'
              style={{ flexGrow: area.bytes, opacity: 1 - index * 0.14 }}
              title={`${area.label}: ${formatBytes(area.bytes)}`}
            />
          ))}
        </Layout.Flex>
        <Layout.Flex column gap='xs' classNames='text-sm'>
          {disk.areas.map((area) => (
            <Layout.Grid key={area.id} cols={['10rem', 'fill', 'auto', 'auto']} gap='sm' align='center'>
              <span className='truncate'>{area.label}</span>
              <span className='text-xs text-fg-subtle truncate'>{area.what}</span>
              <span className='text-xs text-fg-muted tabular-nums'>
                {t('storage-files.label', { count: area.files })}
              </span>
              <span className='font-medium tabular-nums text-end'>{formatBytes(area.bytes)}</span>
            </Layout.Grid>
          ))}
        </Layout.Flex>
      </Section>

      <Layout.Grid gap='md' align='start' classNames='grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]'>
        <Section
          title={t('storage-snapshots.label')}
          sub={`${ago(snapshots.oldest)} -> ${ago(snapshots.newest)}`}
          actions={
            prune &&
            onPrune && (
              <Button.Root
                variant={armed === 'prune' ? 'primary' : 'ghost'}
                icon={busy === 'prune' ? 'ph--circle-notch--regular' : 'ph--broom--regular'}
                label={
                  armed === 'prune'
                    ? t('storage-prune-confirm.label', { count: prune.snapshots, bytes: formatBytes(prune.bytes) })
                    : t('storage-prune.label', { count: prune.snapshots, bytes: formatBytes(prune.bytes) })
                }
                disabled={!prune.snapshots || !!busy}
                onClick={confirmable('prune', onPrune)}
                data-testid='lighthouse.meta.storage.prune'
              />
            )
          }
        >
          <span className='text-xs text-fg-subtle'>
            {prune ? `${t('storage-cited.label', { count: prune.cited })} · ` : ''}
            {t('storage-a11y.label', { count: snapshots.a11y })}
          </span>
          <Heading>{t('storage-by-backend.label')}</Heading>
          <Bars
            rows={snapshots.byBackend.map((row) => ({
              key: row.key,
              label: row.key,
              sub: formatCount(row.n),
              n: row.bytes,
            }))}
            format={formatBytes}
          />
          <Heading>{t('storage-by-host.label')}</Heading>
          <Bars
            rows={snapshots.byHost.map((row) => ({
              key: row.key,
              label: row.key,
              sub: formatCount(row.n),
              n: row.bytes,
            }))}
            format={formatBytes}
          />
        </Section>

        <Section
          title={t('storage-cache.title')}
          sub={formatBytes(cacheBytes)}
          actions={
            onClearCache && (
              <Button.Root
                variant={armed === 'cache:*' ? 'primary' : 'ghost'}
                icon='ph--trash--regular'
                label={t(armed === 'cache:*' ? 'storage-clear-all-confirm.label' : 'storage-clear-all.label')}
                disabled={!cache.length || !!busy}
                onClick={confirmable('cache:*', () => onClearCache())}
                data-testid='lighthouse.meta.storage.clear-all'
              />
            )
          }
        >
          {cache.length === 0 ? (
            <span className='text-sm text-fg-subtle'>{t('storage-cache-empty.message')}</span>
          ) : (
            <Layout.Flex column gap='xs' classNames='text-sm'>
              {cache.map((entry) => (
                <Layout.Grid key={entry.namespace} cols={['fill', 'auto', 'auto', 'auto']} gap='sm' align='center'>
                  <span className='font-mono truncate'>{entry.namespace}</span>
                  <span className='tabular-nums text-fg-muted'>{formatCount(entry.entries)}</span>
                  <span className='tabular-nums'>{formatBytes(entry.bytes)}</span>
                  {onClearCache ? (
                    <Button.Root
                      variant={armed === `cache:${entry.namespace}` ? 'primary' : 'ghost'}
                      icon={busy === `cache:${entry.namespace}` ? 'ph--circle-notch--regular' : 'ph--x--regular'}
                      iconOnly
                      label={t('storage-clear.label', { namespace: entry.namespace })}
                      disabled={!!busy}
                      onClick={confirmable(`cache:${entry.namespace}`, () => onClearCache(entry.namespace))}
                    />
                  ) : (
                    <span />
                  )}
                </Layout.Grid>
              ))}
            </Layout.Flex>
          )}
        </Section>

        <Section
          title={t('storage-extractors.title')}
          sub={
            store.graphs
              ? t('storage-current.label', {
                  current: formatCount(store.graphs.all - store.graphs.superseded),
                  superseded: formatCount(store.graphs.superseded),
                })
              : undefined
          }
        >
          <Bars
            rows={(store.extractors.value ?? []).map((row) => ({
              key: row.key,
              label: row.key.replace(/@.*/, ''),
              sub: row.key.replace(/^[^@]*/, ''),
              n: row.n,
            }))}
            format={formatCount}
          />
        </Section>

        <Section title={t('storage-types.title')}>
          <Bars
            rows={(store.types.value ?? []).map((row) => ({ key: row.key, label: localName(row.key), n: row.n }))}
            format={formatCount}
          />
        </Section>

        <Section title={t('storage-predicates.title')}>
          <Bars
            rows={(store.predicates.value ?? []).map((row) => ({ key: row.key, label: localName(row.key), n: row.n }))}
            format={formatCount}
          />
        </Section>
      </Layout.Grid>
    </Layout.Flex>
  );
};

//
// LighthouseMeta
//

/**
 * Lighthouse looking at itself, for one connection: the plugins that extend it, the vocabulary its extractors write,
 * the issues agents filed (with triage: comments and status), and where the workspace's bytes go (cache clear and
 * snapshot prune). Ported from lighthouse's web UI MetaPage and StoragePage.
 */
export const LighthouseMeta = ({
  role,
  plugins = [],
  predicates = [],
  issues = [],
  storage,
  prune,
  error,
  busy,
  message,
  defaultTab = 'plugins',
  toolbar,
  onReload,
  onComment,
  onSetStatus,
  onClearCache,
  onPrune,
}: LighthouseMetaProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [tab, setTab] = useState<MetaTab>(defaultTab);
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const readable = useMemo(() => readStorage(storage), [storage]);
  const counts: Record<MetaTab, number | undefined> = {
    plugins: plugins.length,
    vocabulary: predicates.length,
    issues: issues.filter(isActive).length,
    storage: undefined,
  };

  return (
    <Tabs.Root
      asChild
      value={tab}
      onValueChange={(value) => setTab(META_TABS.find((candidate) => candidate === value) ?? 'plugins')}
    >
      <Panel.Root role={role} data-testid='lighthouse.meta'>
        <Panel.Header>
          <Toolbar.Root>
            <Tabs.List>
              {META_TABS.map((value) => (
                <Tabs.Trigger key={value} value={value} data-testid={`lighthouse.meta.tab.${value}`}>
                  {t(`meta-tab.${value}`)}
                  {counts[value] !== undefined && (
                    <span className='ms-1 text-fg-subtle tabular-nums'>{counts[value]}</span>
                  )}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Toolbar.Separator variant='gap' />
            {tab !== 'storage' && (
              <Input.Root
                placeholder={t('meta-filter.placeholder')}
                aria-label={t('meta-filter.placeholder')}
                value={filter}
                noAutoFill
                start={<Icon.Icon icon='ph--magnifying-glass--regular' />}
                onChange={(event) => setFilter(event.target.value)}
                classNames='max-w-64'
                data-testid='lighthouse.meta.filter'
              />
            )}
            {toolbar}
            {onReload && (
              <Button.Root
                variant='ghost'
                icon='ph--arrow-clockwise--regular'
                iconOnly
                label={t('meta-reload.label')}
                onClick={onReload}
              />
            )}
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              {error && (
                <Typography.Text classNames='p-trim-md text-error-text' role='alert'>
                  {error}
                </Typography.Text>
              )}
              <Tabs.Content value='plugins'>
                <Plugins plugins={plugins} issues={issues} filter={query} />
              </Tabs.Content>
              <Tabs.Content value='vocabulary'>
                <Vocabulary predicates={predicates} filter={query} />
              </Tabs.Content>
              <Tabs.Content value='issues'>
                <Issues
                  issues={issues}
                  plugins={plugins}
                  filter={query}
                  busy={busy}
                  onComment={onComment}
                  onSetStatus={onSetStatus}
                />
              </Tabs.Content>
              <Tabs.Content value='storage'>
                {readable ? (
                  <StorageTab
                    storage={readable}
                    prune={prune}
                    busy={busy}
                    message={message}
                    onClearCache={onClearCache}
                    onPrune={onPrune}
                  />
                ) : (
                  <Status.Empty>{t(error ? 'storage-unavailable.message' : 'storage-loading.message')}</Status.Empty>
                )}
              </Tabs.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    </Tabs.Root>
  );
};

LighthouseMeta.displayName = 'LighthouseMeta';
