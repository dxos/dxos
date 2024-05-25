//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, Filter, getMeta, type Space } from '@dxos/client/echo';
import { Context, Resource } from '@dxos/context';
import { ECHO_ATTR_META, foreignKey, foreignKeyEquals, splitMeta } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, diff, intersection } from '@dxos/util';

import { createSubscriptionTrigger, createTimerTrigger, createWebhookTrigger, createWebsocketTrigger } from './type';
import { type FunctionManifest, FunctionTrigger, type FunctionTriggerType, type TriggerSpec } from '../types';

type ResponseCode = number;

export type TriggerCallback = (args: object) => Promise<ResponseCode>;

export type TriggerContext = { space: Space };

// TODO(burdon): Make object?
export type TriggerFactory<Spec extends TriggerSpec, Options = any> = (
  ctx: Context,
  context: TriggerContext,
  spec: Spec,
  callback: TriggerCallback,
  options?: Options,
) => Promise<void>;

export type TriggerHandlerMap = { [type in FunctionTriggerType]: TriggerFactory<any> };

const triggerHandlers: TriggerHandlerMap = {
  subscription: createSubscriptionTrigger,
  timer: createTimerTrigger,
  webhook: createWebhookTrigger,
  websocket: createWebsocketTrigger,
};

export type TriggerEvent = {
  space: Space;
  triggers: FunctionTrigger[];
};

type RegisteredTrigger = {
  activationCtx?: Context;
  trigger: FunctionTrigger;
};

export class TriggerRegistry extends Resource {
  private readonly _triggersBySpaceKey = new ComplexMap<PublicKey, RegisteredTrigger[]>(PublicKey.hash);

  public readonly registered = new Event<TriggerEvent>();
  public readonly removed = new Event<TriggerEvent>();

  constructor(
    private readonly _client: Client,
    private readonly _options?: TriggerHandlerMap,
  ) {
    super();
  }

  public getActiveTriggers(space: Space): FunctionTrigger[] {
    return this._getTriggers(space, (t) => t.activationCtx != null);
  }

  public getInactiveTriggers(space: Space): FunctionTrigger[] {
    return this._getTriggers(space, (t) => t.activationCtx == null);
  }

  async activate(triggerCtx: TriggerContext, trigger: FunctionTrigger, callback: TriggerCallback): Promise<void> {
    log('activate', { space: triggerCtx.space.key, trigger });
    const activationCtx = new Context({ name: `trigger_${trigger.function}` });
    this._ctx.onDispose(() => activationCtx.dispose());
    const registeredTrigger = this._triggersBySpaceKey
      .get(triggerCtx.space.key)
      ?.find((reg) => reg.trigger.id === trigger.id);
    invariant(registeredTrigger, `Trigger is not registered: ${trigger.function}`);
    registeredTrigger.activationCtx = activationCtx;

    try {
      const options = this._options?.[trigger.spec.type];
      await triggerHandlers[trigger.spec.type](activationCtx, triggerCtx, trigger.spec, callback, options);
    } catch (err) {
      delete registeredTrigger.activationCtx;
      throw err;
    }
  }

  /**
   * Loads triggers from the manifest into the space.
   */
  public async register(space: Space, manifest: FunctionManifest): Promise<void> {
    log('register', { space: space.key });
    if (!manifest.triggers?.length) {
      return;
    }
    if (!space.db.graph.runtimeSchemaRegistry.hasSchema(FunctionTrigger)) {
      space.db.graph.runtimeSchemaRegistry.registerSchema(FunctionTrigger);
    }

    // Sync triggers.
    const { objects: existing } = await space.db.query(Filter.schema(FunctionTrigger)).run();
    const { added } = diff(existing, manifest.triggers, (a, b) => {
      // Create FK to enable syncing if none are set.
      // TODO(burdon): Warn if not unique.
      const keys = b[ECHO_ATTR_META]?.keys ?? [foreignKey('manifest', [b.function, b.spec.type].join('-'))];
      return intersection(getMeta(a)?.keys ?? [], keys, foreignKeyEquals).length > 0;
    });

    // TODO(burdon): Update existing.
    added.forEach((trigger) => {
      const { meta, object } = splitMeta(trigger);
      space.db.add(create(FunctionTrigger, object, meta));
    });
  }

  protected override async _open(): Promise<void> {
    log.info('open...');
    const spaceListSubscription = this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        if (this._triggersBySpaceKey.has(space.key)) {
          continue;
        }

        const registered: RegisteredTrigger[] = [];
        this._triggersBySpaceKey.set(space.key, registered);
        await space.waitUntilReady();
        if (this._ctx.disposed) {
          break;
        }

        // Subscribe to updates.
        this._ctx.onDispose(
          space.db.query(Filter.schema(FunctionTrigger)).subscribe(async (triggers) => {
            log.info('update', { space: space.key, triggers: triggers.objects.length });
            await this._handleRemovedTriggers(space, triggers.objects, registered);
            this._handleNewTriggers(space, triggers.objects, registered);
          }),
        );
      }
    });

    this._ctx.onDispose(() => spaceListSubscription.unsubscribe());
  }

  protected override async _close(_: Context): Promise<void> {
    log.info('close...');
    this._triggersBySpaceKey.clear();
  }

  private _handleNewTriggers(space: Space, allTriggers: FunctionTrigger[], registered: RegisteredTrigger[]) {
    const newTriggers = allTriggers.filter((candidate) => {
      return registered.find((reg) => reg.trigger.id === candidate.id) == null;
    });

    if (newTriggers.length > 0) {
      const newRegisteredTriggers: RegisteredTrigger[] = newTriggers.map((trigger) => ({ trigger }));
      registered.push(...newRegisteredTriggers);
      log.info('added', () => ({
        spaceKey: space.key,
        triggers: newTriggers.map((trigger) => trigger.function),
      }));
      this.registered.emit({ space, triggers: newTriggers });
    }
  }

  private async _handleRemovedTriggers(
    space: Space,
    allTriggers: FunctionTrigger[],
    registered: RegisteredTrigger[],
  ): Promise<void> {
    const removed: FunctionTrigger[] = [];
    for (let i = registered.length - 1; i >= 0; i--) {
      const wasRemoved =
        allTriggers.find((trigger: FunctionTrigger) => trigger.id === registered[i].trigger.id) == null;
      if (wasRemoved) {
        if (removed.length) {
          log.info('removed', () => ({
            spaceKey: space.key,
            triggers: removed.map((trigger) => trigger.function),
          }));
        }
        const unregistered = registered.splice(i, 1)[0];
        await unregistered.activationCtx?.dispose();
        removed.push(unregistered.trigger);
      }
    }

    if (removed.length > 0) {
      this.removed.emit({ space, triggers: removed });
    }
  }

  private _getTriggers(space: Space, predicate: (trigger: RegisteredTrigger) => boolean): FunctionTrigger[] {
    const allSpaceTriggers = this._triggersBySpaceKey.get(space.key) ?? [];
    return allSpaceTriggers.filter(predicate).map((trigger) => trigger.trigger);
  }
}
