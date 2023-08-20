import { Context } from "@dxos/context";
import type { AddLinkOptions } from "./api";
import { Resource, Span, TraceError } from "./model";
import { TRACE_SPAN_ATTRIBUTE, getTracingContext } from "./symbols";
import { defaultMap, getPrototypeSpecificInstanceId } from "@dxos/util";

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
  instance: any;
}

export class TraceProcessor {
  private _resources = new Map<number, ResourceEntry>();
  private _spans = new Map<number, Span>();
  private _resourceInstanceIndex = new WeakMap<any, ResourceEntry>();

  constructor() {

  }

  get resources(): Resource[] {
    return Array.from(this._resources.values()).map(entry => entry.data);
  }

  get spans(): Span[] {
    return Array.from(this._spans.values()).map(span => span);
  }

  traceResourceConstructor(params: TraceResourceConstructorParams) {
    const id = this._resources.size;
    const entry: ResourceEntry = {
      data: {
        id,
        className: params.constructor.name,
        instanceId: getPrototypeSpecificInstanceId(params.instance),
        info: this.getResourceInfo(params.instance),
        links: [],
      },
      instance: params.instance,
    };
    this._resources.set(id, entry);
    this._resourceInstanceIndex.set(params.instance, entry);
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
    const entry = this._resourceInstanceIndex.get(instance);
    return entry ? entry.data.id : null;
  }

  /**
   * @internal
   */
  _flushSpan(runtimeSpan: TracingSpan) {
    const span = runtimeSpan.serialize();
    this._spans.set(span.id, span);
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
  error: TraceError | null = null;

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
      resourceId: this.resourceId,
      methodName: this.methodName,
      parentId: this.parentId,
      startTs: this.startTs,
      endTs: this.endTs,
      error: this.error,
    }
  }
}

const serializeError = (err: unknown): TraceError => {
  if (err instanceof Error) {
    return {
      message: err.message,
    }
  }

  return {
    message: String(err),
  }
}

export const TRACE_PROCESSOR: TraceProcessor = (globalThis as any).TRACE_PROCESSOR ??= new TraceProcessor();