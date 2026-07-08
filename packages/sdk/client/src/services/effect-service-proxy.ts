//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import { Stream as DxosStream } from '@dxos/codec-protobuf';
import { DataService, QueryService } from '@dxos/protocols';
import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import * as Scope from 'effect/Scope';
import * as EffectStream from 'effect/Stream';

const AppRpcs = RpcGroup.make().merge(DataService.Rpcs).merge(QueryService.Rpcs);

export class EffectClientServicesProxy implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private _client?: any;
  private _scope?: Scope.CloseableScope;
  private _services: Partial<ClientServices> = {};

  constructor(
    private readonly _port: MessagePort,
    private readonly _runtime: Runtime.Runtime<never>,
  ) {}

  get descriptors() {
    return clientServiceBundle;
  }

  get services() {
    return this._services;
  }

  toPromise<T, R>(method: (req: T) => Effect.Effect<R, any, never>): (req: T) => Promise<R> {
    return (req: T) => Runtime.runPromise(this._runtime)(method(req));
  }

  toStream<T, R>(method: (req: T) => EffectStream.Stream<R, any, never>): (req: T) => DxosStream<R> {
    return (req: T) => new DxosStream(({ ready, next, close }) => {
      ready();
      const fiber = Runtime.runFork(this._runtime)(
        EffectStream.runForEach(method(req), (item) => Effect.sync(() => next(item))).pipe(
          Effect.match({
            onFailure: (cause) => close(new Error(Cause.pretty(cause))),
            onSuccess: () => close(),
          }),
        ),
      );
      return () => {
        Runtime.runPromise(this._runtime)(Fiber.interrupt(fiber)).catch(() => {});
      };
    });
  }

  async open(): Promise<void> {
    if (this._client) {
      return;
    }

    this._scope = Effect.runSync(Scope.make());

    const clientLayer = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
      Layer.provide(BrowserWorker.layerPlatform(() => this._port)),
    );

    this._client = await Runtime.runPromise(this._runtime)(
      RpcClient.make(AppRpcs, { disableTracing: true }).pipe(
        Effect.provide(clientLayer),
        Scope.extend(this._scope!),
      ),
    );

    this._services = {
      DataService: {
        subscribe: this.toStream(this._client.DataService.subscribe),
        updateSubscription: this.toPromise(this._client.DataService.updateSubscription as any),
        createDocument: this.toPromise(this._client.DataService.createDocument as any),
        update: this.toPromise(this._client.DataService.update as any),
        flush: this.toPromise(this._client.DataService.flush as any),
        getDocumentHeads: this.toPromise(this._client.DataService.getDocumentHeads as any),
        waitUntilHeadsReplicated: this.toPromise(this._client.DataService.waitUntilHeadsReplicated as any),
        reIndexHeads: this.toPromise(this._client.DataService.reIndexHeads as any),
        updateIndexes: this.toPromise(this._client.DataService.updateIndexes as any),
        subscribeSpaceSyncState: this.toStream(this._client.DataService.subscribeSpaceSyncState as any),
      },
      QueryService: {
        setConfig: this.toPromise(this._client.QueryService.setConfig as any),
        execQuery: this.toStream(this._client.QueryService.execQuery as any),
        reindex: this.toPromise(this._client.QueryService.reindex as any),
      },
    };
  }

  async close(): Promise<void> {
    if (!this._scope) {
      return;
    }

    await Runtime.runPromise(this._runtime)(Scope.close(this._scope, Exit.void));

    this._scope = undefined;
    this._client = undefined;
    this._services = {};
  }
}
