//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { Mutex } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { type FunctionRegistry } from '../function';
import { type FunctionEventMeta } from '../handler';
import { type TriggerRegistry } from '../trigger';
import { type FunctionDef, type FunctionManifest, type FunctionTrigger } from '../types';

export type Callback = (data: any) => Promise<void | number>;

export type SchedulerOptions = {
  endpoint?: string;
  callback?: Callback;
};

/**
 * The scheduler triggers function execution based on various triggers.
 */
export class Scheduler {
  private _ctx = createContext();

  private readonly _functionUriToCallMutex = new Map<string, Mutex>();

  constructor(
    public readonly functions: FunctionRegistry,
    public readonly triggers: TriggerRegistry,
    private readonly _options: SchedulerOptions = {},
  ) {
    this.functions.registered.on(async ({ space, added }) => {
      await this._safeActivateTriggers(space, this.triggers.getInactiveTriggers(space), added);
    });
    this.triggers.registered.on(async ({ space, triggers }) => {
      await this._safeActivateTriggers(space, triggers, this.functions.getFunctions(space));
    });
  }

  async start() {
    await this._ctx.dispose();
    this._ctx = createContext();
    await this.functions.open(this._ctx);
    await this.triggers.open(this._ctx);
  }

  async stop() {
    await this._ctx.dispose();
    await this.functions.close();
    await this.triggers.close();
  }

  // TODO(burdon): Remove and update registries directly.
  public async register(space: Space, manifest: FunctionManifest) {
    await this.functions.register(space, manifest.functions);
    await this.triggers.register(space, manifest);
  }

  private async _safeActivateTriggers(
    space: Space,
    triggers: FunctionTrigger[],
    functions: FunctionDef[],
  ): Promise<void> {
    const mountTasks = triggers.map((trigger) => {
      return this.activate(space, functions, trigger);
    });
    await Promise.all(mountTasks).catch(log.catch);
  }

  private async activate(space: Space, functions: FunctionDef[], fnTrigger: FunctionTrigger) {
    const definition = functions.find((def) => def.uri === fnTrigger.function);
    if (!definition) {
      log.info('function is not found for trigger', { fnTrigger });
      return;
    }

    await this.triggers.activate(space, fnTrigger, async (args) => {
      const mutex = this._functionUriToCallMutex.get(definition.uri) ?? new Mutex();
      this._functionUriToCallMutex.set(definition.uri, mutex);

      log.info('function triggered, waiting for mutex', { uri: definition.uri });
      return mutex.executeSynchronized(() => {
        log.info('mutex acquired', { uri: definition.uri });
        return this._execFunction(definition, fnTrigger, {
          meta: fnTrigger.meta,
          data: { ...args, spaceKey: space.key },
        });
      });
    });

    log('activated trigger', { space: space.key, trigger: fnTrigger });
  }

  private async _execFunction<TData, TMeta>(
    def: FunctionDef,
    trigger: FunctionTrigger,
    { data, meta }: { data: TData; meta?: TMeta },
  ): Promise<number> {
    let status = 0;
    try {
      // TODO(burdon): Pass in Space key (common context)?
      const payload = Object.assign({}, meta && ({ meta } satisfies FunctionEventMeta<TMeta>), data);

      const { endpoint, callback } = this._options;
      if (endpoint) {
        // TODO(burdon): Move out of scheduler (generalize as callback).
        const url = path.join(endpoint, def.route);
        log.info('exec', { function: def.uri, url, triggerType: trigger.spec.type });
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        status = response.status;
      } else if (callback) {
        log.info('exec', { function: def.uri });
        status = (await callback(payload)) ?? 200;
      }

      // Check errors.
      if (status && status >= 400) {
        throw new Error(`Response: ${status}`);
      }

      // const result = await response.json();
      log.info('done', { function: def.uri, status });
    } catch (err: any) {
      log.error('error', { function: def.uri, error: err.message });
      status = 500;
    }

    return status;
  }
}

const createContext = () => new Context({ name: 'FunctionScheduler' });
