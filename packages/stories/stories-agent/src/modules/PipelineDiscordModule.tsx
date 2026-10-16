//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { type Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { LogEntry, LogLevel } from '@dxos/log';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';
import * as DiscordAdminOperation from '@dxos/plugin-discord/DiscordAdminOperation';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import { type BrainCrawlProtocol } from '@dxos/protocols';
import { useConfig } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { LogBuffer, Logger } from '@dxos/react-ui-debug';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

/** As the bot monitor's: fast enough to catch a target's pending → active → done steps. */
const POLL_MS = 2_000;

/** How many transitions the timeline keeps. */
const MAX_ENTRIES = 200;

/** Fed only by the poll below, so the timeline shows crawl transitions rather than the app's `@dxos/log` stream. */
const timelineBuffer = new LogBuffer();

/** `kind` of a feed this panel creates for the crawl's facts. */
const FACT_FEED_KIND = 'org.dxos.plugin.agent.facts';

/** The Select's value for "no fact feed": the brain only indexes. */
const NO_FEED = 'none';

/** What the user changed in the form; every unset field falls back to the space's Discord config or EDGE's config. */
type Edits = {
  applicationId?: string;
  channels?: string[];
  maxDays?: number;
  descendThreads?: boolean;
  maxDepth?: number;
  factFeed?: string;
};

/** A Discord channel the crawl can read: bound in the space, or already in EDGE's config. */
type ChannelOption = { id: string; guildId?: string };

type SpaceSources = {
  /** The application the space's Discord channels are bound to. */
  applicationId?: string;
  channels: ChannelOption[];
  /** Feeds a fact feed can be: named ones, and the ones this panel created. */
  feeds: { id: string; label: string; feed: Feed.Feed }[];
};

const RUN_HUE: Record<BrainCrawlProtocol.RunStatus, Tag.TagHue> = {
  idle: 'neutral',
  running: 'info',
  paused: 'warning',
  done: 'success',
  error: 'error',
};

const TARGET_HUE: Record<BrainCrawlProtocol.TargetStatus, Tag.TagHue> = {
  pending: 'neutral',
  active: 'info',
  done: 'success',
  error: 'error',
};

/** One timeline line per distinct crawl state: run status, targets finished, and the read and extracted counts. */
const describe = (status: BrainCrawlProtocol.CrawlStatus): string =>
  [
    status.runStatus,
    `${status.targets.filter((target) => target.status === 'done').length}/${status.targets.length} targets`,
    `${status.messages} messages`,
    `${status.facts} facts`,
    status.summary.errored > 0 && `${status.summary.errored} errored`,
    status.lastError && `error: ${status.lastError}`,
  ]
    .filter(Boolean)
    .join(' · ');

const levelOf = (status: BrainCrawlProtocol.CrawlStatus): LogLevel =>
  status.runStatus === 'error' || status.lastError
    ? LogLevel.ERROR
    : status.summary.errored > 0
      ? LogLevel.WARN
      : LogLevel.INFO;

const targetLabel = (target: BrainCrawlProtocol.CrawlTarget, names: Record<string, string>): string =>
  target.threadId ? `thread ${target.threadId}` : `#${names[target.channelId] ?? target.channelId}`;

const targetDetail = (target: BrainCrawlProtocol.CrawlTarget): string =>
  [
    `depth ${target.depth}`,
    target.cursor ? `cursor ${target.cursor}` : 'not read yet',
    target.lastRunAt && `run ${new Date(target.lastRunAt).toLocaleTimeString()}`,
    target.lastError && `error: ${target.lastError}`,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Configures, controls and observes the Discord back-index EDGE runs in the space's first agent's brain: which
 * channels it crawls and how far back, Pause / Resume / Reset, and its progress as EDGE reports it, polled into a
 * table of targets and a timeline of transitions.
 */
export const PipelineDiscordModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const db = space?.db;
  const [agent] = useQuery(db, Filter.type(Agent.Agent));
  const { invokePromise } = AppHooks.useOperationInvoker();
  const config = useConfig();
  const kaiId = DiscordChannel.kaiApplicationId(config.values.runtime?.services?.edge?.url);

  const sources = useSpaceSources(db);
  const [status, setStatus] = useState<BrainCrawlProtocol.CrawlStatus>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Edits>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [bound, setBound] = useState<string[]>([]);

  const applicationId = edits.applicationId ?? status?.config?.applicationId ?? sources.applicationId ?? kaiId ?? '';
  const channelOptions = useMemo(() => {
    const ids = new Set([...sources.channels.map(({ id }) => id), ...bound, ...(status?.config?.channels ?? [])]);
    return [...ids].map((id) => ({ value: id, label: `#${names[id] ?? id}` }));
  }, [sources.channels, bound, status?.config?.channels, names]);
  const channels = edits.channels ?? [...(status?.config?.channels ?? channelOptions.map(({ value }) => value))];
  const maxDays = edits.maxDays ?? status?.config?.maxDays;
  const descendThreads = edits.descendThreads ?? status?.config?.descendThreads ?? true;
  const maxDepth = edits.maxDepth ?? status?.config?.maxDepth;
  const factFeed = edits.factFeed ?? NO_FEED;

  // Names and bindings come from Discord through EDGE; a failure only leaves ids showing.
  useEffect(() => {
    if (!space || !applicationId) {
      return;
    }
    let cancelled = false;
    const guilds = [...new Set(sources.channels.flatMap(({ guildId }) => (guildId ? [guildId] : [])))];
    void Promise.all([
      invokePromise(DiscordAdminOperation.ListBindings, { applicationId }, { spaceId: space.id }),
      ...guilds.map((guildId) =>
        invokePromise(DiscordAdminOperation.ListGuildChannels, { applicationId, guildId }, { spaceId: space.id }),
      ),
    ]).then(([bindings, ...listed]) => {
      if (cancelled) {
        return;
      }
      setBound((bindings.data?.bindings ?? []).map(({ discordChannelId }) => discordChannelId));
      setNames(
        Object.fromEntries(listed.flatMap(({ data }) => (data?.channels ?? []).map(({ id, name }) => [id, name]))),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [invokePromise, space, applicationId, sources.channels]);

  const lastRef = useRef<string>(undefined);
  useEffect(() => {
    lastRef.current = undefined;
    timelineBuffer.clear();
  }, []);

  /** Shows what EDGE answered, and records it on the timeline when the crawl moved. */
  const apply = useCallback((next: BrainCrawlProtocol.CrawlStatus) => {
    setStatus(next);
    const message = describe(next);
    if (message !== lastRef.current) {
      lastRef.current = message;
      timelineBuffer.append(new LogEntry({ level: levelOf(next), message }));
    }
  }, []);

  useEffect(() => {
    if (!agent || !space) {
      return;
    }
    // One read at a time, and none applied after unmount: a slow EDGE would otherwise stack reads and land them out of order.
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        const { data, error } = await invokePromise(
          AgentOperation.GetCrawlStatus,
          { agent: Ref.make(agent) },
          { spaceId: space.id },
        );
        if (!cancelled) {
          setError(error?.message);
          if (data) {
            apply(data);
          }
        }
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [invokePromise, agent, space, apply]);

  /** Runs one control and applies its answer, which every crawl route returns. */
  const control = useCallback(
    async (
      run: () => Promise<{ data?: BrainCrawlProtocol.CrawlStatus; error?: Error }>,
      { keepEdits = true }: { keepEdits?: boolean } = {},
    ) => {
      setBusy(true);
      try {
        const { data, error } = await run();
        setError(error?.message);
        if (data) {
          apply(data);
          if (!keepEdits) {
            setEdits({});
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const handleStart = useCallback(() => {
    if (!agent || !space) {
      return;
    }
    const feed = sources.feeds.find(({ id }) => id === factFeed)?.feed;
    void control(
      () =>
        invokePromise(
          AgentOperation.ConfigureCrawl,
          {
            agent: Ref.make(agent),
            applicationId,
            channels,
            descendThreads,
            ...(maxDays !== undefined ? { maxDays } : {}),
            ...(maxDepth !== undefined ? { maxDepth } : {}),
            ...(feed ? { factFeed: Ref.make(feed) } : {}),
          },
          { spaceId: space.id },
        ),
      { keepEdits: false },
    );
  }, [
    agent,
    space,
    control,
    invokePromise,
    applicationId,
    channels,
    descendThreads,
    maxDays,
    maxDepth,
    factFeed,
    sources.feeds,
  ]);

  const handleSimple = useCallback(
    (operation: typeof AgentOperation.PauseCrawl | typeof AgentOperation.ResumeCrawl) => {
      if (agent && space) {
        void control(() => invokePromise(operation, { agent: Ref.make(agent) }, { spaceId: space.id }));
      }
    },
    [agent, space, control, invokePromise],
  );

  const handleReset = useCallback(
    (targets?: string[]) => {
      if (agent && space) {
        void control(() =>
          invokePromise(
            AgentOperation.ResetCrawl,
            { agent: Ref.make(agent), ...(targets ? { targets } : {}) },
            { spaceId: space.id },
          ),
        );
      }
    },
    [agent, space, control, invokePromise],
  );

  const handleCreateFeed = useCallback(() => {
    if (db) {
      const feed = db.add(Feed.make({ name: `${agent?.name ?? 'Agent'} facts`, kind: FACT_FEED_KIND }));
      setEdits((previous) => ({ ...previous, factFeed: feed.id }));
    }
  }, [db, agent]);

  const runStatus = status?.runStatus ?? 'idle';
  const configured = status?.config !== undefined;
  const canStart = !busy && !!agent && applicationId.length > 0 && channels.length > 0;
  const feedItems = useMemo(
    () => [
      { value: NO_FEED, label: 'None (index only)' },
      ...sources.feeds.map(({ id, label }) => ({ value: id, label })),
    ],
    [sources.feeds],
  );
  const targetItems = useMemo(
    () =>
      (status?.targets ?? []).map((target) => ({
        value: target.id,
        label: targetLabel(target, names),
        description: targetDetail(target),
        icon: target.threadId ? 'ph--chats-circle--regular' : 'ph--hash--regular',
      })),
    [status?.targets, names],
  );

  if (!agent) {
    return <Status.Empty>No agent in this space.</Status.Empty>;
  }

  return (
    <Logger.Root buffer={timelineBuffer} maxLines={MAX_ENTRIES}>
      <Layout.Flex column grow>
        <Panel.Root data-testid='pipeline-discord' classNames='dx-grow'>
          <Panel.Header>
            <Toolbar.Root>
              <Toolbar.Text>Discord pipeline</Toolbar.Text>
              <Tag.Tag hue={RUN_HUE[runStatus]} data-testid='crawl-run-status'>
                {runStatus}
              </Tag.Tag>
              <Toolbar.Separator />
              <Button.Root
                icon='ph--play--regular'
                label={configured ? 'Apply' : 'Start'}
                disabled={!canStart}
                onClick={handleStart}
              />
              <Button.Root
                icon='ph--pause--regular'
                label='Pause'
                disabled={busy || !configured || runStatus === 'paused'}
                onClick={() => handleSimple(AgentOperation.PauseCrawl)}
              />
              <Button.Root
                icon='ph--play-circle--regular'
                label='Resume'
                disabled={busy || runStatus !== 'paused'}
                onClick={() => handleSimple(AgentOperation.ResumeCrawl)}
              />
              <Button.Root
                icon='ph--arrow-counter-clockwise--regular'
                label='Reset all'
                disabled={busy || !configured}
                onClick={() => handleReset()}
              />
            </Toolbar.Root>
          </Panel.Header>
          <Panel.Body>
            <Form.Root variant='settings'>
              <Form.Viewport scroll>
                <Form.Content>
                  <Form.FieldSet label='Configure' description="The bot reads these channels into the agent's brain.">
                    <Form.Field label='Application' description='The Discord app (bot) bound to the channels.'>
                      <Input.Root
                        variant='mono'
                        value={applicationId}
                        onChange={(event) =>
                          setEdits((previous) => ({ ...previous, applicationId: event.target.value }))
                        }
                      />
                    </Form.Field>
                    <Form.Field
                      standalone
                      label='Channels'
                      description='Bound in this space with the Discord companion; pick the ones to crawl.'
                    >
                      <Listbox.Root
                        items={channelOptions}
                        selectionMode='multiple'
                        value={channels}
                        onValueChange={(value) => setEdits((previous) => ({ ...previous, channels: value }))}
                      >
                        <Listbox.Content aria-label='Channels'>
                          {channelOptions.map((item) => (
                            <Listbox.Item key={item.value} item={item}>
                              <Listbox.ItemIndicator />
                              <Listbox.ItemText />
                            </Listbox.Item>
                          ))}
                        </Listbox.Content>
                        <Listbox.Empty>No Discord channel bound in this space.</Listbox.Empty>
                      </Listbox.Root>
                    </Form.Field>
                    <Form.Field label='Max days' description='How far back a channel crawled for the first time goes.'>
                      <Input.Number
                        min={1}
                        placeholder='All history'
                        value={maxDays === undefined ? '' : String(maxDays)}
                        onValueChange={(_text, value) =>
                          setEdits((previous) => ({ ...previous, maxDays: Number.isNaN(value) ? undefined : value }))
                        }
                      />
                    </Form.Field>
                    <Form.Field label='Descend threads' description='Crawl the threads started in the channels.'>
                      <Input.Switch
                        checked={descendThreads}
                        onCheckedChange={({ checked }) =>
                          setEdits((previous) => ({ ...previous, descendThreads: checked === true }))
                        }
                      />
                    </Form.Field>
                    <Form.Field label='Max depth' description='How deep threads are descended.'>
                      <Input.Number
                        min={0}
                        placeholder='Unbounded'
                        disabled={!descendThreads}
                        value={maxDepth === undefined ? '' : String(maxDepth)}
                        onValueChange={(_text, value) =>
                          setEdits((previous) => ({ ...previous, maxDepth: Number.isNaN(value) ? undefined : value }))
                        }
                      />
                    </Form.Field>
                    <Form.Field
                      label='Fact feed'
                      description="Every extracted fact is also appended here, the brain's exportable record."
                    >
                      <Layout.Flex gap='sm'>
                        <Select.Root
                          items={feedItems}
                          value={[factFeed]}
                          onValueChange={({ value: [value] }) =>
                            value && setEdits((previous) => ({ ...previous, factFeed: value }))
                          }
                        >
                          <Select.Trigger placeholder='None' />
                          <Select.Content>
                            {feedItems.map((item) => (
                              <Select.Item key={item.value} item={item} />
                            ))}
                          </Select.Content>
                        </Select.Root>
                        <Button.Root icon='ph--plus--regular' label='New feed' onClick={handleCreateFeed} />
                      </Layout.Flex>
                    </Form.Field>
                  </Form.FieldSet>

                  <Form.FieldSet label='Progress'>
                    <Form.Field standalone label='Status'>
                      <Layout.Flex gap='sm' wrap>
                        <Tag.Tag hue={RUN_HUE[runStatus]}>{runStatus}</Tag.Tag>
                        <Tag.Tag hue={status?.summary.done ? 'success' : 'neutral'}>
                          {status?.summary.done ? 'all targets read' : 'targets left'}
                        </Tag.Tag>
                        <Tag.Tag hue={status?.summary.errored ? 'error' : 'neutral'}>
                          {`${status?.summary.errored ?? 0} errored`}
                        </Tag.Tag>
                      </Layout.Flex>
                    </Form.Field>
                    <Form.Field standalone label='Messages read'>
                      <Typography.Text data-testid='crawl-messages'>{status?.messages ?? 0}</Typography.Text>
                    </Form.Field>
                    <Form.Field standalone label='Facts in brain'>
                      <Typography.Text data-testid='crawl-facts'>{status?.facts ?? 0}</Typography.Text>
                    </Form.Field>
                    <Form.Field standalone label='Last step'>
                      {status?.lastStepAt ? (
                        <Typography.Timestamp date={status.lastStepAt} />
                      ) : (
                        <Typography.Text tone='muted'>Not yet</Typography.Text>
                      )}
                    </Form.Field>
                    {(status?.lastError ?? error) && (
                      <Form.Field standalone label='Last error'>
                        <Typography.Text data-testid='crawl-error'>{status?.lastError ?? error}</Typography.Text>
                      </Form.Field>
                    )}
                  </Form.FieldSet>

                  <Form.FieldSet label='Targets' description='Each channel and thread, with where the crawl resumes.'>
                    <Listbox.Root items={targetItems} selectionMode='none'>
                      <Listbox.Content aria-label='Targets' data-testid='crawl-targets'>
                        {(status?.targets ?? []).map((target, index) => (
                          <Listbox.Item
                            key={target.id}
                            item={targetItems[index]}
                            data-testid={`crawl-target-${target.id}`}
                          >
                            <Listbox.ItemIcon />
                            <Listbox.ItemText />
                            <Listbox.ItemDescription />
                            <Tag.Tag hue={TARGET_HUE[target.status]}>{target.status}</Tag.Tag>
                            <Button.Root
                              variant='ghost'
                              iconOnly
                              icon='ph--arrow-counter-clockwise--regular'
                              label={`Reset ${targetItems[index].label}`}
                              disabled={busy}
                              onClick={() => handleReset([target.id])}
                            />
                          </Listbox.Item>
                        ))}
                      </Listbox.Content>
                      <Listbox.Empty>Nothing crawled yet; Start reads the channels above.</Listbox.Empty>
                    </Listbox.Root>
                  </Form.FieldSet>
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </Panel.Body>
        </Panel.Root>

        <Panel.Root data-testid='crawl-timeline' classNames='h-48'>
          <Panel.Header>
            <Toolbar.Root>
              <Toolbar.Text>Timeline</Toolbar.Text>
            </Toolbar.Root>
          </Panel.Header>
          <Panel.Body asChild>
            <Logger.Content>
              <Logger.List checkable={false} />
            </Logger.Content>
          </Panel.Body>
        </Panel.Root>
      </Layout.Flex>
    </Logger.Root>
  );
};

/**
 * The space's Discord channels (from every Discord channel config) and its feeds. A query re-emits on membership
 * only, so the configs' fields are read through per-object subscriptions in one derived atom.
 */
const useSpaceSources = (db: Database.Database | undefined): SpaceSources => {
  const configs = useQuery(db, Filter.type(DiscordChannel.DiscordChannel));
  const feeds = useQuery(db, Filter.type(Feed.Feed));
  const sourcesAtom = useMemo(
    () =>
      Atom.make((get): SpaceSources => {
        configs.forEach((config) => get(Obj.atom(config)));
        feeds.forEach((feed) => get(Obj.atom(feed)));
        const channels = new Map<string, ChannelOption>();
        for (const config of configs) {
          for (const id of config.channels) {
            channels.set(id, { id, ...(config.guildId ? { guildId: config.guildId } : {}) });
          }
        }
        return {
          applicationId: configs.find(({ applicationId }) => applicationId.length > 0)?.applicationId,
          channels: [...channels.values()],
          feeds: feeds
            .filter((feed) => feed.kind === FACT_FEED_KIND || feed.name)
            .map((feed) => ({ id: feed.id, label: feed.name ?? feed.id, feed })),
        };
      }),
    [configs, feeds],
  );
  return useAtomValue(sourcesAtom);
};
