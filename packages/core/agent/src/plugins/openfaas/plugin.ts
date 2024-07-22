//
// Copyright 2023 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { type Space, SpaceState } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { createSubscription } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { FaasClient, type InvocationContext, type Trigger } from './client';
import { Plugin } from '../plugin';

type MountedTrigger = {
  trigger: Trigger;
  clear: () => Promise<void>;
};

/**
 * Connects to the OpenFaaS service and mounts triggers.
 * The lightweight `faasd` OpenFaaS service wraps `containerd` to spawn Docker containers for each function.
 */
export class OpenFaasPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/openfaas';

  // TODO(burdon): Factor out triggers.
  private readonly _mountedTriggers: MountedTrigger[] = [];

  private readonly _remountTask = new DeferredTask(this._ctx, async () => {
    await this._remountTriggers();
  });

  private readonly _faasClient: FaasClient;

  constructor(faasConfig: Runtime.Services.Faasd, context: InvocationContext) {
    super();

    this._faasClient = new FaasClient(faasConfig, context);
  }

  override async onOpen() {
    await this._watchTriggers();
    this._remountTask.schedule();
    this._ctx.onDispose(() => this._unmountTriggers());
  }

  private async _watchTriggers() {
    const observedSpaces = new Map<Space, Context>();

    const update = () => {
      const spaces = this.context.client.spaces.get();
      for (const space of spaces) {
        if (observedSpaces.has(space)) {
          continue;
        }
        if (space.state.get() !== SpaceState.SPACE_READY) {
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

    const sub = this.context.client.spaces.subscribe(() => {
      update();
    });
    this._ctx.onDispose(() => sub.unsubscribe());
  }

  private async _getTriggers(): Promise<Trigger[]> {
    const triggers: Trigger[] = [];

    for (const space of this.context.client.spaces.get()) {
      if (space.state.get() !== SpaceState.SPACE_READY) {
        continue;
      }

      // TODO(dmaretskyi): Fix type.
      const objects = (await space.db.query({ __type: 'dxos.function.Trigger' }).run()).objects;
      triggers.push(...objects.map((object) => object.toJSON() as Trigger));
    }

    return triggers;
  }

  private async _unmountTriggers() {
    const oldTriggers = this._mountedTriggers.splice(0, this._mountedTriggers.length);
    for (const { clear, trigger } of oldTriggers) {
      await clear();
      log('unmounted trigger', { trigger: trigger.id });
    }
  }

  private async _remountTriggers() {
    await this._unmountTriggers();

    const triggers = await this._getTriggers();
    log('discovered triggers', { triggers: triggers.length });

    await Promise.all(
      triggers.map(async (trigger) => {
        await this._mountTrigger(trigger);
      }),
    );
  }

  private async _mountTrigger(trigger: Trigger) {
    const ctx = this._ctx.derive();
    invariant(trigger.spaceKey);
    invariant(trigger.subscription);

    this._mountedTriggers.push({
      trigger,
      clear: async () => {
        await ctx.dispose();
      },
    });

    const space = this.context.client.spaces.get().find((space) => space.key.equals(trigger.spaceKey!));
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

    log('mounted trigger', { trigger: trigger.id });
  }
}
