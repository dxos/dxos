//
// Copyright 2023 DXOS.org
//

import { Context, LifecycleState, Resource, TRACE_SPAN_ATTRIBUTE } from '@dxos/context';
import { type MaybePromise } from '@dxos/util';

import { getTracingContext } from './symbols';
import { TRACE_PROCESSOR, sanitizeClassName } from './trace-processor';
import type { RemoteSpan } from './tracing-types';

const LIFECYCLE_SPAN = Symbol('dxos.tracing.lifecycle-span');

/**
 * Reads `@trace.info({ spanAttribute: true })` properties from the instance
 * and writes them into the span attributes map.
 */
const collectSpanAttributes = (instance: any, spanAttributes: Record<string, any>) => {
  const proto = Object.getPrototypeOf(instance);
  if (!proto) {
    return;
  }
  const tracingContext = getTracingContext(proto);
  for (const [key, { options }] of Object.entries(tracingContext.infoProperties)) {
    if (!options.spanAttribute) {
      continue;
    }
    try {
      const value = typeof instance[key] === 'function' ? instance[key]() : instance[key];
      if (value != null) {
        const resolved = options.enum ? options.enum[value] : String(value);
        spanAttributes[`ctx.${key}`] = resolved;
      }
    } catch {
      // Skip properties that throw (e.g. uninitialized).
    }
  }
};

export type ResourceOptions = {
  annotation?: symbol;
  /**
   * Start a lifecycle span on `open()` and end it on `close()`.
   * `this._ctx` carries the lifecycle span's trace context, so background work
   * (subscriptions, timers) becomes children of the lifecycle span.
   * Direct calls within `_open` use the `_open` span's context as usual.
   * Requires the class to extend {@link Resource}.
   */
  lifecycle?: boolean;
};

/**
 * Annotates a class as a tracked resource.
 */
const resource =
  (options?: ResourceOptions) =>
  <T extends { new (...args: any[]): {} }>(constructor: T) => {
    if (options?.lifecycle && !(constructor.prototype instanceof Resource)) {
      throw new Error(`@trace.resource({ lifecycle: true }) requires ${constructor.name} to extend Resource`);
    }

    const klass = (() =>
      class extends constructor {
        constructor(...rest: any[]) {
          super(...rest);
          TRACE_PROCESSOR.createTraceResource({ constructor, annotation: options?.annotation, instance: this });
        }
      })();

    if (options?.lifecycle) {
      const sanitizedName = sanitizeClassName(constructor.name);
      const proto = klass.prototype as any;
      const originalOpen = proto.open;
      const originalClose = proto.close;

      proto.open = async function (ctx?: Context): Promise<any> {
        const self = this as any;

        if (self._lifecycleState !== LifecycleState.CLOSED) {
          return originalOpen.call(this, ctx);
        }

        const parentSpanContext = ctx?.getAttribute(TRACE_SPAN_ATTRIBUTE);
        const resourceEntry = TRACE_PROCESSOR.resourceInstanceIndex.get(this);
        const spanAttributes: Record<string, any> = {};
        if (resourceEntry) {
          spanAttributes.entryPoint = resourceEntry.sanitizedClassName;
        }

        const remoteSpan = TRACE_PROCESSOR.tracingBackend?.startSpan({
          name: `${sanitizedName}.lifecycle`,
          op: 'lifecycle',
          attributes: spanAttributes,
          parentContext: parentSpanContext,
        });
        self[LIFECYCLE_SPAN] = remoteSpan;

        let openCtx = ctx;
        if (remoteSpan?.spanContext != null) {
          const traceAttrs = { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext };
          openCtx = ctx ? ctx.derive({ attributes: traceAttrs }) : new Context({ attributes: traceAttrs });
        }

        try {
          return await originalOpen.call(this, openCtx);
        } catch (err) {
          remoteSpan?.setError?.(err);
          remoteSpan?.end();
          self[LIFECYCLE_SPAN] = undefined;
          throw err;
        }
      };

      proto.close = async function (ctx?: Context): Promise<any> {
        const self = this as any;
        const remoteSpan: RemoteSpan | undefined = self[LIFECYCLE_SPAN];
        try {
          return await originalClose.call(this, ctx);
        } catch (err) {
          remoteSpan?.setError?.(err);
          throw err;
        } finally {
          if (remoteSpan) {
            remoteSpan.end();
            self[LIFECYCLE_SPAN] = undefined;
          }
        }
      };
    }

    Object.defineProperty(klass, 'name', { value: constructor.name });
    return klass;
  };

export interface TimeAware {
  tick(timeMs: number): void;
}

export type InfoOptions = {
  /**
   * Value is of enum type and should be converted to string.
   *
   * Example:
   *
   * ```ts
   * @trace.info({ enum: SpaceState })
   * get state(): SpaceState { ... }
   * ```
   */
  enum?: Record<string, any>;

  /**
   * Max depth of the object to be included in the resource info section.
   *
   * null means no limit (a limit of 8 nested objects is still imposed).
   *
   * Default: 0 - objects will be stringified with toString.
   */
  depth?: number | null;

  /** When true, the property value is also set as an OTEL span attribute on every span created by this resource. */
  spanAttribute?: boolean;
};

/**
 * Marks a property or a method to be included in the resource info section.
 */
const info =
  (opts: InfoOptions = {}) =>
  (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
    getTracingContext(target).infoProperties[propertyKey] = { options: opts };
  };

const mark = (name: string) => {
  performance.mark(name);
};

export type SpanOptions = {
  showInBrowserTimeline?: boolean;
  /** When false the span is not exported to remote OTLP collectors. Defaults to true. */
  showInRemoteTracing?: boolean;
  op?: string;
  attributes?: Record<string, any>;
};

/**
 * Decorator that creates a span for the execution duration of the decorated method.
 * Calls the TracingBackend directly; no custom TracingSpan objects.
 */
const span =
  ({ showInBrowserTimeline = false, showInRemoteTracing = true, op, attributes }: SpanOptions = {}) =>
  (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any) {
      const parentCtx = args[0] instanceof Context ? args[0] : null;
      const startTs = performance.now();

      const parentSpanContext = parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);

      const resourceEntry = TRACE_PROCESSOR.resourceInstanceIndex.get(this);
      const className = resourceEntry?.sanitizedClassName ?? sanitizeClassName(target.constructor?.name ?? 'unknown');
      const spanName = `${className}.${propertyKey}`;

      const spanAttributes: Record<string, any> = {};
      if (resourceEntry) {
        spanAttributes.entryPoint = resourceEntry.sanitizedClassName;
      }
      collectSpanAttributes(this, spanAttributes);
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          spanAttributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
        }
      }

      const remoteSpan = showInRemoteTracing
        ? TRACE_PROCESSOR.tracingBackend?.startSpan({
            name: spanName,
            op: op ?? 'function',
            attributes: spanAttributes,
            parentContext: parentSpanContext,
          })
        : undefined;

      let callArgs = args;
      if (parentCtx) {
        const childCtx =
          remoteSpan?.spanContext != null
            ? parentCtx.derive({ attributes: { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext } })
            : parentCtx.derive();
        callArgs = [childCtx, ...args.slice(1)];
      }

      try {
        return await method.apply(this, callArgs);
      } catch (err) {
        remoteSpan?.setError?.(err);
        throw err;
      } finally {
        remoteSpan?.end();
        if (showInBrowserTimeline && typeof globalThis?.performance?.measure === 'function') {
          performance.measure(spanName, { start: startTs, end: performance.now() });
        }
      }
    };
  };

const manualSpans = new Map<string, RemoteSpan>();
const manualSpanTimestamps = new Map<string, { name: string; startTs: number }>();

export type ManualSpanParams = {
  id: string;
  instance: any;
  methodName: string;
  parentCtx: Context | null;
  showInBrowserTimeline?: boolean;
  showInRemoteTracing?: boolean;
  op?: string;
  attributes?: Record<string, any>;
};

/**
 * Creates a span that must be ended manually.
 */
const spanStart = (params: ManualSpanParams) => {
  if (manualSpans.has(params.id) || manualSpanTimestamps.has(params.id)) {
    return;
  }

  const resourceEntry = TRACE_PROCESSOR.resourceInstanceIndex.get(params.instance);
  const className = resourceEntry?.sanitizedClassName ?? 'unknown';
  const spanName = `${className}.${params.methodName}`;

  if (params.showInBrowserTimeline) {
    manualSpanTimestamps.set(params.id, { name: spanName, startTs: performance.now() });
  }

  if (params.showInRemoteTracing === false || !TRACE_PROCESSOR.tracingBackend) {
    return;
  }

  const parentSpanContext = params.parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);

  const spanAttributes: Record<string, any> = {};
  if (resourceEntry) {
    spanAttributes.entryPoint = resourceEntry.sanitizedClassName;
  }
  collectSpanAttributes(params.instance, spanAttributes);
  if (params.attributes) {
    for (const [key, value] of Object.entries(params.attributes)) {
      spanAttributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
    }
  }

  const remoteSpan = TRACE_PROCESSOR.tracingBackend.startSpan({
    name: spanName,
    op: params.op ?? 'function',
    attributes: spanAttributes,
    parentContext: parentSpanContext,
  });
  manualSpans.set(params.id, remoteSpan);
};

/**
 * Ends a span that was started manually.
 */
const spanEnd = (id: string) => {
  const remoteSpan = manualSpans.get(id);
  if (remoteSpan) {
    remoteSpan.end();
    manualSpans.delete(id);
  }

  const timestamps = manualSpanTimestamps.get(id);
  if (timestamps && typeof globalThis?.performance?.measure === 'function') {
    performance.measure(timestamps.name, { start: timestamps.startTs, end: performance.now() });
    manualSpanTimestamps.delete(id);
  }
};

/**
 * Attaches metrics counter to the resource.
 */
const metricsCounter = () => (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
  getTracingContext(target).metricsProperties[propertyKey] = {};
};

export type AddLinkOptions = {};

const addLink = (parent: any, child: any, opts: AddLinkOptions = {}) => {
  TRACE_PROCESSOR.addLink(parent, child, opts);
};

export type TraceDiagnosticProps<T> = {
  /** Unique ID. */
  id: string;

  /**
   * Human-readable name.
   * @defaults Defaults to `id`
   */
  name?: string;

  /** Function that will be called to fetch the diagnostic data. */
  fetch: () => MaybePromise<T>;
};

export interface TraceDiagnostic {
  id: string;
  unregister(): void;
}

/**
 * Register a diagnostic that could be queried.
 */
const diagnostic = <T>(params: TraceDiagnosticProps<T>): TraceDiagnostic => {
  return TRACE_PROCESSOR.diagnostics.registerDiagnostic(params);
};

export const trace = {
  addLink,
  diagnostic,
  info,
  mark,
  metricsCounter,
  resource,
  span,
  spanStart,
  spanEnd,
  metrics: TRACE_PROCESSOR.remoteMetrics,
};
