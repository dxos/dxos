//
// Copyright 2023 DXOS.org
//

import { unrefTimeout } from '@dxos/async';
import { LogLevel, type LogProcessor, getContextFromEntry, log } from '@dxos/log';
import { type LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { type Metric, type Resource } from '@dxos/protocols/proto/dxos/tracing';
import { getPrototypeSpecificInstanceId } from '@dxos/util';

import type { AddLinkOptions, TimeAware } from './api';
import { DiagnosticsManager } from './diagnostic';
import { DiagnosticsChannel } from './diagnostics-channel';
import { type BaseCounter } from './metrics';
import { RemoteMetrics } from './remote/metrics';
import { getTracingContext } from './symbols';
import type { TracingBackend } from './tracing-types';
import { WeakRef } from './weak-ref';

export type Diagnostics = {
  resources: Record<string, Resource>;
  logs: LogEntry[];
};

export type TraceResourceConstructorProps = {
  constructor: { new (...args: any[]): {} };
  instance: any;
  annotation?: symbol;
};

export class ResourceEntry {
  /**
   * Sometimes bundlers mangle class names: WebFile -> WebFile2.
   *
   * We use a heuristic to remove the suffix.
   */
  public readonly sanitizedClassName: string;

  constructor(
    public readonly data: Resource,
    public readonly instance: WeakRef<any>,
    public readonly annotation?: symbol,
  ) {
    this.sanitizedClassName = sanitizeClassName(data.className);
  }

  getMetric(name: string): Metric | undefined {
    return this.data.metrics?.find((metric) => metric.name === name);
  }
}

const MAX_RESOURCE_RECORDS = 2_000;
const MAX_LOG_RECORDS = 1_000;

const REFRESH_INTERVAL = 1_000;

const MAX_INFO_OBJECT_DEPTH = 8;

const IS_CLOUDFLARE_WORKERS = !!globalThis?.navigator?.userAgent?.includes('Cloudflare-Workers');

export class TraceProcessor {
  public readonly diagnostics = new DiagnosticsManager();
  public readonly diagnosticsChannel = new DiagnosticsChannel();
  public readonly remoteMetrics = new RemoteMetrics();

  /** Tracing backend registered by the observability package. */
  public tracingBackend?: TracingBackend;

  readonly resources = new Map<number, ResourceEntry>();
  readonly resourceInstanceIndex = new WeakMap<any, ResourceEntry>();
  readonly resourceIdList: number[] = [];

  readonly logs: LogEntry[] = [];

  private _instanceTag: string | null = null;

  constructor() {
    log.addProcessor(this._logProcessor.bind(this));

    if (!IS_CLOUDFLARE_WORKERS) {
      const refreshInterval = setInterval(this.refresh.bind(this), REFRESH_INTERVAL);
      unrefTimeout(refreshInterval);
    }

    if (DiagnosticsChannel.supported) {
      this.diagnosticsChannel.serve(this.diagnostics);
    }
    this.diagnosticsChannel.unref();
  }

  setInstanceTag(tag: string): void {
    this._instanceTag = tag;
    this.diagnostics.setInstanceTag(tag);
  }

  /** @internal */
  createTraceResource(params: TraceResourceConstructorProps): void {
    const id = this.resources.size;

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
      params.annotation,
    );

    this.resources.set(id, entry);
    this.resourceInstanceIndex.set(params.instance, entry);
    this.resourceIdList.push(id);
    if (this.resourceIdList.length > MAX_RESOURCE_RECORDS) {
      this._clearResources();
    }
  }

  // TODO(burdon): Not implemented.
  addLink(parent: any, child: any, opts: AddLinkOptions): void {}

  getDiagnostics(): Diagnostics {
    this.refresh();

    return {
      resources: Object.fromEntries(
        Array.from(this.resources.entries()).map(([id, entry]) => [
          `${entry.sanitizedClassName}#${entry.data.instanceId}`,
          entry.data,
        ]),
      ),
      logs: this.logs.filter((log) => log.level >= LogLevel.INFO),
    };
  }

  getResourceInfo(instance: any): Record<string, any> {
    const res: Record<string, any> = {};
    const tracingContext = getTracingContext(Object.getPrototypeOf(instance));
    for (const [key, { options }] of Object.entries(tracingContext.infoProperties)) {
      try {
        const value = typeof instance[key] === 'function' ? instance[key]() : instance[key];
        if (options.enum) {
          res[key] = options.enum[value];
        } else {
          res[key] = sanitizeValue(
            value,
            options.depth === undefined ? 1 : (options.depth ?? MAX_INFO_OBJECT_DEPTH),
            this,
          );
        }
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

  getResourceId(instance: any): number | null {
    const entry = this.resourceInstanceIndex.get(instance);
    return entry ? entry.data.id : null;
  }

  findResourcesByClassName(className: string): ResourceEntry[] {
    return [...this.resources.values()].filter(
      (res) => res.data.className === className || res.sanitizedClassName === className,
    );
  }

  findResourcesByAnnotation(annotation: symbol): ResourceEntry[] {
    return [...this.resources.values()].filter((res) => res.annotation === annotation);
  }

  refresh(): void {
    for (const resource of this.resources.values()) {
      const instance = resource.instance.deref();
      if (!instance) {
        continue;
      }

      const tracingContext = getTracingContext(Object.getPrototypeOf(instance));
      const time = performance.now();
      (instance as TimeAware).tick?.(time);
      for (const key of Object.keys(tracingContext.metricsProperties)) {
        (instance[key] as BaseCounter)._tick?.(time);
      }

      resource.data.info = this.getResourceInfo(instance);
      resource.data.metrics = this.getResourceMetrics(instance);
    }
  }

  private _clearResources(): void {
    while (this.resourceIdList.length > MAX_RESOURCE_RECORDS) {
      const id = this.resourceIdList.shift()!;
      this.resources.delete(id);
    }
  }

  private _pushLog(log: LogEntry): void {
    this.logs.push(log);
    if (this.logs.length > MAX_LOG_RECORDS) {
      this.logs.shift();
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
          context[key] = sanitizeValue(context[key], 0, this);
        }

        const entryToPush: LogEntry = {
          level: entry.level,
          message: entry.message ?? (entry.error ? (entry.error.message ?? String(entry.error)) : ''),
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

export const TRACE_PROCESSOR: TraceProcessor = ((globalThis as any).TRACE_PROCESSOR ??= new TraceProcessor());

const sanitizeValue = (value: any, depth: number, traceProcessor: TraceProcessor): any => {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;
    case 'object':
    case 'function':
      if (value === null) {
        return value;
      }

      {
        const resourceEntry = traceProcessor.resourceInstanceIndex.get(value);
        if (resourceEntry) {
          return `${resourceEntry.sanitizedClassName}#${resourceEntry.data.instanceId}`;
        }
      }

      if (typeof value.toJSON === 'function') {
        return sanitizeValue(value.toJSON(), depth, traceProcessor);
      }

      if (depth > 0) {
        if (isSetLike(value)) {
          return Object.fromEntries(
            Array.from(value.entries()).map((value) => sanitizeValue(value, depth - 1, traceProcessor)),
          );
        } else if (isMapLike(value)) {
          return Object.fromEntries(
            Array.from(value.entries()).map(([key, value]) => [key, sanitizeValue(value, depth - 1, traceProcessor)]),
          );
        } else if (Array.isArray(value)) {
          return value.map((item: any) => sanitizeValue(item, depth - 1, traceProcessor));
        } else if (typeof value === 'object') {
          const res: any = {};
          for (const key of Object.keys(value)) {
            res[key] = sanitizeValue(value[key], depth - 1, traceProcessor);
          }
          return res;
        }
      }

      if (typeof value.truncate === 'function') {
        return value.truncate();
      }

      return value.toString();
  }
};

export const sanitizeClassName = (className: string) => {
  let name = className.replace(/^_+/, '');
  const SANITIZE_REGEX = /[^_](\d+)$/;
  const m = name.match(SANITIZE_REGEX);
  if (m) {
    name = name.slice(0, -m[1].length);
  }
  return name;
};

const isSetLike = (value: any): value is Set<any> =>
  value instanceof Set ||
  (typeof value === 'object' && value !== null && Object.getPrototypeOf(value).constructor.name === 'ComplexSet');

const isMapLike = (value: any): value is Map<any, any> =>
  value instanceof Map ||
  (typeof value === 'object' && value !== null && Object.getPrototypeOf(value).constructor.name === 'ComplexMap');
