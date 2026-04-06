//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';
import { type MaybePromise } from '@dxos/util';

import { TRACE_SPAN_ATTRIBUTE, getTracingContext } from './symbols';
import { TRACE_PROCESSOR, sanitizeClassName } from './trace-processor';
import type { RemoteSpan } from './tracing-types';

/**
 * Annotates a class as a tracked resource.
 */
const resource =
  (options?: { annotation?: symbol }) =>
  <T extends { new (...args: any[]): {} }>(constructor: T) => {
    const klass = (() =>
      class extends constructor {
        constructor(...rest: any[]) {
          super(...rest);
          TRACE_PROCESSOR.createTraceResource({ constructor, annotation: options?.annotation, instance: this });
        }
      })();
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

      const childCtx =
        remoteSpan?.spanContext != null
          ? (parentCtx ?? new Context()).derive({ attributes: { [TRACE_SPAN_ATTRIBUTE]: remoteSpan.spanContext } })
          : (parentCtx ?? new Context()).derive();

      const callArgs = parentCtx ? [childCtx, ...args.slice(1)] : args;

      try {
        return await method.apply(this, callArgs);
      } catch (err) {
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
  if (manualSpans.has(params.id)) {
    return;
  }

  if (params.showInRemoteTracing === false || !TRACE_PROCESSOR.tracingBackend) {
    return;
  }

  const parentSpanContext = params.parentCtx?.getAttribute(TRACE_SPAN_ATTRIBUTE);
  const resourceEntry = TRACE_PROCESSOR.resourceInstanceIndex.get(params.instance);
  const className = resourceEntry?.sanitizedClassName ?? 'unknown';

  const spanAttributes: Record<string, any> = {};
  if (resourceEntry) {
    spanAttributes.entryPoint = resourceEntry.sanitizedClassName;
  }
  if (params.attributes) {
    for (const [key, value] of Object.entries(params.attributes)) {
      spanAttributes[key.startsWith('ctx.') ? key : `ctx.${key}`] = value;
    }
  }

  const remoteSpan = TRACE_PROCESSOR.tracingBackend.startSpan({
    name: `${className}.${params.methodName}`,
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
