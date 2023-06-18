//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { DeferredTask } from '@dxos/async';
import { Client, ClientServicesProvider, Space, SpaceState } from '@dxos/client';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { createSubscription } from '@dxos/observable-object';
import { Runtime } from '@dxos/protocols/proto/dxos/config';

import { Service } from '../service';
import { FaasClient, InvocationContext, Trigger } from './faas-client';

type MountedTrigger = {
  trigger: Trigger;
  clear: () => Promise<void>;
};

/**
 * Connects to the OpenFaaS service and mounts triggers.
 * The lightweight `faasd` OpenFaaS service wraps `containerd` to spawn Docker containers for each function.
 */
export class FaasConnector implements Service {
  private readonly _ctx = new Context();

  // TODO(burdon): Factor out triggers.
  private readonly _mountedTriggers: MountedTrigger[] = [];

  private readonly _remountTask = new DeferredTask(this._ctx, async () => {
    await this._remountTriggers();
  });

  private readonly _client: Client;

  private readonly _faasClient: FaasClient;

  // prettier-ignore
  constructor(
    clientServices: ClientServicesProvider,
    faasConfig: Runtime.Services.Faasd,
    context: InvocationContext,
  ) {
    this._client = new Client({ services: clientServices });
    this._faasClient = new FaasClient(faasConfig, context);
  }

  async open() {
    await this._client.initialize();
    await this._watchTriggers();
    this._remountTask.schedule();
  }

  async close() {
    await this._ctx.dispose();
    await this._client.destroy();
    await this._unmountTriggers();
  }

  private async _watchTriggers() {
    const observedSpaces = new Map<Space, Context>();

    const update = () => {
      const spaces = this._client.spaces.get();
      for (const space of spaces) {
        if (observedSpaces.has(space)) {
          continue;
        }
        if (space.state.get() !== SpaceState.READY) {
          continue;
        }

        const ctx = this._ctx.derive();
        observedSpaces.set(space, ctx);

        const subscription = createSubscription(() => {
          this._remountTask.schedule();
        });

        const query = space.db.query({ __type: 'dxos.function.Trigger' });
        const unsubscribe = query.subscribe(() => {
          subscription.update(query.objects);
        });
        subscription.update(query.objects);
        ctx.onDispose(unsubscribe);
      }

      for (const [space, ctx] of observedSpaces) {
        if (spaces.includes(space)) {
          continue;
        }
        observedSpaces.delete(space);
        void ctx.dispose();
      }
    };

    const sub = this._client.spaces.subscribe(() => {
      update();
    });
    this._ctx.onDispose(() => sub.unsubscribe());
  }

  private async _getTriggers(): Promise<Trigger[]> {
    const triggers: Trigger[] = [];

    for (const space of this._client.spaces.get()) {
      if (space.state.get() !== SpaceState.READY) {
        continue;
      }

      // TODO(dmaretskyi): Fix type.
      const objects = space.db.query({ __type: 'dxos.function.Trigger' }).objects;
      triggers.push(...objects.map((object) => object.toJSON() as Trigger));
    }

    return triggers;
  }

  private async _unmountTriggers() {
    const oldTriggers = this._mountedTriggers.splice(0, this._mountedTriggers.length);
    for (const { clear, trigger } of oldTriggers) {
      await clear();
      log.info('unmounted trigger', { trigger: trigger.id });
    }
  }

  private async _remountTriggers() {
    await this._unmountTriggers();

    const triggers = await this._getTriggers();
    log.info('discovered triggers', { triggers: triggers.length });

    await Promise.all(
      triggers.map(async (trigger) => {
        await this._mountTrigger(trigger);
      }),
    );
  }

  private async _mountTrigger(trigger: Trigger) {
    const ctx = this._ctx.derive();
    assert(trigger.spaceKey);
    assert(trigger.subscription);

    this._mountedTriggers.push({
      trigger,
      clear: async () => {
        await ctx.dispose();
      },
    });

    const space = this._client.spaces.get().find((space) => space.key.equals(trigger.spaceKey!));
    if (!space) {
      log.warn('space not found', { space: trigger.spaceKey });
      return;
    }
    await space.waitUntilReady();

    if (this._ctx.disposed) {
      return;
    }

    const updatedIds = new Set<string>();

    const task = new DeferredTask(ctx, async () => {
      const updatedObjects = Array.from(updatedIds);
      updatedIds.clear();

      await this._faasClient.dispatch({
        trigger,
        objects: updatedObjects,
      });
    });

    const selection = createSubscription(({ added, updated }) => {
      for (const object of added) {
        updatedIds.add(object.id);
      }
      for (const object of updated) {
        updatedIds.add(object.id);
      }

      task.schedule();
    });
    ctx.onDispose(() => selection.unsubscribe());

    const query = space.db.query({
      ...trigger.subscription.props,
      '@type': trigger.subscription.type,
    });

    // TODO(burdon): Trigger on subscription.
    const unsubscribe = query.subscribe(({ objects }) => {
      selection.update(objects);
    });
    selection.update(query.objects);
    ctx.onDispose(unsubscribe);

    log.info('mounted trigger', { trigger: trigger.id });
  }
}
