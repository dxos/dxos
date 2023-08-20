import { Context } from "@dxos/context";
import { getPrototypeSpecificInstanceId } from "@dxos/util";
import { Error as SerializedError } from '@dxos/protocols/proto/dxos/error';
import type { AddLinkOptions } from "./api";
import { TRACE_SPAN_ATTRIBUTE, getTracingContext } from "./symbols";
import { Resource, Span } from "@dxos/protocols/proto/dxos/tracing";
import { TraceSender } from "./trace-sender";

export type TraceResourceConstructorParams = {
  constructor: { new(...args: any[]): {} };
  instance: any;
}

export type TraceSpanParams = {
  instance: any;
  methodName: string;
  parentCtx: Context | null
}

export type ResourceEntry = {
  data: Resource;
  instance: WeakRef<any>;
}

export type TraceSubscription = {
  dirtyResources: Set<number>
  dirtySpans: Set<number>
}


const MAX_RESOURCE_RECORDS = 500;
const MAX_SPAN_RECORDS = 1_000;

export class TraceProcessor {
  resources = new Map<number, ResourceEntry>();
  resourceInstanceIndex = new WeakMap<any, ResourceEntry>();
  resourceIdList: number[] = [];

  spans = new Map<number, Span>();
  spanIdList: number[] = [];

  subscriptions: Set<TraceSubscription> = new Set();

  constructor() { }

  traceResourceConstructor(params: TraceResourceConstructorParams) {
    const id = this.resources.size;
    const entry: ResourceEntry = {
      data: {
        id,
        className: params.constructor.name,
        instanceId: getPrototypeSpecificInstanceId(params.instance),
        info: this.getResourceInfo(params.instance),
        links: [],
      },
      instance: new WeakRef(params.instance),
    };
    this.resources.set(id, entry);
    this.resourceInstanceIndex.set(params.instance, entry);
    this.resourceIdList.push(id);
    if (this.resourceIdList.length > MAX_RESOURCE_RECORDS) {
      this._clearResources()
    }
    this._markResourceDirty(id);
  }

  getResourceInfo(instance: any): Record<string, any> {
    const res: Record<string, any> = {};
    const tracingContext = getTracingContext(Object.getPrototypeOf(instance));

    for (const [key, opts] of Object.entries(tracingContext.infoProperties)) {
      try {
        res[key] = typeof instance[key] === 'function' ? instance[key]() : instance[key];
      } catch (err: any) {
        res[key] = err.message;
      }
    }

    return res;
  }

  traceSpan(params: TraceSpanParams): TracingSpan {
    const span = new TracingSpan(this, params)
    this._flushSpan(span);
    return span;
  }

  addLink(parent: any, child: any, opts: AddLinkOptions) {

  }

  getResourceId(instance: any): number | null {
    const entry = this.resourceInstanceIndex.get(instance);
    return entry ? entry.data.id : null;
  }

  createTraceSender() {
    return new TraceSender(this);
  }

  /**
   * @internal
   */
  _flushSpan(runtimeSpan: TracingSpan) {
    const span = runtimeSpan.serialize();
    this.spans.set(span.id, span);
    this.spanIdList.push(span.id);
    if (this.spanIdList.length > MAX_SPAN_RECORDS) {
      this._clearSpans()
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

  private readonly _ctx: Context | null = null;

  constructor(private _traceProcessor: TraceProcessor, params: TraceSpanParams) {
    this.id = TracingSpan.nextId++;
    this.methodName = params.methodName;
    this.resourceId = _traceProcessor.getResourceId(params.instance);
    this.startTs = performance.now();

    if (params.parentCtx) {
      this._ctx = params.parentCtx.derive({
        attributes: {
          [TRACE_SPAN_ATTRIBUTE]: this.id,
        }
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
  }

  markError(err: unknown) {
    this.endTs = performance.now();
    this.error = serializeError(err);
    this._traceProcessor._flushSpan(this);
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
    }
  }
}

const serializeError = (err: unknown): SerializedError => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
    }
  }

  return {
    message: String(err),
  }
}

export const TRACE_PROCESSOR: TraceProcessor = (globalThis as any).TRACE_PROCESSOR ??= new TraceProcessor();