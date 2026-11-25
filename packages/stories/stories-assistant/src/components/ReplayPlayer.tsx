//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space, importSpace } from '@dxos/client/echo';
import * as Agent from '@dxos/compute/Agent';
import * as Trajectory from '@dxos/compute/Trajectory';
import { DXN, Filter, Obj, type Registry, Type } from '@dxos/echo';
import { type SerializedSpace, decodeDXNFromJSON } from '@dxos/echo-client';
import { log } from '@dxos/log';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { SpacesService } from '@dxos/protocols/rpc';
import { useQuery, useRegistry, useSpaces } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Text } from '@dxos/schema';

import { type ReplayCache, runToEnd } from '../testing/index.ts';

/** Where a replay stands: which event it shows, and the steps marked to come back to. */
export type ReplayArgs = {
  /** How many events of the feed the chat shows; the whole feed when absent. */
  step?: number;
  /** Steps marked to come back to. */
  bookmarks?: number[];
};

/** Longest text preview shown beside the step counter. */
const PREVIEW_LENGTH = 60;

/** The event's tag, with its purpose or a short text preview where the payload has one. */
const describeEvent = (event: Trajectory.Event | undefined): string => {
  if (!event) {
    return 'start';
  }
  const payload = event.payload;
  switch (payload._tag) {
    case 'threadOpen':
      return payload.purpose ? `${payload._tag} · ${payload.purpose}` : payload._tag;
    case 'message': {
      const text = payload.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join(' ');
      return text.length > 0 ? `${payload._tag} · ${text.slice(0, PREVIEW_LENGTH)}` : payload._tag;
    }
    default:
      return payload._tag;
  }
};

/** A finished run and the one model that replays it. */
type Replay = {
  run: Promise<readonly Trajectory.Event[]>;
  /** The slice of the feed the chat shows, written per step. */
  shown: Atom.Writable<readonly Trajectory.Event[]>;
  chatModel: Chat.Model;
};

/**
 * Replays by chat id, held outside React since Storybook remounts the story on every arg change: the run must not start
 * again, and the model must stay the same so the thread keeps its rows.
 */
const replays = new Map<string, Replay>();

/** The operation the agent's system prompt runs, the last one to reach the registry as a story boots. */
const QUERY_SKILLS_URI = 'dxn:org.dxos.operation.assistantToolkit.querySkills';

/** Longest wait for {@link QUERY_SKILLS_URI}; past it the run starts anyway and shows whatever error follows. */
const REGISTRY_TIMEOUT = 30_000;

/** Resolves once `uri` is in the registry, or after `timeout`. */
const whenRegistered = (registry: Registry.Registry, uri: string, timeout: number): Promise<void> =>
  new Promise((resolve) => {
    if (registry.getByURI(uri)) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(finish, timeout);
    const unsubscribe = registry.changed.on(() => {
      if (registry.getByURI(uri)) {
        finish();
      }
    });
  });

/** Runs `prompts` to the end, then records the space so the next boot imports it instead of running again. */
const record = async ({
  space,
  chat,
  invoker,
  registry,
  cache,
  prompts,
}: {
  space: Space;
  chat: Agent.Session;
  invoker: Capabilities.OperationInvoker;
  registry: Registry.Registry;
  cache: ReplayCache;
  prompts: readonly string[];
}): Promise<readonly Trajectory.Event[]> => {
  // Prompting on mount races the operations' registration, which the agent needs to build its system prompt.
  await whenRegistered(registry, QUERY_SKILLS_URI, REGISTRY_TIMEOUT);
  const started = performance.now();
  const events = await runToEnd({ invoker, chat, prompts });
  const archive = await space.internal.export({ format: SpacesService.SpaceArchiveFormat.enums.JSON });
  await cache.save(new TextDecoder().decode(archive.contents));
  log.info('replay recorded', { events: events.length, ms: Math.round(performance.now() - started) });
  return events;
};

/** The objects a replayed message can show as a card; the rest of the recorded space is the run's own bookkeeping. */
const RESTORED_TYPES: ReadonlySet<string> = new Set([Type.getTypename(Markdown.Document), Type.getTypename(Text.Text)]);

const restoredTypename = (object: Obj.JSON): string | undefined => {
  const uri = decodeDXNFromJSON(object['@type']);
  return uri && DXN.isDXN(uri) ? DXN.getName(uri) : undefined;
};

/**
 * Restores a recording without running anything: the documents the messages show go into the space, and the events
 * are decoded from the recorded feed. Importing the whole archive instead runs inside client startup, whose timeout a
 * recording this size outlasts.
 */
const restore = async (space: Space, archive: SerializedSpace): Promise<readonly Trajectory.Event[]> => {
  const started = performance.now();
  await importSpace(space.db, {
    ...archive,
    objects: archive.objects.filter((object) => RESTORED_TYPES.has(restoredTypename(object) ?? '')),
  });
  // The messages address the documents by URI, which names the space the run was recorded in.
  const recorded = (archive.feeds ?? []).flatMap((feed) => feed.messages);
  const messages: unknown[] = archive.originalSpaceId
    ? JSON.parse(JSON.stringify(recorded).replaceAll(`echo://${archive.originalSpaceId}/`, `echo://${space.id}/`))
    : recorded;
  const decoded = await Promise.all(messages.map((message) => Obj.fromJSON(message)));
  const events = decoded.filter((object): object is Trajectory.Event => Obj.instanceOf(Trajectory.Event, object));
  log.info('replay restored', { events: events.length, ms: Math.round(performance.now() - started) });
  return events;
};

const getReplay = (props: Parameters<typeof record>[0] & { archive: SerializedSpace | undefined }): Replay => {
  const cached = replays.get(props.chat.id);
  if (cached) {
    return cached;
  }
  const shown = Atom.keepAlive(Atom.make<readonly Trajectory.Event[]>([]));
  const replay: Replay = {
    run: props.archive ? restore(props.space, props.archive) : record(props),
    shown,
    chatModel: new Chat.ReplayChatModel(shown),
  };
  replays.set(props.chat.id, replay);
  return replay;
};

type ReplayPlayerProps = {
  chat: Agent.Session;
  replay: Replay;
  events: readonly Trajectory.Event[];
  /** The step and bookmarks the replay opened with. */
  initial: ReplayArgs;
  /** Persists the step and bookmarks, e.g. to the URL. */
  onChange: (args: Required<ReplayArgs>) => void;
  /** Throws the recording away and records again. */
  onRerecord: () => void;
};

/** Steps through a finished feed: the chat shows what the live chat showed when the current event landed. */
const ReplayPlayer = ({ chat, replay, events, initial, onChange, onRerecord }: ReplayPlayerProps) => {
  const total = events.length;
  const [stepState, setStep] = useState(initial.step);
  const [bookmarks, setBookmarks] = useState<number[]>(initial.bookmarks ?? []);
  const step = Math.min(Math.max(stepState ?? total, 0), total);
  useEffect(() => onChange({ step, bookmarks }), [onChange, step, bookmarks]);
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  useEffect(() => registry.set(replay.shown, events.slice(0, step)), [registry, replay, events, step]);

  const goTo = useCallback((next: number) => setStep(Math.min(Math.max(next, 0), total)), [total]);
  const bookmarked = bookmarks.includes(step);
  const handleBookmark = useCallback(
    () =>
      setBookmarks(
        bookmarked
          ? bookmarks.filter((mark) => mark !== step)
          : [...bookmarks, step].sort((left, right) => left - right),
      ),
    [bookmarks, bookmarked, step],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      // Keys typed into a field belong to the field.
      if (target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT')) {
        return;
      }
      const moves: Record<string, number> = { ArrowLeft: step - 1, ArrowRight: step + 1, Home: 0, End: total };
      const next = moves[event.key];
      if (next !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        goTo(next);
      }
    };
    // Capture: the thread's feed handles the arrow keys itself and stops them before they bubble.
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [goTo, step, total]);

  return (
    <Chat.Root chat={chat} chatModel={replay.chatModel} readonly>
      <Panel.Root classNames='dx-fill'>
        <Panel.Header asChild>
          <Toolbar.Root classNames='flex-wrap'>
            <Button.Root icon='ph--skip-back--regular' label='First' iconOnly onClick={() => goTo(0)} />
            <Button.Root icon='ph--caret-left--regular' label='Previous' iconOnly onClick={() => goTo(step - 1)} />
            <Button.Root icon='ph--caret-right--regular' label='Next' iconOnly onClick={() => goTo(step + 1)} />
            <Button.Root icon='ph--skip-forward--regular' label='Last' iconOnly onClick={() => goTo(total)} />
            <Button.Root
              icon={bookmarked ? 'ph--bookmark-simple--fill' : 'ph--bookmark-simple--regular'}
              label={bookmarked ? 'Remove bookmark' : 'Bookmark step'}
              iconOnly
              onClick={handleBookmark}
            />
            <Toolbar.Text classNames='truncate text-sm' data-testid='replay.step'>
              step {step} / {total} · {describeEvent(events[step - 1])}
            </Toolbar.Text>
            {bookmarks.map((mark) => (
              <Button.Root
                key={mark}
                compact
                variant={mark === step ? 'primary' : 'ghost'}
                icon='ph--bookmark-simple--fill'
                label={String(mark)}
                onClick={() => goTo(mark)}
              />
            ))}
            <Toolbar.Separator variant='gap' />
            <Button.Root
              icon='ph--arrow-counter-clockwise--regular'
              label='Re-record'
              data-testid='replay.rerecord'
              onClick={onRerecord}
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <Chat.Content>
            <Chat.Thread />
          </Chat.Content>
        </Panel.Body>
      </Panel.Root>
    </Chat.Root>
  );
};

/** Props of {@link RecordedReplay}. */
export type RecordedReplayProps = {
  /** Where the recording is kept; the story's `importSnapshot` must load through the same cache. */
  cache: ReplayCache;
  /** Sent one after another, each to the end of its turn, when there is no recording. */
  prompts: readonly string[];
  /** The step and bookmarks the replay opened with. */
  initial: ReplayArgs;
  /** Persists the step and bookmarks, e.g. to the URL. */
  onChange: (args: Required<ReplayArgs>) => void;
};

/**
 * Replays the space's newest chat one trajectory event at a time. With nothing recorded it runs `prompts` to the end
 * first and records the space in `cache`; a later boot that imported the recording reads the events straight from the
 * chat's feed.
 */
export const RecordedReplay = ({ cache, prompts, initial, onChange }: RecordedReplayProps) => {
  const [space] = useSpaces();
  const chats = useQuery(space?.db, Filter.type(Agent.Session));
  const chat = chats.at(-1);
  const invoker = Hooks.useOperationInvoker();
  const registry = useRegistry();
  // `null` once the store answered with nothing recorded, so the run knows to record rather than wait.
  const [archive, setArchive] = useState<SerializedSpace | null>();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    let cancelled = false;
    cache.load().then(
      (loaded) => !cancelled && setArchive(loaded ?? null),
      (err: unknown) => !cancelled && setError(err instanceof Error ? err : new Error(String(err))),
    );
    return () => {
      cancelled = true;
    };
  }, [cache]);
  // The invoker, the cache and the prompts are stable for the story's life, so the replay follows the chat alone.
  const replay = useMemo(
    () =>
      space && chat && archive !== undefined
        ? getReplay({ space, chat, invoker, registry, cache, prompts, archive: archive ?? undefined })
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chat, archive],
  );
  const [events, setEvents] = useState<readonly Trajectory.Event[]>();
  useEffect(() => {
    let cancelled = false;
    replay?.run.then(
      (result) => !cancelled && setEvents(result),
      (err: unknown) => !cancelled && setError(err instanceof Error ? err : new Error(String(err))),
    );
    return () => {
      cancelled = true;
    };
  }, [replay]);

  const handleRerecord = useCallback(() => {
    void cache.clear().then(() => window.location.reload());
  }, [cache]);

  if (error) {
    return <div className='p-4 text-error-text'>{error.message}</div>;
  }
  if (!chat || !replay || !events) {
    return (
      <div className='p-4 text-description' data-testid='replay.loading'>
        {archive ? 'Loading the recording…' : 'Recording the run…'}
      </div>
    );
  }

  return (
    <ReplayPlayer
      chat={chat}
      replay={replay}
      events={events}
      initial={initial}
      onChange={onChange}
      onRerecord={handleRerecord}
    />
  );
};
