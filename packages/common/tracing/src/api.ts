import { TypedMessage } from '@dxos/protocols'
import { TraceEvent } from '@dxos/protocols/proto/dxos/tracing'


export interface TraceWriter {
  trace (event: TypedMessage): void;
  scope (...scopes: TypedMessage[]): TraceWriter;
}

export interface TraceConsumer {
  consume (event: TraceEvent): Promise<void>;
}

// export const traceWriterSymbol = Symbol.for('dxos.traceWriter')

// export const setTraceWriter = (instance: any, traceWriter: TraceWriter) => {
//   instance[traceWriterSymbol] = traceWriter
// }

// export const getTraceWriter = (instance: any): TraceWriter => {
//   return instance[traceWriterSymbol]
// }

// export const trace = (instance: any, event: TypedMessage) => {
//   const traceWriter = getTraceWriter(instance)
//   if (traceWriter) {
//     traceWriter.trace(event)
//   }
// }

// export const deriveTraceScope = (parentInstance: any, childInstance: any, ...scopes: TypedMessage[]) => {
//   const parentTraceWriter = getTraceWriter(parentInstance)
//   if (parentTraceWriter) {
//     setTraceWriter(childInstance, parentTraceWriter.scope(...scopes))
//   }
// }