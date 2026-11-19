//
// Copyright 2026 DXOS.org
//

import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Trigger from '@dxos/compute/Trigger';
import * as CrawlState from '@dxos/crawler/CrawlState';
import { Filter, Obj, Ref } from '@dxos/echo';
import { MemoryQuery } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type SpaceId } from '@dxos/keys';
import { LogEntry, LogLevel, log } from '@dxos/log';
import * as DiscordAdminOperation from '@dxos/plugin-discord/DiscordAdminOperation';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import * as DiscordOperation from '@dxos/plugin-discord/DiscordOperation';
import { useClient, useConfig } from '@dxos/react-client';
import { useObject, useQuery } from '@dxos/react-client/echo';
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

/** How many transitions the timeline keeps. */
const MAX_ENTRIES = 200;

/** Fed only by the crawl state's changes, so the timeline shows crawl transitions rather than the app's log stream. */
const timelineBuffer = new LogBuffer();

/** How often the trigger runs the crawl. */
const INTERVALS = [
  { value: DiscordOperation.DEFAULT_BACK_INDEX_CRON, label: 'Every 2 minutes' },
  { value: '*/10 * * * *', label: 'Every 10 minutes' },
  { value: '0 * * * *', label: 'Hourly' },
];

/** What the user changed in the form; every unset field falls back to the back-index's trigger input. */
type Edits = {
  channels?: string[];
  maxDays?: number;
  descendThreads?: boolean;
  maxDepth?: number;
  cron?: string;
};

const RUN_HUE: Record<CrawlState.RunStatus, Tag.TagHue> = {
  idle: 'neutral',
  running: 'info',
  paused: 'warning',
  done: 'success',
  error: 'error',
};

const TARGET_HUE: Record<string, Tag.TagHue> = {
  pending: 'neutral',
  active: 'info',
  done: 'success',
  error: 'error',
};

type StateView = Pick<CrawlState.CrawlState, 'runStatus' | 'targets' | 'messages' | 'lastRun'>;

/** One timeline line per distinct crawl state: run status, targets finished, messages read and the last run. */
const describe = (state: StateView, enabled: boolean, facts: number): string => {
  const targets = CrawlState.listTargets(state);
  return [
    enabled ? state.runStatus : 'paused',
    `${targets.filter((target) => target.status === 'done').length}/${targets.length} targets`,
    `${state.messages} messages`,
    `${facts} facts`,
    state.lastRun?.error && `error: ${state.lastRun.error}`,
  ]
    .filter(Boolean)
    .join(' · ');
};

const targetLabel = (target: { threadId?: string; channelId: string }, names: Record<string, string>): string =>
  target.threadId ? `thread ${target.threadId}` : `#${names[target.channelId] ?? target.channelId}`;

const targetDetail = (target: { depth: number; cursor?: string; lastRunAt?: string; lastError?: string }): string =>
  [
    `depth ${target.depth}`,
    target.cursor ? `cursor ${target.cursor}` : 'not read yet',
    target.lastRunAt && `run ${new Date(target.lastRunAt).toLocaleTimeString()}`,
    target.lastError && `error: ${target.lastError}`,
  ]
    .filter(Boolean)
    .join(' · ');

/** How many facts the space's memory holds, refreshed as each batch is applied. */
const useMemoryFactCount = (spaceId: SpaceId | undefined): number => {
  const client = useClient();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!spaceId) {
      return;
    }
    const memory = client.memory(spaceId);
    const refresh = () =>
      void EffectEx.runPromise(memory.query(MemoryQuery.facts())).then(
        (facts) => setCount(facts.length),
        (error) => log.catch(error),
      );
    const scope = Scope.makeUnsafe();
    void EffectEx.runPromise(client.rdf(spaceId).listen(refresh).pipe(Scope.provide(scope))).then(refresh);
    return () => void EffectEx.runPromise(Scope.close(scope, Exit.void));
  }, [client, spaceId]);
  return count;
};

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

/**
 * Configures, controls and observes a Discord back-index purely through ECHO: the remote timer trigger that runs
 * plugin-discord's `CrawlDiscordChannels` on EDGE and the `CrawlState` it keeps its progress in; the facts it extracts
 * land in the space's memory. Apply creates or updates both (`ConfigureBackIndex`); Pause / Resume flip the trigger;
 * Reset rewinds targets in the crawl state.
 */
export const PipelineDiscordModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const db = space?.db;
  const { invokePromise } = AppHooks.useOperationInvoker();
  const config = useConfig();
  const channelConfigs = useQuery(db, Filter.type(DiscordChannel.DiscordChannel));
  // A custom EDGE (a story's fake) has no Kai app of its own; the bot bound in the space reads instead.
  const kaiId =
    DiscordChannel.kaiApplicationId(config.values.runtime?.services?.edge?.url) ?? channelConfigs[0]?.applicationId;
  // A back-index is a trigger whose input names a crawl state; its input is set when it is created.
  const trigger = useQuery(db, Filter.type(Trigger.Trigger)).find((candidate) => Ref.isRef(candidate.input?.state));
  const [triggerView] = useObject(trigger);
  const input = triggerView?.input;
  const stateRef = Ref.isRef(input?.state) ? input?.state : undefined;
  const [stateSnapshot] = useObject(stateRef);
  const stateView = stateSnapshot && Obj.snapshotOf(CrawlState.CrawlState, stateSnapshot) ? stateSnapshot : undefined;
  const state = useQuery(db, Filter.type(CrawlState.CrawlState)).find(({ id }) => id === stateView?.id);
  const facts = useMemoryFactCount(space?.id);

  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Edits>({});
  const [names, setNames] = useState<Record<string, string>>({});

  const enabled = triggerView?.enabled ?? false;
  const configuredChannels: string[] = Array.isArray(input?.channels) ? input.channels : [];
  const channelOptions = useMemo(() => {
    const ids = new Set([...channelConfigs.flatMap((config) => [...config.channels]), ...configuredChannels]);
    return [...ids].map((id) => ({ value: id, label: `#${names[id] ?? id}` }));
  }, [channelConfigs, configuredChannels.join(','), names]);
  const channels =
    edits.channels ?? (configuredChannels.length > 0 ? configuredChannels : channelOptions.map(({ value }) => value));
  const maxDays = edits.maxDays ?? numberOrUndefined(input?.maxDays);
  const descendThreads = edits.descendThreads ?? input?.descendThreads ?? true;
  const maxDepth = edits.maxDepth ?? numberOrUndefined(input?.maxDepth);
  const cron =
    edits.cron ??
    (triggerView?.spec?.kind === 'timer' ? triggerView.spec.cron : DiscordOperation.DEFAULT_BACK_INDEX_CRON);

  // Channel names come from Discord through EDGE (the Kai bot's guilds); a failure only leaves ids showing.
  useEffect(() => {
    const guilds = [...new Set(channelConfigs.flatMap(({ guildId }) => (guildId ? [guildId] : [])))];
    if (!space || !kaiId || guilds.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.all(
      guilds.map((guildId) =>
        invokePromise(
          DiscordAdminOperation.ListGuildChannels,
          { applicationId: kaiId, guildId },
          { spaceId: space.id },
        ),
      ),
    ).then((listed) => {
      if (!cancelled) {
        setNames(
          Object.fromEntries(listed.flatMap(({ data }) => (data?.channels ?? []).map(({ id, name }) => [id, name]))),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [invokePromise, space, kaiId, channelConfigs]);

  // The timeline records each distinct state the crawl state passes through.
  const lastRef = useRef<string>(undefined);
  useEffect(() => {
    lastRef.current = undefined;
    timelineBuffer.clear();
  }, []);
  useEffect(() => {
    if (!stateView) {
      return;
    }
    const message = describe(stateView, enabled, facts);
    if (message !== lastRef.current) {
      lastRef.current = message;
      const level = stateView.lastRun?.error ? LogLevel.ERROR : LogLevel.INFO;
      timelineBuffer.append(new LogEntry({ level, message }));
    }
  }, [stateView, enabled, facts]);

  /** Runs one action, showing its error. */
  const run = useCallback(async (action: () => Promise<{ error?: Error } | void>) => {
    setBusy(true);
    try {
      const result = await action();
      setError(result?.error?.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    if (!space || !kaiId) {
      return;
    }
    void run(async () => {
      const result = await invokePromise(
        DiscordOperation.ConfigureBackIndex,
        {
          applicationId: kaiId,
          channels,
          descendThreads,
          cron,
          ...(maxDays !== undefined ? { maxDays } : {}),
          ...(maxDepth !== undefined ? { maxDepth } : {}),
          ...(trigger ? { trigger: Ref.make(trigger) } : { name: 'Discord back-index' }),
        },
        { spaceId: space.id },
      );
      if (!result.error) {
        setEdits({});
      }
      return result;
    });
  }, [space, kaiId, trigger, channels, descendThreads, cron, maxDays, maxDepth, invokePromise, run]);

  const handleEnabled = useCallback(
    (next: boolean) => {
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          trigger.enabled = next;
        });
      }
    },
    [trigger],
  );

  // One invocation here and now, as the trigger would run it; the trigger's schedule is untouched.
  const handleRunNow = useCallback(() => {
    if (!space || !kaiId || !state) {
      return;
    }
    void run(() =>
      invokePromise(
        DiscordOperation.CrawlDiscordChannels,
        {
          applicationId: kaiId,
          channels: configuredChannels,
          descendThreads,
          ...(maxDays !== undefined ? { maxDays } : {}),
          ...(maxDepth !== undefined ? { maxDepth } : {}),
          state: Ref.make(state),
        },
        { spaceId: space.id },
      ),
    );
  }, [space, kaiId, state, configuredChannels, descendThreads, maxDays, maxDepth, invokePromise, run]);

  const handleReset = useCallback(
    (targets?: string[]) => {
      if (state) {
        Obj.update(state, (state) => CrawlState.resetTargets(state, targets));
      }
    },
    [state],
  );

  const targets = stateView ? CrawlState.listTargets(stateView) : [];
  const runStatus: CrawlState.RunStatus = trigger && !enabled ? 'paused' : (stateView?.runStatus ?? 'idle');
  const canApply = !busy && !!kaiId && channels.length > 0;
  const targetItems = targets.map((target) => ({
    value: target.id,
    label: targetLabel(target, names),
    description: targetDetail(target),
    icon: target.threadId ? 'ph--chats-circle--regular' : 'ph--hash--regular',
  }));

  if (!space) {
    return <Status.Empty>No space.</Status.Empty>;
  }

  return (
    <Logger.Root buffer={timelineBuffer} maxLines={MAX_ENTRIES}>
      <Layout.Flex column grow>
        <Panel.Root data-testid='pipeline-discord' classNames='dx-grow'>
          <Panel.Header>
            <Toolbar.Root>
              <Toolbar.Text>Discord back-index</Toolbar.Text>
              <Tag.Tag hue={RUN_HUE[runStatus]} data-testid='crawl-run-status'>
                {runStatus}
              </Tag.Tag>
              <Toolbar.Separator />
              <Button.Root
                icon='ph--check--regular'
                label={trigger ? 'Apply' : 'Start'}
                disabled={!canApply}
                onClick={handleApply}
              />
              <Button.Root
                icon={enabled ? 'ph--pause--regular' : 'ph--play-circle--regular'}
                label={enabled ? 'Pause' : 'Resume'}
                disabled={busy || !trigger}
                onClick={() => handleEnabled(!enabled)}
              />
              <Button.Root
                icon='ph--lightning--regular'
                label='Run now'
                disabled={busy || !state || !kaiId}
                onClick={handleRunNow}
              />
              <Button.Root
                icon='ph--arrow-counter-clockwise--regular'
                label='Reset all'
                disabled={busy || !state}
                onClick={() => handleReset()}
              />
            </Toolbar.Root>
          </Panel.Header>
          <Panel.Body>
            <Form.Root variant='settings'>
              <Form.Viewport scroll>
                <Form.Content>
                  <Form.FieldSet
                    label='Configure'
                    description='A trigger runs the crawl on EDGE, reading as the Kai bot, whose token EDGE holds.'
                  >
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
                    <Form.Field label='Interval' description='How often the trigger runs a bounded slice of the crawl.'>
                      <Select.Root
                        items={INTERVALS}
                        value={[cron]}
                        onValueChange={({ value: [value] }) =>
                          value && setEdits((previous) => ({ ...previous, cron: value }))
                        }
                      >
                        <Select.Trigger placeholder='Every 2 minutes' />
                        <Select.Content>
                          {INTERVALS.map((item) => (
                            <Select.Item key={item.value} item={item} />
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Form.Field>
                  </Form.FieldSet>

                  <Form.FieldSet label='Progress'>
                    <Form.Field standalone label='Status'>
                      <Layout.Flex gap='sm' wrap>
                        <Tag.Tag hue={RUN_HUE[runStatus]}>{runStatus}</Tag.Tag>
                        <Tag.Tag hue={stateView?.lastRun?.done ? 'success' : 'neutral'}>
                          {stateView?.lastRun?.done ? 'all targets read' : 'targets left'}
                        </Tag.Tag>
                        <Tag.Tag hue={stateView?.lastRun?.errored ? 'error' : 'neutral'}>
                          {`${stateView?.lastRun?.errored ?? 0} errored`}
                        </Tag.Tag>
                      </Layout.Flex>
                    </Form.Field>
                    <Form.Field standalone label='Messages read'>
                      <Typography.Text data-testid='crawl-messages'>{stateView?.messages ?? 0}</Typography.Text>
                    </Form.Field>
                    <Form.Field standalone label="Facts in the space's memory">
                      <Typography.Text data-testid='crawl-facts'>{facts}</Typography.Text>
                    </Form.Field>
                    <Form.Field standalone label='Last run'>
                      {stateView?.lastRun ? (
                        <Typography.Timestamp date={stateView.lastRun.at} />
                      ) : (
                        <Typography.Text tone='muted'>Not yet</Typography.Text>
                      )}
                    </Form.Field>
                    {(stateView?.lastRun?.error ?? error) && (
                      <Form.Field standalone label='Last error'>
                        <Typography.Text data-testid='crawl-error'>
                          {stateView?.lastRun?.error ?? error}
                        </Typography.Text>
                      </Form.Field>
                    )}
                  </Form.FieldSet>

                  <Form.FieldSet label='Targets' description='Each channel and thread, with where the crawl resumes.'>
                    <Listbox.Root items={targetItems} selectionMode='none'>
                      <Listbox.Content aria-label='Targets' data-testid='crawl-targets'>
                        {targets.map((target, index) => (
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
                      <Listbox.Empty>Nothing to crawl yet; Start creates the back-index.</Listbox.Empty>
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
