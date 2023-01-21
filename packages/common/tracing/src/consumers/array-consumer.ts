import { TraceEvent } from "@dxos/protocols/proto/dxos/tracing";
import { TraceConsumer } from "../api";

export class ArrayTraceConsumer implements TraceConsumer {
  public events: TraceEvent[] = [];

  async consume(event: TraceEvent) {
    this.events.push(event);
  }
}