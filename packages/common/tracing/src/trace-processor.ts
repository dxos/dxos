//
// Copyright 2023 DXOS.org
//

import { unrefTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { LogLevel, LogProcessor, getContextFromEntry, log } from '@dxos/log';
import { LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { Error as SerializedError } from '@dxos/protocols/proto/dxos/error';
import { Metric, Resource, Span } from '@dxos/protocols/proto/dxos/tracing';
import { getPrototypeSpecificInstanceId } from '@dxos/util';

import type { AddLinkOptions } from './api';
import { BaseCounter } from './metrics';
import { TRACE_SPAN_ATTRIBUTE, getTracingContext } from './symbols';
import { TraceSender } from './trace-sender';

export type TraceResourceConstructorParams = {
  constructor: { new (...args: any[]): {} };
  instance: any;
};

export type TraceSpanParams = {
  instance: any;
  methodName: string;
  parentCtx: Context | null;
  showInBrowserTimeline: boolean;
};

export class ResourceEntry {
  /**
   * Sometimes bundlers mangle class names: WebFile -> WebFile2.
   *
   * We use a heuristic to remove the suffix.
   */
  public readonly sanitizedClassName: string;

  constructor(public data: Resource, public instance: WeakRef<any>) {
    this.sanitizedClassName = sanitizeClassName(data.className);
  }

  getMetric(name: string): Metric | undefined {
    return this.data.metrics?.find((metric) => metric.name === name);
  }
}

export type TraceSubscription = {
  flush: () => void;

  dirtyResources: Set<number>;
  dirtySpans: Set<number>;
  newLogs: LogEntry[];
};

const MAX_RESOURCE_RECORDS = 500;
const MAX_SPAN_RECORDS = 1_000;
const MAX_LOG_RECORDS = 1_000;

const REFRESH_INTERVAL = 1_000;

export class TraceProcessor {
  resources = new Map<number, ResourceEntry>();
  resourceInstanceIndex = new WeakMap<any, ResourceEntry>();
  resourceIdList: number[] = [];

  spans = new Map<number, Span>();
  spanIdList: number[] = [];

  logs: LogEntry[] = [];

  subscriptions: Set<TraceSubscription> = new Set();

  constructor() {
    log.addProcessor(this._logProcessor.bind(this));

    const refreshInterval = setInterval(this.refresh.bind(this), REFRESH_INTERVAL);
    unrefTimeout(refreshInterval);
  }

  traceResourceConstructor(params: TraceResourceConstructorParams) {
    const id = this.resources.size;

    // init metrics counters.
    const tracingContext = getTracingContext(Object.getPrototypeOf(params.instance));
    for (const key of Object.keys(tracingContext.metricsProperties)) {
      (params.instance[key] as BaseCounter)._assign(params.instance, key);
    }

    const entry = new ResourceEntry(
      {
        id,
        className: params.constructor.name,
        instanceId: getPrototypeSpecificInstanceId(params.instance),
        info: this.getResourceInfo(params.instance),
        links: [],
        metrics: this.getResourceMetrics(params.instance),
      },
      new WeakRef(params.instance),
    );

    this.resources.set(id, entry);
    this.resourceInstanceIndex.set(params.instance, entry);
    this.resourceIdList.push(id);
    if (this.resourceIdList.length > MAX_RESOURCE_RECORDS) {
      this._clearResources();
    }
    this._markResourceDirty(id);
  }

  getResourceInfo(instance: any): Record<string, any> {
    const res: Record<string, any> = {};
    const tracingContext = getTracingContext(Object.getPrototypeOf(instance));

    for (const [key, _opts] of Object.entries(tracingContext.infoProperties)) {
      try {
        res[key] = sanitizeValue(typeof instance[key] === 'function' ? instance[key]() : instance[key]);
      } catch (err: any) {
        res[key] = err.message;
      }
    }

    return res;
  }

  getResourceMetrics(instance: any): Metric[] {
    const res: Metric[] = [];
    const tracingContext = getTracingContext(Object.getPrototypeOf(instance));

    for (const [key, _opts] of Object.entries(tracingContext.metricsProperties)) {
      res.push(instance[key].getData());
    }

    return res;
  }

  traceSpan(params: TraceSpanParams): TracingSpan {
    const span = new TracingSpan(this, params);
    this._flushSpan(span);
    return span;
  }

  addLink(parent: any, child: any, opts: AddLinkOptions) {}

  getResourceId(instance: any): number | null {
    const entry = this.resourceInstanceIndex.get(instance);
    return entry ? entry.data.id : null;
  }

  createTraceSender() {
    return new TraceSender(this);
  }

  refresh() {
    for (const resource of this.resources.values()) {
      const instance = resource.instance.deref();
      if (!instance) {
        continue;
      }

      const tracingContext = getTracingContext(Object.getPrototypeOf(instance));
      const time = performance.now();
      for (const key of Object.keys(tracingContext.metricsProperties)) {
        (instance[key] as BaseCounter)._tick?.(time);
      }

      let _changed = false;

      const oldInfo = resource.data.info;
      resource.data.info = this.getResourceInfo(instance);
      _changed ||= !areEqualShallow(oldInfo, resource.data.info);

      const oldMetrics = resource.data.metrics;
      resource.data.metrics = this.getResourceMetrics(instance);
      _changed ||= !areEqualShallow(oldMetrics, resource.data.metrics);

      // TODO(dmaretskyi): Test if works and enable.
      // if (changed) {
      this._markResourceDirty(resource.data.id);
      // }
    }

    for (const subscription of this.subscriptions) {
      subscription.flush();
    }
  }

  findResourcesByClassName(className: string): ResourceEntry[] {
    const res: ResourceEntry[] = [];
    for (const entry of this.resources.values()) {
      if (entry.data.className === className || entry.sanitizedClassName === className) {
        res.push(entry);
      }
    }
    return res;
  }

  /**
   * @internal
   */
  _flushSpan(runtimeSpan: TracingSpan) {
    const span = runtimeSpan.serialize();
    this.spans.set(span.id, span);
    this.spanIdList.push(span.id);
    if (this.spanIdList.length > MAX_SPAN_RECORDS) {
      this._clearSpans();
    }
    this._markSpanDirty(span.id);
  }

  private _markResourceDirty(id: number) {
    for (const subscription of this.subscriptions) {
      subscription.dirtyResources.add(id);
    }
  }

  private _markSpanDirty(id: number) {
    for (const subscription of this.subscriptions) {
      subscription.dirtySpans.add(id);
    }
  }

  private _clearResources() {
    // TODO(dmaretskyi): Use FinalizationRegistry to delete finalized resources first.
    while (this.resourceIdList.length > MAX_RESOURCE_RECORDS) {
      const id = this.resourceIdList.shift()!;
      this.resources.delete(id);
    }
  }

  private _clearSpans() {
    while (this.spanIdList.length > MAX_SPAN_RECORDS) {
      const id = this.spanIdList.shift()!;
      this.spans.delete(id);
    }
  }

  private _pushLog(log: LogEntry) {
    this.logs.push(log);
    if (this.logs.length > MAX_LOG_RECORDS) {
      this.logs.shift();
    }

    for (const subscription of this.subscriptions) {
      subscription.newLogs.push(log);
    }
  }

  private _logProcessor: LogProcessor = (config, entry) => {
    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.WARN:
      case LogLevel.TRACE: {
        const scope = entry.meta?.S;
        const resource = this.resourceInstanceIndex.get(scope);
        if (!resource) {
          return;
        }

        const context = getContextFromEntry(entry) ?? {};

        for (const key of Object.keys(context)) {
          context[key] = sanitizeValue(context[key]);
        }

        const entryToPush: LogEntry = {
          level: entry.level,
          message: entry.message,
          context,
          timestamp: new Date(),
          meta: {
            file: entry.meta?.F ?? '',
            line: entry.meta?.L ?? 0,
            resourceId: resource.data.id,
          },
        };
        this._pushLog(entryToPush);
        break;
      }
      default:
    }
  };
}

export class TracingSpan {
  static nextId = 0;

  readonly id: number;
  readonly parentId: number | null = null;
  readonly methodName: string;
  readonly resourceId: number | null = null;
  startTs: number;
  endTs: number | null = null;
  error: SerializedError | null = null;

  private _showInBrowserTimeline: boolean;
  private readonly _ctx: Context | null = null;

  constructor(private _traceProcessor: TraceProcessor, params: TraceSpanParams) {
    this.id = TracingSpan.nextId++;
    this.methodName = params.methodName;
    this.resourceId = _traceProcessor.getResourceId(params.instance);
    this.startTs = performance.now();
    this._showInBrowserTimeline = params.showInBrowserTimeline;

    if (params.parentCtx) {
      this._ctx = params.parentCtx.derive({
        attributes: {
          [TRACE_SPAN_ATTRIBUTE]: this.id,
        },
      });
      const parentId = params.parentCtx.getAttribute(TRACE_SPAN_ATTRIBUTE);
      if (typeof parentId === 'number') {
        this.parentId = parentId;
      }
    }
  }

  get ctx(): Context | null {
    return this._ctx;
  }

  markSuccess() {
    this.endTs = performance.now();
    this._traceProcessor._flushSpan(this);

    if (this._showInBrowserTimeline) {
      this._markInBrowserTimeline();
    }
  }

  markError(err: unknown) {
    this.endTs = performance.now();
    this.error = serializeError(err);
    this._traceProcessor._flushSpan(this);

    if (this._showInBrowserTimeline) {
      this._markInBrowserTimeline();
    }
  }

  serialize(): Span {
    return {
      id: this.id,
      resourceId: this.resourceId ?? undefined,
      methodName: this.methodName,
      parentId: this.parentId ?? undefined,
      startTs: this.startTs.toFixed(3),
      endTs: this.endTs?.toFixed(3) ?? undefined,
      error: this.error ?? undefined,
    };
  }

  private _markInBrowserTimeline() {
    const resource = this._traceProcessor.resources.get(this.resourceId!);
    const name = resource
      ? `${resource.sanitizedClassName}#${resource.data.instanceId}.${this.methodName}`
      : this.methodName;
    performance.measure(name, { start: this.startTs, end: this.endTs! });
  }
}

const serializeError = (err: unknown): SerializedError => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
    };
  }

  return {
    message: String(err),
  };
};

export const TRACE_PROCESSOR: TraceProcessor = ((globalThis as any).TRACE_PROCESSOR ??= new TraceProcessor());

const sanitizeValue = (value: any) => {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;
      break;
    case 'object':
    case 'function':
      if (value === null) {
        return value;
        break;
      }

      // TODO(dmaretskyi): Expose trait.
      if (typeof value.truncate === 'function') {
        return value.truncate();
      }

      return value.toString();
  }
};

const areEqualShallow = (a: any, b: any) => {
  for (const key in a) {
    if (!(key in b) || a[key] !== b[key]) {
      return false;
    }
  }
  for (const key in b) {
    if (!(key in a) || a[key] !== b[key]) {
      return false;
    }
  }
  return true;
};

export const sanitizeClassName = (className: string) => {
  const SANITIZE_REGEX = /[^_](\d+)$/;
  const m = className.match(SANITIZE_REGEX);
  if (!m) {
    return className;
  } else {
    return className.slice(0, -m[1].length);
  }
};
