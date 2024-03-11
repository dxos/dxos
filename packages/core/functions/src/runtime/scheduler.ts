//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { CronJob } from 'cron';
import * as Either from 'effect/Either';

import { debounce, DeferredTask } from '@dxos/async';
import { type Client, PublicKey } from '@dxos/client';
import { type Space, TextObject } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Filter, createSubscription, type Query, subscribe } from '@dxos/echo-schema';
import { type Signal, type SignalBus, MutationSignalEmitter, SignalBusInterconnect } from '@dxos/functions-signal';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type FunctionSubscriptionEvent } from '../handler';
import {
  type FunctionDef,
  type FunctionManifest,
  FunctionResult,
  type FunctionTrigger,
  type SignalSubscription,
  type TriggerSubscription,
} from '../manifest';

type Callback = (data: FunctionSubscriptionEvent) => Promise<number>;

type SchedulerOptions = {
  endpoint?: string;
  callback?: Callback;
};

/**
 * Functions scheduler.
 */
// TODO(burdon): Create tests.
export class Scheduler {
  // Map of mounted functions.
  private readonly _mounts = new ComplexMap<
    { id: string; spaceKey: PublicKey },
    { ctx: Context; trigger: FunctionTrigger }
  >(({ id, spaceKey }) => `${spaceKey.toHex()}:${id}`);

  private readonly _signalEmitter: MutationSignalEmitter;

  constructor(
    private readonly _client: Client,
    private readonly _manifest: FunctionManifest,
    private readonly _options: SchedulerOptions = {},
    private readonly _busInterconnect = SignalBusInterconnect.global,
  ) {
    this._signalEmitter = new MutationSignalEmitter(_client, this._busInterconnect);
  }

  async start() {
    this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        await space.waitUntilReady();
        for (const trigger of this._manifest.triggers ?? []) {
          await this.mount(new Context(), space, trigger);
        }
      }
    });
    this._signalEmitter.start();
  }

  async stop() {
    this._signalEmitter.stop();
    for (const { id, spaceKey } of this._mounts.keys()) {
      await this.unmount(id, spaceKey);
    }
  }

  private async mount(ctx: Context, space: Space, trigger: FunctionTrigger) {
    const key = { id: trigger.function, spaceKey: space.key };
    const def = this._manifest.functions.find((config) => config.id === trigger.function);
    invariant(def, `Function not found: ${trigger.function}`);

    // Currently supports only one trigger declaration per function.
    const exists = this._mounts.get(key);
    if (!exists) {
      this._mounts.set(key, { ctx, trigger });
      log('mount', { space: space.key, trigger });
      if (ctx.disposed) {
        return;
      }

      // Timer.
      if (trigger.schedule) {
        this._createTimer(ctx, space, def, trigger);
      }

      // Subscription.
      for (const triggerSubscription of trigger.subscriptions ?? []) {
        this._createSubscription(ctx, space, def, triggerSubscription);
      }

      const signalBus = this._busInterconnect.createConnected(space);
      for (const signalSubscription of trigger.signals ?? []) {
        this._createSignalProcessor(ctx, space, signalBus, def, signalSubscription);
      }
    }
  }

  private async unmount(id: string, spaceKey: PublicKey) {
    const key = { id, spaceKey };
    const { ctx } = this._mounts.get(key) ?? {};
    if (ctx) {
      this._mounts.delete(key);
      await ctx.dispose();
    }
  }

  private _createTimer(ctx: Context, space: Space, def: FunctionDef, trigger: FunctionTrigger) {
    const task = new DeferredTask(ctx, async () => {
      await this._execFunction(def, {
        space: space.key,
      });
    });

    invariant(trigger.schedule);
    let last = 0;
    let run = 0;
    // https://www.npmjs.com/package/cron#constructor
    const job = CronJob.from({
      cronTime: trigger.schedule,
      runOnInit: false,
      onTick: () => {
        // TODO(burdon): Check greater than 30s (use cron-parser).
        const now = Date.now();
        const delta = last ? now - last : 0;
        last = now;

        run++;
        log.info('tick', { space: space.key.truncate(), count: run, delta });
        task.schedule();
      },
    });

    job.start();
    ctx.onDispose(() => job.stop());
  }

  private _createSubscription(ctx: Context, space: Space, def: FunctionDef, triggerSubscription: TriggerSubscription) {
    const objectIds = new Set<string>();
    const task = new DeferredTask(ctx, async () => {
      await this._execFunction(def, {
        space: space.key,
        objects: Array.from(objectIds),
      });
    });

    // TODO(burdon): Don't fire initially.
    // TODO(burdon): Standardize subscription handles.
    const subscriptions: (() => void)[] = [];
    const subscription = createSubscription(({ added, updated }) => {
      for (const object of added) {
        objectIds.add(object.id);
      }
      for (const object of updated) {
        objectIds.add(object.id);
      }

      task.schedule();
    });
    subscriptions.push(() => subscription.unsubscribe());

    // TODO(burdon): Create queue. Only allow one invocation per trigger at a time?
    // TODO(burdon): Disable trigger if keeps failing.
    const { type, props, deep, delay } = triggerSubscription;
    const update = ({ objects }: Query) => {
      subscription.update(objects);

      // TODO(burdon): Hack to monitor changes to Document's text object.
      if (deep) {
        log.info('update', { type, deep, objects: objects.length });
        for (const object of objects) {
          const content = object.content;
          if (content instanceof TextObject) {
            subscriptions.push(content[subscribe](debounce(() => subscription.update([object]), 1_000)));
          }
        }
      }
    };

    // TODO(burdon): [Bug]: all callbacks are fired on the first mutation.
    // TODO(burdon): [Bug]: not updated when document is deleted (either top or hierarchically).
    const query = space.db.query(Filter.typename(type, props));
    subscriptions.push(query.subscribe(delay ? debounce(update, delay * 1_000) : update));

    ctx.onDispose(() => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    });
  }

  private _createSignalProcessor(
    ctx: Context,
    space: Space,
    bus: SignalBus,
    def: FunctionDef,
    signalSubscription: SignalSubscription,
  ) {
    let signalToProcess: Signal | null = null;
    const task = new DeferredTask(ctx, async () => {
      if (signalToProcess == null) {
        return;
      }
      const functionResult = await this._execFunction(def, signalToProcess);
      if (functionResult != null) {
        log.info('function result', { result: functionResult });
        bus.emit({
          id: PublicKey.random().toHex(),
          kind: 'suggestion',
          metadata: {
            createdMs: Date.now(),
            source: def.id,
            spaceKey: space.key.toHex(),
            triggerSignalId: signalToProcess.id,
          },
          data: functionResult,
        });
      }
      signalToProcess = null;
    });
    const unsubscribeFromBus = bus.subscribe((signal: Signal) => {
      if (signal.kind !== 'echo-mutation') {
        log.info('received a signal', signal);
      }
      if (signalToProcess != null) {
        return;
      }
      if (signal.kind === signalSubscription.kind && signal.data.type === signalSubscription.dataType) {
        signalToProcess = signal;
        task.schedule();
      }
    });
    ctx.onDispose(unsubscribeFromBus);
  }

  private async _execFunction(def: FunctionDef, data: any): Promise<FunctionResult | null> {
    try {
      log('request', { function: def.id });
      const { endpoint, callback } = this._options;
      let status = 0;
      let functionResult: FunctionResult | null = null;
      if (endpoint) {
        // TODO(burdon): Move out of scheduler (generalize as callback).
        const response = await fetch(`${this._options.endpoint}/${def.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        functionResult = await this._parseFunctionResult(response);
        status = response.status;
      } else if (callback) {
        status = await callback(data);
      }

      log('result', { function: def.id, result: status, body: functionResult });
      return functionResult;
    } catch (err: any) {
      log.error('error', { function: def.id, error: err.message });
      return null;
    }
  }

  private async _parseFunctionResult(response: Response): Promise<FunctionResult | null> {
    try {
      // if (response.headers.get('Content-Type') !== 'application/json') {
      //   return null;
      // }
      log.info('response', { headers: JSON.stringify(response.headers) });
      const json = await response.json();
      const result = S.validateEither(FunctionResult)(json);
      if (Either.isLeft(result)) {
        log.warn('incorrectly formatted function result', { json, error: result.left });
        return null;
      }
      return result.right;
    } catch (error) {
      log.catch(error);
      return null;
    }
  }
}
