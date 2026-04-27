//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Database } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { ContextQueueService } from '@dxos/functions';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';
import { type Queue } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { createMessageGenerator } from './test-generator';

class RecordingQueue implements Queue<Message.Message> {
  readonly dxn = new DXN(DXN.kind.QUEUE, [SpaceId.random(), ObjectId.random()]);
  readonly #subscribers = new Set<() => void>();

  objects: Message.Message[] = [];
  isLoading = false;
  error = null;

  declare query: Queue<Message.Message>['query'];

  subscribe(callback: () => void) {
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  }

  async append(objects: Message.Message[]) {
    this.objects = [...this.objects, ...objects];
    this.#emit();
  }

  async delete(ids: string[]) {
    this.objects = this.objects.filter((object) => !ids.includes(object.id));
    this.#emit();
  }

  async sync() {}

  async queryObjects() {
    return this.objects;
  }

  async getObjectsById(ids: ObjectId[]) {
    return ids.map((id) => this.objects.find((object) => object.id === id));
  }

  async refresh() {}

  #emit() {
    for (const subscriber of this.#subscribers) {
      subscriber();
    }
  }
}

describe('createMessageGenerator', () => {
  test('streaming message publishes updates for chunk mutations', async ({ expect }) => {
    const queue = new RecordingQueue();
    let updates = 0;
    queue.subscribe(() => updates++);

    await runAndForwardErrors(
      createMessageGenerator()
        [1]!.pipe(Effect.provide(Layer.mergeAll(ContextQueueService.layer(queue), Database.notAvailable))),
    );

    expect(queue.objects).toHaveLength(1);
    expect(updates).toBeGreaterThan(1);
    expect(queue.objects[0].blocks[0]).toMatchObject({ pending: false });
  });
});
