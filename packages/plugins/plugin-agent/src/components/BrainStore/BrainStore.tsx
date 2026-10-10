//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useState } from 'react';

import * as Accordion from '@dxos/react-ui/Accordion';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';

import type * as BrainInspection from '../../brain/BrainInspection.ts';

const VIEWS = ['facts', 'rules', 'encoding', 'outbox'] as const;

type BrainStoreView = (typeof VIEWS)[number];

const isView = (value: string): value is BrainStoreView => VIEWS.some((view) => view === value);

type BrainStoreProps = {
  role?: string;
  /** Absent while the first read is in flight. */
  inspection?: BrainInspection.Inspection;
  /** Why the last read failed. */
  error?: string;
  defaultView?: BrainStoreView;
};

/**
 * A debug view of an agent's brain store as held: its raw facts, each subscription's rules, the facts encoded as the
 * Datalog relations those rules match, and the outboxes.
 */
const BrainStore = ({ role, inspection, error, defaultView = 'facts' }: BrainStoreProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [view, setView] = useState<BrainStoreView>(defaultView);
  return (
    <Tabs.Root asChild orientation='horizontal' value={view} onValueChange={(value) => isView(value) && setView(value)}>
      <Panel.Root role={role}>
        <Panel.Header>
          <Toolbar.Root>
            <Tabs.List>
              {VIEWS.map((value) => (
                <Tabs.Trigger key={value} value={value} data-testid={`brain-store-tab-${value}`}>
                  {t(`brain-debug-${value}.label`)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Toolbar.Root>
        </Panel.Header>
        {error ? (
          <Status>{t('brain-debug-error.message', { error })}</Status>
        ) : !inspection ? (
          <Status>{t('brain-debug-loading.message')}</Status>
        ) : (
          <Panel.Body asChild>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport classNames='p-2'>
                {view === 'facts' && <Facts facts={inspection.facts} />}
                {view === 'rules' && <Rules subscriptions={inspection.subscriptions} />}
                {view === 'encoding' && <Encoding encoding={inspection.encoding} />}
                {view === 'outbox' && <Outbox subscriptions={inspection.subscriptions} stats={inspection.stats} />}
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Body>
        )}
      </Panel.Root>
    </Tabs.Root>
  );
};

BrainStore.displayName = 'BrainStore';

//
// Sections
//

const Facts = ({ facts }: { facts: readonly BrainInspection.Fact[] }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (facts.length === 0) {
    return <Empty>{t('brain-debug-facts-empty.message')}</Empty>;
  }

  return (
    <Accordion.Root border={false}>
      {facts.map(({ id, text, speaker, saidAt, fact }) => (
        <Accordion.Item key={id} value={id} data-testid='brain-store-fact'>
          <Accordion.ItemTrigger>
            <Typography.Text asChild mono truncate>
              <span>{[saidAt, speaker, text].filter((part) => part !== undefined).join('  ')}</span>
            </Typography.Text>
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Code>{JSON.stringify(fact, null, 2)}</Code>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};

const Rules = ({ subscriptions }: { subscriptions: readonly BrainInspection.Subscription[] }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (subscriptions.length === 0) {
    return <Empty>{t('brain-debug-rules-empty.message')}</Empty>;
  }

  const none = t('brain-debug-none.label');
  return (
    <Accordion.Root border={false}>
      {subscriptions.map((subscription) => (
        <Accordion.Item key={subscription.id} value={subscription.id} data-testid='brain-store-subscription'>
          <Accordion.ItemTrigger>
            <Typography.Text asChild mono truncate>
              <span>{subscription.when || subscription.id}</span>
            </Typography.Text>
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Fields
              fields={[
                [t('brain-debug-id.label'), subscription.id],
                [t('brain-debug-when.label'), subscription.when || none],
                [
                  t('brain-debug-rules-source.label'),
                  t(subscription.compiled ? 'brain-debug-rules-compiled.label' : 'brain-debug-rules-translated.label'),
                ],
                [
                  t('brain-debug-ongoing.label'),
                  t(subscription.ongoing ? 'brain-debug-yes.label' : 'brain-debug-no.label'),
                ],
                [t('brain-debug-created-at.label'), subscription.createdAt],
                [t('brain-debug-goal.label'), subscription.goal ?? none],
                [t('brain-debug-request.label'), subscription.request ?? none],
                [t('brain-debug-recipient.label'), subscription.recipient],
                [t('brain-debug-message.label'), subscription.message],
              ]}
            />
            <Code testId='brain-store-rules'>{subscription.rules}</Code>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};

const Encoding = ({ encoding }: { encoding: readonly BrainInspection.EncodedFact[] }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (encoding.length === 0) {
    return <Empty>{t('brain-debug-encoding-empty.message')}</Empty>;
  }

  // A blank line between facts keeps each fact's relations together, as a rules file would.
  return <Code testId='brain-store-encoding'>{encoding.map(({ lines }) => lines.join('\n')).join('\n\n')}</Code>;
};

const Outbox = ({
  subscriptions,
  stats,
}: {
  subscriptions: readonly BrainInspection.Subscription[];
  stats: BrainInspection.Stats;
}) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const none = t('brain-debug-none.label');
  return (
    <Layout.Flex column gap='md'>
      <Fields
        testId='brain-store-stats'
        fields={[
          [t('brain-debug-stat-facts.label'), String(stats.facts)],
          [t('brain-debug-stat-subscriptions.label'), String(stats.subscriptions)],
          [t('brain-debug-stat-pending.label'), String(stats.pending)],
          [t('brain-debug-stat-oldest-pending.label'), stats.oldestPendingAt ?? none],
          [t('brain-debug-stat-next-due.label'), stats.nextDueAt ?? none],
        ]}
      />
      {subscriptions.length > 0 && (
        <Accordion.Root border={false}>
          {subscriptions.map(({ id, when, pending }) => (
            <Accordion.Item key={id} value={id} data-testid='brain-store-outbox'>
              <Accordion.ItemTrigger>
                <Typography.Text asChild mono truncate>
                  <span>
                    {t('brain-debug-pending.label', { count: pending.length })} {when || id}
                  </span>
                </Typography.Text>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                {pending.length === 0 ? (
                  <Empty>{t('brain-debug-pending-empty.message')}</Empty>
                ) : (
                  <Code>
                    {pending
                      .map(({ at, label, id, facts }) => [at, label, id, facts.join(',') || none].join('  '))
                      .join('\n')}
                  </Code>
                )}
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
    </Layout.Flex>
  );
};

//
// Parts
//

const Status = ({ children }: { children: ReactNode }) => (
  <Panel.Body>
    <Layout.Flex center classNames='p-2 text-fg-muted' role='status'>
      {children}
    </Layout.Flex>
  </Panel.Body>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <Typography.Text tone='muted' role='status'>
    {children}
  </Typography.Text>
);

/** Preformatted monospace text that wraps, so long ids and quotes stay readable in a narrow companion. */
const Code = ({ children, testId }: { children: string; testId?: string }) => (
  <Typography.Text asChild mono classNames='whitespace-pre-wrap break-all text-xs' data-testid={testId}>
    <pre>{children}</pre>
  </Typography.Text>
);

const Fields = ({ fields, testId }: { fields: ReadonlyArray<readonly [string, string]>; testId?: string }) => (
  <Layout.Grid cols={['max', 'fill']} gap='xs' classNames='text-xs' data-testid={testId}>
    {fields.map(([label, value]) => (
      <React.Fragment key={label}>
        <Typography.Text tone='muted'>{label}</Typography.Text>
        <Typography.Text mono classNames='break-all'>
          {value}
        </Typography.Text>
      </React.Fragment>
    ))}
  </Layout.Grid>
);

export { BrainStore };

export type { BrainStoreProps, BrainStoreView };
