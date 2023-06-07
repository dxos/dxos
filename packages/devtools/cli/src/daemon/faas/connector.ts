import { Client, ClientServicesProvider, PublicKey, Query, Subscription } from "@dxos/client";
import { Runtime } from "@dxos/protocols/proto/dxos/config";
import { Context } from '@dxos/context';
import { DeferredTask, scheduleTaskInterval } from "@dxos/async";
import { FunctionListEntry } from "./api";
import { log } from "@dxos/log";
import { TRIGGERS } from "./triggers";
import { createSubscription } from "@dxos/observable-object";

const SERVICES_URL = 'ws://192.168.64.1:4567';

export type Trigger = {
  id: string;

  spaceKey: string;

  function: {
    /**
     * Name of deployed function to invoke.
     */
    name: string;
  },

  subscription: {

    /**
     * Object types.
     */
    type?: string;

    /**
     * Properties to match.
     */
    props?: Record<string, any>;
    
    /**
     * List of paths for referenced objects to include.
     */
    nested?: string[];
  }
}

type MountedTrigger = {
  trigger: Trigger;
  clear: () => Promise<void>;
}

type DatabaseEvent = {
  trigger: Trigger;
  objects: string[];
}

type InvocationData = {
  event: DatabaseEvent,
  context: {

  }
}

export class FaasConnector {
  private readonly _ctx = new Context();

  private readonly _mountedTriggers: MountedTrigger[] = [];

  private readonly _client: Client;

  constructor(
    private readonly _faasConfig: Runtime.Services.Faasd,
    private readonly _clientServices: ClientServicesProvider,
  ) {
    this._client = new Client({ services: _clientServices });
  }

  async open() {
    await this._client.initialize();

    await this._remountTriggers();
  }

  async close() {
    await this._ctx.dispose();
    await this._client.destroy();
    await this._unmountTriggers();
  }

  private async _getTriggers(): Promise<Trigger[]> {
    // TODO(dmaretskyi): Fetch from echo.
    return TRIGGERS;
  }

  private async _unmountTriggers () {
    const oldTriggers = this._mountedTriggers.splice(0, this._mountedTriggers.length);

    for(const { clear, trigger } of oldTriggers) {
      await clear();
      log.info('unmounted trigger', { trigger: trigger.id });
    }
  }

  private async _remountTriggers () {
    await this._unmountTriggers();

    const triggers = await this._getTriggers();

    await Promise.all(triggers.map(async trigger => {
      await this._mountTrigger(trigger);
    }));
  }

  private async _mountTrigger(trigger: Trigger) {
    const ctx = this._ctx.derive();

    this._mountedTriggers.push({
      trigger,
      clear: async () => {
        await ctx.dispose();
      }
    });

    const space = this._client.spaces.get().find(space => space.key.equals(trigger.spaceKey));
    if(!space) {
      log.warn('space not found', { space: trigger.spaceKey });
      return;
    }

    await space.waitUntilReady();

    if(this._ctx.disposed) {
      return;
    }

    
    const updatedIds = new Set<string>();

    const invoker = new DeferredTask(ctx, async () => {
      const updatedObjects = Array.from(updatedIds)
      updatedIds.clear();

      const event: DatabaseEvent = {
        trigger: trigger,
        objects: updatedObjects,
      }
      await this._dispatch(event);
    });
    
    const selection = createSubscription(({ added, updated }) => {
      for(const object of added) {
        updatedIds.add(object.id);
      }
      for(const object of updated) {
        updatedIds.add(object.id);
      }

      invoker.schedule();
    })
    ctx.onDispose(() => selection.unsubscribe());
    
    const query = space.db.query({
      ...trigger.subscription.props,
      '@type': trigger.subscription.type,
    })
    const unsubscribe = query.subscribe(({ objects }) => {
      selection.update(objects);
    })
    ctx.onDispose(unsubscribe);

    log.info('mounted trigger', { trigger: trigger.id });
  }

  private async _dispatch(event: DatabaseEvent) {
    const installedFunctions = await this._getFunctions();

    const installedFunction = installedFunctions.find(func => func.name === event.trigger.function.name);

    if(!installedFunction) {
      log.warn('function not found', { function: event.trigger.function.name });
      return;
    }

    const data: InvocationData = {
      event,
      context: {
        clientUrl: SERVICES_URL,
      }
    }

    log.info('invoking function', { function: installedFunction.name })
    const result = await this._invokeFunction(installedFunction.name, data);
    log.info('function result', { result });
  }

  private async _invokeFunction(functionName: string, data: InvocationData) {
    const res = await fetch(`${this._faasConfig.gateway}/function/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this._faasConfig.username}:${this._faasConfig.password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const body = await res.text();

    return { body, status: res.status };
  }

  private async _getFunctions() {
    const res = await fetch(`${this._faasConfig.gateway}/system/functions`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this._faasConfig.username}:${this._faasConfig.password}`).toString('base64')}`
      }
    });
    
    const functions: FunctionListEntry[] = await res.json();

    return functions;
  }
}