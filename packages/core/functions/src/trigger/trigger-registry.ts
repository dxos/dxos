//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, Filter, getMeta, type Space } from '@dxos/client/echo';
import { Context, Resource } from '@dxos/context';
import { compareForeignKeys, ECHO_ATTR_META, foreignKey } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, diff } from '@dxos/util';

import { createSubscriptionTrigger, createTimerTrigger, createWebhookTrigger, createWebsocketTrigger } from './type';
import { type FunctionManifest, FunctionTrigger, type FunctionTriggerType, type TriggerSpec } from '../types';

type ResponseCode = number;

export type TriggerCallback = (args: object) => Promise<ResponseCode>;

// TODO(burdon): Make object?
export type TriggerFactory<Spec extends TriggerSpec, Options = any> = (
  ctx: Context,
  space: Space,
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

  async activate(space: Space, trigger: FunctionTrigger, callback: TriggerCallback): Promise<void> {
    log('activate', { space: space.key, trigger });

    const activationCtx = new Context({ name: `FunctionTrigger-${trigger.function}` });
    this._ctx.onDispose(() => activationCtx.dispose());
    const registeredTrigger = this._triggersBySpaceKey.get(space.key)?.find((reg) => reg.trigger.id === trigger.id);
    invariant(registeredTrigger, `Trigger is not registered: ${trigger.function}`);
    registeredTrigger.activationCtx = activationCtx;

    try {
      const options = this._options?.[trigger.spec.type];
      await triggerHandlers[trigger.spec.type](activationCtx, space, trigger.spec, callback, options);
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

    // Create FK to enable syncing if none are set (NOTE: Possible collision).
    const manifestTriggers = manifest.triggers.map((trigger) => {
      let keys = trigger[ECHO_ATTR_META]?.keys;
      delete trigger[ECHO_ATTR_META];
      if (!keys?.length) {
        keys = [foreignKey('manifest', [trigger.function, trigger.spec.type].join(':'))];
      }

      return create(FunctionTrigger, trigger, { keys });
    });

    // Sync triggers.
    const { objects: existing } = await space.db.query(Filter.schema(FunctionTrigger)).run();
    const { added } = diff(existing, manifestTriggers, compareForeignKeys);

    // TODO(burdon): Update existing.
    added.forEach((trigger) => {
      space.db.add(trigger);
      log.info('added', { meta: getMeta(trigger) });
    });

    if (added.length > 0) {
      await space.db.flush();
    }
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
          space.db.query(Filter.schema(FunctionTrigger)).subscribe(async ({ objects: current }) => {
            log.info('update', { space: space.key, registered: registered.length, current: current.length });
            await this._handleRemovedTriggers(space, current, registered);
            this._handleNewTriggers(space, current, registered);
          }),
        );
      }
    });

    this._ctx.onDispose(() => spaceListSubscription.unsubscribe());
    log.info('opened');
  }

  protected override async _close(_: Context): Promise<void> {
    log.info('close...');
    this._triggersBySpaceKey.clear();
    log.info('closed');
  }

  private _handleNewTriggers(space: Space, current: FunctionTrigger[], registered: RegisteredTrigger[]) {
    const added = current.filter((candidate) => {
      return candidate.enabled && registered.find((reg) => reg.trigger.id === candidate.id) == null;
    });

    if (added.length > 0) {
      const newRegisteredTriggers: RegisteredTrigger[] = added.map((trigger) => ({ trigger }));
      registered.push(...newRegisteredTriggers);
      log.info('added', () => ({
        spaceKey: space.key,
        triggers: added.map((trigger) => trigger.function),
      }));

      this.registered.emit({ space, triggers: added });
    }
  }

  private async _handleRemovedTriggers(
    space: Space,
    current: FunctionTrigger[],
    registered: RegisteredTrigger[],
  ): Promise<void> {
    const removed: FunctionTrigger[] = [];
    for (let i = registered.length - 1; i >= 0; i--) {
      const wasRemoved =
        current.filter((trigger) => trigger.enabled).find((trigger) => trigger.id === registered[i].trigger.id) == null;
      if (wasRemoved) {
        const unregistered = registered.splice(i, 1)[0];
        await unregistered.activationCtx?.dispose();
        removed.push(unregistered.trigger);
      }
    }

    if (removed.length > 0) {
      log.info('removed', () => ({
        spaceKey: space.key,
        triggers: removed.map((trigger) => trigger.function),
      }));

      this.removed.emit({ space, triggers: removed });
    }
  }

  private _getTriggers(space: Space, predicate: (trigger: RegisteredTrigger) => boolean): FunctionTrigger[] {
    const allSpaceTriggers = this._triggersBySpaceKey.get(space.key) ?? [];
    return allSpaceTriggers.filter(predicate).map((trigger) => trigger.trigger);
  }
}
