//
// Copyright 2024 DXOS.org
//

import { type Client, PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { createSubscription, type Query, subscribe, TextObject, type TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type Signal, SignalBus } from './signal-bus';

export class MutationSignalEmitter {
  private readonly spaceSubscriptions = new ComplexMap<Space, Context>((space) => space.key.toHex());

  constructor(private readonly _client: Client) {}

  public start() {
    this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        await space.waitUntilReady();
        if (!this.spaceSubscriptions.has(space)) {
          this.spaceSubscriptions.set(space, this._createSubscription(space));
        }
      }
    });
  }

  public stop() {
    for (const [_, ctx] of this.spaceSubscriptions.entries()) {
      ctx.dispose().catch((error) => {
        log.warn('failed to dispose', { error });
      });
    }
    this.spaceSubscriptions.clear();
  }

  private _createSubscription(space: Space): Context {
    const ctx = new Context();
    const bus = new SignalBus(space);
    const subscriptions: (() => void)[] = [];
    const subscription = createSubscription(({ added, updated }) => {
      const signals: Signal[] = [added, updated]
        .flatMap((arr) => arr)
        .map((object) => ({
          id: PublicKey.random().toHex(),
          kind: 'echo-mutation',
          metadata: {
            source: 'echo',
            spaceKey: space.key.toHex(),
            created: Date.now(),
          },
          data: {
            type: (object as TypedObject).__typename ?? 'any',
            value: object,
          },
        }));
      signals.forEach(bus.emit.bind(bus));
    });
    subscriptions.push(() => subscription.unsubscribe());

    const query = space.db.query();
    subscriptions.push(
      query.subscribe(({ objects }: Query) => {
        subscription.update(objects);
        for (const object of objects) {
          const content = object.content;
          if (content instanceof TextObject) {
            subscriptions.push(content[subscribe](() => subscription.update([object])));
          }
        }
      }),
    );
    ctx.onDispose(() => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    });

    return ctx;
  }
}
