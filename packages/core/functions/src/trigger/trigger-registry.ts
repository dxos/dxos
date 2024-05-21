//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, Filter, type Space } from '@dxos/client/echo';
import { Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { createEchoSubscriptionTrigger } from './echo-trigger';
import { createTimerTrigger } from './timer-trigger';
import { createWebhookTrigger } from './webhook-trigger';
import { createWebsocketTrigger } from './websocket-trigger';
import { type FunctionManifest, FunctionTrigger, FunctionTriggerType, type TriggerSpec } from '../types';

type ResponseCode = number;

export type OnTriggerCallback = (args: object) => Promise<ResponseCode>;

export type FunctionTriggerContext = { space: Space };

export type TriggerFactory<Spec extends TriggerSpec, Options = any> = (
  ctx: Context,
  triggerContext: FunctionTriggerContext,
  spec: Spec,
  callback: OnTriggerCallback,
  options?: Options,
) => Promise<void>;

const triggerHandlers: { [type in FunctionTriggerType]: TriggerFactory<any> } = {
  [FunctionTriggerType.WEBHOOK]: createWebhookTrigger,
  [FunctionTriggerType.TIMER]: createTimerTrigger,
  [FunctionTriggerType.WEBSOCKET]: createWebsocketTrigger,
  [FunctionTriggerType.ECHO]: createEchoSubscriptionTrigger,
};

export type TriggerEvent = {
  space: Space;
  triggers: FunctionTrigger[];
};

interface RegisteredTrigger {
  trigger: FunctionTrigger;
  activationCtx?: Context;
}

export class TriggerRegistry extends Resource {
  private _triggersBySpaceKey = new ComplexMap<PublicKey, RegisteredTrigger[]>(PublicKey.hash);

  public onTriggersRegistered = new Event<TriggerEvent>();
  public onTriggersRemoved = new Event<TriggerEvent>();

  constructor(
    private readonly _client: Client,
    private readonly _options?: { [type in FunctionTriggerType]: (typeof triggerHandlers)[type] },
  ) {
    super();
  }

  public getInactiveTriggers(space: Space): FunctionTrigger[] {
    const allSpaceTriggers = this._triggersBySpaceKey.get(space.key) ?? [];
    return allSpaceTriggers.filter((t) => t.activationCtx == null).map((t) => t.trigger);
  }

  async activate(
    triggerCtx: FunctionTriggerContext,
    trigger: FunctionTrigger,
    callback: OnTriggerCallback,
  ): Promise<void> {
    log('activate', { trigger, spaceKey: triggerCtx.space.key });
    const activationCtx = new Context({ name: `trigger_${trigger.function}` });
    this._ctx.onDispose(() => activationCtx.dispose());
    const registeredTrigger = this._triggersBySpaceKey
      .get(triggerCtx.space.key)
      ?.find((reg) => reg.trigger.id === trigger.id);
    invariant(registeredTrigger, `Trigger for ${trigger.function} is not registered, triggerId: ${trigger.id}.`);
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
   * The method loads triggers from the manifest into the space.
   */
  public async register(space: Space, manifest: FunctionManifest): Promise<void> {
    if (!manifest.triggers?.length) {
      return;
    }
    if (!space.db.graph.runtimeSchemaRegistry.isSchemaRegistered(FunctionTrigger)) {
      space.db.graph.runtimeSchemaRegistry.registerSchema(FunctionTrigger);
    }
    const reactiveObjects = manifest.triggers.map((template: Omit<FunctionTrigger, 'id'>) =>
      create(FunctionTrigger, { ...template }),
    );
    reactiveObjects.forEach((obj) => space.db.add(obj));
  }

  protected override async _open(): Promise<void> {
    const spaceListSubscription = this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        if (this._triggersBySpaceKey.has(space.key)) {
          continue;
        }
        await space.waitUntilReady();
        if (this._ctx.disposed) {
          break;
        }
        const registered: RegisteredTrigger[] = [];
        this._triggersBySpaceKey.set(space.key, registered);
        const functionsSubscription = space.db.query(Filter.schema(FunctionTrigger)).subscribe(async (triggers) => {
          await this._handleRemovedTriggers(space, triggers.objects, registered);
          this._handleNewTriggers(space, triggers.objects, registered);
        });
        this._ctx.onDispose(functionsSubscription);
      }
    });
    this._ctx.onDispose(() => spaceListSubscription.unsubscribe());
  }

  private _handleNewTriggers(space: Space, allTriggers: FunctionTrigger[], registered: RegisteredTrigger[]) {
    const newTriggers = allTriggers.filter((candidate) => {
      return registered.find((reg) => reg.trigger.id === candidate.id) == null;
    });
    if (newTriggers.length > 0) {
      const newRegisteredTriggers: RegisteredTrigger[] = newTriggers.map((trigger) => ({ trigger }));
      registered.push(...newRegisteredTriggers);
      this.onTriggersRegistered.emit({ space, triggers: newTriggers });
    }
  }

  private async _handleRemovedTriggers(
    space: Space,
    allTriggers: FunctionTrigger[],
    registered: RegisteredTrigger[],
  ): Promise<void> {
    const removed: FunctionTrigger[] = [];
    for (let i = registered.length - 1; i >= 0; i--) {
      const wasRemoved = allTriggers.find((t: FunctionTrigger) => t.id === registered[i].trigger.id) == null;
      if (wasRemoved) {
        const unregistered = registered.splice(i, 1)[0];
        await unregistered.activationCtx?.dispose();
        removed.push(unregistered.trigger);
      }
    }
    if (removed.length > 0) {
      this.onTriggersRemoved.emit({ space, triggers: removed });
    }
  }

  protected override async _close(_: Context): Promise<void> {
    this._triggersBySpaceKey.clear();
  }
}
