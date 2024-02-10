//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';

import { getTracingContext } from './symbols';
import { TRACE_PROCESSOR, TracingSpan } from './trace-processor';

/**
 * Annotates a class as a tracked resource.
 */
const resource =
  () =>
  <T extends { new (...args: any[]): {} }>(constructor: T) => {
    // Wrapping class declaration into an IIFE so it doesn't capture the `klass` class name.
    const klass = (() =>
      class extends constructor {
        constructor(...rest: any[]) {
          super(...rest);
          TRACE_PROCESSOR.traceResourceConstructor({ constructor, instance: this });
        }
      })();
    Object.defineProperty(klass, 'name', { value: constructor.name });
    return klass;
  };

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

export interface SpanMetricsCounter {
  beginSpan(span: TracingSpan): void;
  endSpan(span: TracingSpan): void;
}

export type SpanOptions<T> = {
  showInBrowserTimeline?: boolean;

  /**
   * Instead of recording each span separately, use the provided metrics counter to record the span metrics.
   */
  metricsCounter?: keyof T;
};

const span =
  <T>({ showInBrowserTimeline = false, metricsCounter }: SpanOptions<T> = {}) =>
  (target: T, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => {
    const method = descriptor.value!;

    descriptor.value = async function (this: T, ...args: any) {
      const parentCtx = args[0] instanceof Context ? args[0] : null;
      const span = TRACE_PROCESSOR.traceSpan({
        parentCtx,
        methodName: propertyKey,
        instance: this,
        showInBrowserTimeline,
        metricsCounter: (metricsCounter !== undefined ? (this[metricsCounter] as SpanMetricsCounter) : null) ?? null,
      });

      const callArgs = span.ctx ? [span.ctx, ...args.slice(1)] : args;
      try {
        return await method.apply(this, callArgs);
      } catch (err) {
        span.markError(err);
        throw err;
      } finally {
        span.markSuccess();
      }
    };
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

export const trace = {
  resource,
  info,
  mark,
  span,
  metricsCounter,

  addLink,
};
