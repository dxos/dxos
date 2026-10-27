//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as ProjectMailboxOperation from '@dxos/plugin-projects/ProjectMailboxOperation';
import { TriageModel } from '@dxos/plugin-projects/testing';
import { useSpaces } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { GENERAL_CHANNEL, TRIAGE_SCRIPT, toMessage } from '../testing/discord-general.ts';

/** Name of the feed the story seeds as the synced Discord channel. */
export const CHANNEL_FEED_NAME = 'discord #general';

export type ChannelTriageModuleProps = {
  /** Pause between posts, so each arrival and its triage can be watched. */
  paceMs?: number;
  /** Scripted model latency per message. */
  thinkMs?: number;
};

type Row = {
  name: string;
  created: string;
  text: string;
  status: 'triaging' | 'done';
  replies?: number;
  tasks?: number;
};

/**
 * Replays recorded Discord #general messages into the channel feed one at a time and triages the feed
 * after each, the way a feed trigger would: the project beside it gains a "Reply to" task per question
 * and a task per piece of work, while greetings and chatter file nothing.
 */
export const ChannelTriageModule = ({ data }: { data?: ChannelTriageModuleProps }) => {
  const { paceMs = 1_500, thinkMs = 900 } = data ?? {};
  const [space] = useSpaces();
  const [project] = useQuery(space?.db, Filter.type(Project.Project));
  const feeds = useQuery(space?.db, Filter.type(Feed.Feed));
  const feed = feeds.find((candidate) => candidate.name === CHANNEL_FEED_NAME);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  // The registered handler, so the story exercises the plugin's wiring; the story supplies the model.
  const triage = Hooks.useOperationHandler(ProjectMailboxOperation.TriageMessages);
  const fiberRef = useRef<Fiber.Fiber<void, unknown> | undefined>(undefined);

  useEffect(() => () => void (fiberRef.current && Effect.runFork(Fiber.interrupt(fiberRef.current))), []);

  const handlePlay = useCallback(() => {
    if (!space || !project || !feed || running) {
      return;
    }
    const services = Layer.mergeAll(Database.layer(space.db), TriageModel.layer(TRIAGE_SCRIPT, { delayMs: thinkMs }));
    const play = Effect.gen(function* () {
      for (const entry of GENERAL_CHANNEL) {
        setRows((previous) => [...previous, { ...entry, status: 'triaging' }]);
        yield* Feed.append(feed, [toMessage(entry)]);
        const result = yield* triage({ project: Ref.make(project), feed: Ref.make(feed) });
        setRows((previous) =>
          previous.map((row) =>
            row.created === entry.created
              ? { ...row, status: 'done', replies: result.replies, tasks: result.tasks }
              : row,
          ),
        );
        yield* Effect.sleep(paceMs);
      }
    }).pipe(Effect.provide(services), Effect.ensuring(Effect.sync(() => setRunning(false))));
    setRunning(true);
    setRows([]);
    fiberRef.current = Effect.runFork(play);
  }, [space, project, feed, running, paceMs, thinkMs, triage]);

  const replies = rows.reduce((total, row) => total + (row.replies ?? 0), 0);
  const tasks = rows.reduce((total, row) => total + (row.tasks ?? 0), 0);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>#general · DXOS Discord</Toolbar.Text>
          <Toolbar.Separator />
          <Button.Root
            data-testid='channel-triage.play'
            icon={running ? 'ph--spinner-gap--regular' : 'ph--play--regular'}
            label='Replay channel'
            disabled={!project || !feed || running}
            onClick={handlePlay}
          />
          <Toolbar.Text classNames='text-fg-muted' data-testid='channel-triage.totals'>
            {plural(replies, 'reply', 'replies')} drafted · {plural(tasks, 'task', 'tasks')}
          </Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col gap-3 p-3 text-sm overflow-auto'>
        {rows.length === 0 && (
          <p className='text-fg-muted'>
            Recorded messages from the DXOS Discord. Each one is triaged as it arrives: questions get a drafted reply to
            review, and work becomes a task in the project.
          </p>
        )}
        <ul className='flex flex-col gap-3' data-testid='channel-triage.messages'>
          {rows.map((row, index) => (
            <li key={row.created} className='flex flex-col gap-1' data-testid={`channel-triage.message-${index}`}>
              <div className='flex items-baseline gap-2'>
                <span className='font-medium'>{row.name}</span>
                <span className='text-xs text-fg-muted'>{row.created.slice(0, 10)}</span>
              </div>
              <p className='whitespace-pre-wrap'>{row.text}</p>
              <Outcome row={row} />
            </li>
          ))}
        </ul>
      </Panel.Body>
    </Panel.Root>
  );
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const Outcome = ({ row }: { row: Row }) => {
  if (row.status === 'triaging') {
    return <span className='text-xs text-accent-text'>Triaging…</span>;
  }
  const parts = [
    row.replies ? 'Reply drafted' : undefined,
    row.tasks ? plural(row.tasks, 'task', 'tasks') : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? (
    <span className='text-xs text-success-text'>{parts.join(' · ')}</span>
  ) : (
    <span className='text-xs text-fg-muted'>No action</span>
  );
};
