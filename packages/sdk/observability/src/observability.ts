//
// Copyright 2025 DXOS.org
//

import { Array, Effect, pipe } from 'effect';

import { type CleanupFn, SubscriptionList } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import {
  type Attributes,
  type Errors,
  type Events,
  type Extension,
  type ExtensionApi,
  type Feedback,
  type Kind,
  type Metrics,
} from './observability-extension';

export * from './storage';

// TODO(wittjosiah): Figure out how to handle when telemetry is disabled.
//   In theory the setting should be both persisted and synchronized.
//   Initialize probably should still run for the cases where data is emitted manually (e.g., feedback).

/**
 * Provider of observability data.
 */
export type DataProvider = (observability: Observability) => Effect.Effect<CleanupFn | void>;

/**
 * Extensible observability provider.
 */
// TODO(wittjosiah): Add pipe method.
export interface Observability {
  initialize(): Effect.Effect<void>;
  close(): Effect.Effect<void>;
  enable(): Effect.Effect<void>;
  disable(): Effect.Effect<void>;
  flush(): Effect.Effect<void>;
  addDataProvider(dataProvider: DataProvider): Effect.Effect<void>;
  identify(distinctId: string, attributes?: Attributes, setOnceAttributes?: Attributes): void;
  alias(distinctId: string, previousId?: string): void;
  setTags(tags: Attributes, kind?: Kind): void;
  enabled: boolean;
  errors: Errors;
  events: Events;
  feedback: Feedback;
  metrics: Metrics;
}

class ObservabilityImpl implements Observability {
  private _initialized = false;
  private readonly _extensions: Extension[] = [];
  private readonly _dataProviders: DataProvider[] = [];
  private readonly _subscriptions = new SubscriptionList();

  initialize(): Effect.Effect<void> {
    if (this._initialized) {
      return Effect.succeed(undefined);
    }

    return Effect.gen(this, function* () {
      this._initialized = true;
      for (const extension of this._extensions) {
        if (extension.initialize) {
          yield* extension.initialize();
        }
      }

      const cleanups = yield* Effect.all(this._dataProviders.map((provider) => provider(this)));
      this._subscriptions.add(...cleanups.filter((cleanup) => cleanup !== undefined));
    });
  }

  close(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this._subscriptions.clear();
      for (const extension of this._extensions) {
        if (extension.close) {
          yield* extension.close();
        }
      }
    });
  }

  enable(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      for (const extension of this._extensions) {
        if (extension.enable) {
          yield* extension.enable();
        }
      }
    });
  }

  disable(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      for (const extension of this._extensions) {
        if (extension.disable) {
          yield* extension.disable();
        }
      }
    });
  }

  flush(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      for (const extension of this._extensions) {
        if (extension.flush) {
          yield* extension.flush();
        }
      }
    });
  }

  _addExtension(extension: Extension): void {
    invariant(!this._initialized, 'Observability is already initialized');
    this._extensions.push(extension);
  }

  _addDataProvider(dataProvider: DataProvider): void {
    invariant(!this._initialized, 'Observability is already initialized');
    this._dataProviders.push(dataProvider);
  }

  /**
   * Adds a data provider and initializes it.
   */
  addDataProvider(dataProvider: DataProvider): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this._addDataProvider(dataProvider);
      const cleanup = yield* dataProvider(this);
      if (cleanup) {
        this._subscriptions.add(cleanup);
      }
    });
  }

  identify(distinctId: string, attributes?: Attributes, setOnceAttributes?: Attributes): void {
    for (const extension of this._extensions) {
      extension.identify?.(distinctId, attributes, setOnceAttributes);
    }
  }

  alias(distinctId: string, previousId?: string): void {
    for (const extension of this._extensions) {
      extension.alias?.(distinctId, previousId);
    }
  }

  setTags(tags: Attributes, kind?: Kind): void {
    for (const extension of this._extensions) {
      if (kind && extension.apis.some((api) => api.kind !== kind)) {
        continue;
      }

      const processedTags = Object.fromEntries(
        Object.entries(tags)
          .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
          .map(([key, value]) => [key, value.toString()]),
      );
      extension.setTags?.(processedTags);
    }
  }

  get enabled(): boolean {
    return this._extensions.every((extension) => extension.enabled);
  }

  get errors(): Errors {
    return {
      captureException: (error, attributes) => {
        for (const extension of this._getExtensions('errors')) {
          extension.captureException(error, attributes);
        }
      },
    };
  }

  get events(): Events {
    return {
      captureEvent: (event, attributes) => {
        for (const extension of this._getExtensions('events')) {
          extension.captureEvent(event, attributes);
        }
      },
    };
  }

  get feedback(): Feedback {
    return {
      captureUserFeedback: (form) => {
        for (const extension of this._getExtensions('feedback')) {
          extension.captureUserFeedback(form);
        }
      },
    };
  }

  get metrics(): Metrics {
    return {
      gauge: (name, value, attributes) => {
        for (const extension of this._getExtensions('metrics')) {
          extension.gauge(name, value, attributes);
        }
      },
      increment: (name, value, attributes) => {
        for (const extension of this._getExtensions('metrics')) {
          extension.increment(name, value, attributes);
        }
      },
      distribution: (name, value, attributes) => {
        for (const extension of this._getExtensions('metrics')) {
          extension.distribution(name, value, attributes);
        }
      },
    };
  }

  private _getExtensions<T extends Kind>(kind: T): Extract<ExtensionApi, { kind: T }>[] {
    return pipe(
      this._extensions,
      Array.flatMap((extension) => extension.apis),
      Array.filter((api): api is Extract<ExtensionApi, { kind: T }> => api.kind === kind),
    );
  }
}

export const make = (): Effect.Effect<Observability> => Effect.succeed(new ObservabilityImpl());

export const addExtension = (_extension: Effect.Effect<Extension>) =>
  Effect.fn(function* (_observability: Effect.Effect<Observability>) {
    const observability = yield* _observability;
    const extension = yield* _extension;
    invariant('_addExtension' in observability && typeof observability._addExtension === 'function');
    observability._addExtension(extension);
    return observability;
  });

export const addDataProvider = (dataProvider: DataProvider) =>
  Effect.fn(function* (_observability: Effect.Effect<Observability>) {
    const observability = yield* _observability;
    invariant('_addDataProvider' in observability && typeof observability._addDataProvider === 'function');
    observability._addDataProvider(dataProvider);
    return observability;
  });
