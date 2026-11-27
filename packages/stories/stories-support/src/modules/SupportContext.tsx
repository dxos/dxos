//
// Copyright 2026 DXOS.org
//

import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';
import React, {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { type Fact } from '@dxos/echo-memory';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';
import { TaskSet } from '@dxos/types';

import { EntityExtractor, Researcher, Responder } from '../contracts/index.ts';
import { CORPUS, type CorpusMessage, Generator } from '../generators/index.ts';
import { SupportPipeline } from '../pipeline/index.ts';
import { SupportCapabilities } from '../plugins/index.ts';
import { Support } from '../types/index.ts';

export type SupportContextValue = {
  readonly space: Space;
  readonly mailbox: Mailbox.Mailbox;
  readonly feed: Feed.Feed;
  readonly taskSet: TaskSet.TaskSet;
  /** Each message's progress through the pipeline, newest first. */
  readonly runs: readonly Support.MessageRun[];
  /** The facts in the space's memory. */
  readonly facts: readonly Fact.Fact[];
  /** Messages the generators have yet to send. */
  readonly remaining: number;
  /** Whether the generators are sending on their own. */
  readonly playing: boolean;
  /** Has the next generator send one message; false when none is left. */
  readonly step: () => boolean;
  readonly setPlaying: (playing: boolean) => void;
};

const SupportContext = createContext<SupportContextValue | undefined>(undefined);

export const useSupport = (): SupportContextValue | undefined => useContext(SupportContext);

export type SupportProviderProps = PropsWithChildren<{
  /** Time each pipeline stage waits before it runs, so the working row can be seen. */
  stageDelay?: Duration.Input;
  /** Time between messages while the generators are playing. */
  interval?: Duration.Input;
  corpus?: readonly CorpusMessage[];
}>;

/** The story's space, resolved as the harness resolves the one it seeds. */
const useStorySpace = (): Space | undefined => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  useEffect(() => {
    let cancelled = false;
    void EffectEx.runPromise(StoryHarness.resolveSpace(client)).then(
      (resolved) => !cancelled && setSpace(resolved),
      (error: unknown) => log.catch(error),
    );
    return () => {
      cancelled = true;
    };
  }, [client]);
  return space;
};

/** The space's memory as a list, re-read whenever the store applies a batch. */
const useFacts = (space: Space | undefined): readonly Fact.Fact[] => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const [facts, setFacts] = useState<readonly Fact.Fact[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }
    let cancelled = false;
    const read = () =>
      void EffectEx.runPromise(registry.forSpace(space.id).query({})).then(
        (found) => !cancelled && setFacts(found),
        (error: unknown) => log.catch(error),
      );
    read();
    const unsubscribe = registry.subscribe(space.id, read);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [registry, space]);
  return facts;
};

/**
 * Owns the demo's moving parts for one story: the generators, the queue they send into, and the pipeline fiber that
 * drains it with the processors the plugins contribute. The columns read what it publishes.
 */
export const SupportProvider = ({
  children,
  stageDelay = '350 millis',
  interval = '2500 millis',
  corpus = CORPUS,
}: SupportProviderProps) => {
  const space = useStorySpace();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const [taskSet] = useQuery(space?.db, Filter.type(TaskSet.TaskSet));
  const [feed, setFeed] = useState<Feed.Feed>();
  useEffect(() => {
    let cancelled = false;
    void mailbox?.feed.load().then(
      (loaded) => !cancelled && setFeed(loaded),
      (error: unknown) => log.catch(error),
    );
    return () => {
      cancelled = true;
    };
  }, [mailbox]);

  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const providers = Hooks.useCapabilities(SupportCapabilities.Processor);
  const facts = useFacts(space);
  const [runs, setRuns] = useState<readonly Support.MessageRun[]>([]);
  const [remaining, setRemaining] = useState(corpus.length);
  const [playing, setPlaying] = useState(false);

  const generators = useMemo(() => Generator.makeAll(corpus), [corpus]);
  const queue = useRef<Queue.Queue<SupportPipeline.Input>>(undefined);

  // The pipeline: one fiber for the life of the story, fed by the queue the generators send into.
  useEffect(() => {
    if (!space || !mailbox || !taskSet) {
      return;
    }
    const entities = SupportCapabilities.resolve(providers, EntityExtractor.EntityExtractor);
    const researcher = SupportCapabilities.resolve(providers, Researcher.Researcher);
    const responder = SupportCapabilities.resolve(providers, Responder.Responder);
    if (!entities || !researcher || !responder) {
      return;
    }

    const host = { db: space.db };
    const inputs = Effect.runSync(Queue.unbounded<SupportPipeline.Input>());
    queue.current = inputs;
    const fiber = Effect.runFork(
      SupportPipeline.run(Stream.fromQueue(inputs), {
        db: space.db,
        mailbox: Obj.getURI(mailbox),
        taskSet,
        processors: {
          entities: entities.provide(host),
          researcher: researcher.provide(host),
          responder: responder.provide(host),
        },
        putFacts: (found) => registry.forSpace(space.id).putFacts(found),
        onStage: (message, stage) =>
          setRuns((current) => current.map((run) => (run.message === message ? Support.withStage(run, stage) : run))),
        stageDelay,
      }),
    );
    return () => {
      queue.current = undefined;
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [space, mailbox, taskSet, providers, registry, stageDelay]);

  const step = useCallback(() => {
    const entry = Generator.next(generators)?.take();
    const inputs = queue.current;
    if (!entry || !inputs || !space || !feed) {
      return false;
    }
    const message = Generator.toMessage(entry);
    setRemaining(Generator.remaining(generators, corpus));
    setRuns((current) => [Support.makeRun(message.id, entry.subject), ...current]);
    void EffectEx.runPromise(
      Feed.append(feed, [message]).pipe(
        Effect.provide(Database.layer(space.db)),
        Effect.andThen(Queue.offer(inputs, { key: entry.key, message, recorded: entry.facts })),
      ),
    ).catch((error: unknown) => log.catch(error));
    return true;
  }, [generators, corpus, space, feed]);

  // While playing, the generators send one message every interval until none is left.
  useEffect(() => {
    if (!playing) {
      return;
    }
    const fiber = Effect.runFork(
      Effect.gen(function* () {
        while (step()) {
          yield* Effect.sleep(interval);
        }
        setPlaying(false);
      }),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [playing, step, interval]);

  const value = useMemo<SupportContextValue | undefined>(
    () =>
      space && mailbox && taskSet && feed
        ? { space, mailbox, feed, taskSet, runs, facts, remaining, playing, step, setPlaying }
        : undefined,
    [space, mailbox, taskSet, feed, runs, facts, remaining, playing, step],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
};
