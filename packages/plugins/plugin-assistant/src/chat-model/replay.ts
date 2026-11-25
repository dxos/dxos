//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import type * as Trace from '@dxos/compute/Trace';
import type * as Trajectory from '@dxos/compute/Trajectory';
import { type Message } from '@dxos/types';

import { type ChatModel } from './chat-model.ts';
import { arrangeLanes, makeLaneRowCache } from './lanes.ts';
import { type OutboxEntry } from './outbox.ts';
import { type ThreadProjection, projectThread } from './thread.ts';
import { type TrajectoryView, makeTrajectoryView, selectThread } from './trajectory-view.ts';

/**
 * A chat model over a fixed list of trajectory events, with no agent behind it: a finished run replayed one event
 * at a time (a story stepping through a feed) shows exactly what the live chat showed when that event landed.
 * Every action is a no-op.
 */
export class ReplayChatModel implements ChatModel {
  readonly streaming = Atom.make(false);
  readonly active = Atom.make(false);
  readonly messages = Atom.make<Message.Message[]>([]);
  readonly error = Atom.make<Option.Option<Error>>(Option.none());
  readonly outbox = Atom.make<readonly OutboxEntry[]>([]);
  readonly mcpErrors = Atom.make<readonly Trace.PayloadType<typeof Trace.McpServerError>[]>([]);
  readonly activity = Atom.make<Trace.PayloadType<typeof Trace.RequestPhase> | undefined>(undefined);
  readonly context = undefined;
  readonly registry = undefined;
  readonly trajectory: Atom.Atom<TrajectoryView>;
  readonly thread: Atom.Atom<ThreadProjection>;

  constructor(events: Atom.Atom<readonly Trajectory.Event[]>) {
    this.trajectory = makeTrajectoryView(events);
    // Kept for the model's life, so a row keeps its identity and the thread does not remount as the replay moves.
    const cache = makeLaneRowCache();
    this.thread = Atom.make((get) => {
      const view = selectThread(get(this.trajectory));
      const projection = projectThread({
        feedMessages: view.messages,
        discarded: view.discarded,
        laneOf: view.laneOf,
      });
      const arranged = arrangeLanes({
        messages: projection.messages,
        tail: projection.tail,
        lanes: view.lanes,
        laneOf: view.laneOf,
        delivery: projection.delivery,
        cache,
      });
      return { ...projection, ...arranged };
    });
  }

  async getTools(): Promise<Record<string, any>> {
    return {};
  }

  async getSystemPrompt(): Promise<string> {
    return '';
  }

  send(): string {
    return '';
  }

  removePrompt(): void {}

  async request(): Promise<void> {}

  async enqueue(): Promise<void> {}

  adopt(): () => void {
    return () => {};
  }

  async cancel(): Promise<void> {}

  async retry(): Promise<void> {}

  dismissMcpErrors(): void {}

  async updateName(): Promise<void> {}
}
