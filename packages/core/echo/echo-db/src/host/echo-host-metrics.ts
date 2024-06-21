import { trace } from '@dxos/tracing';

export class EchoHostMetrics {
  updateDocumentCount(count: number) {
    trace.metrics.distribution('echo.host.loaded-documents', count);
  }
}
