import { TypedMessage } from "@dxos/protocols";
import { TraceEvent } from "@dxos/protocols/proto/dxos/tracing";
import { TraceConsumer, TraceWriter } from "./api";
import { synchronized } from '@dxos/async'
import { log } from "@dxos/log";

export class TraceCollector {
  private readonly _consumers: RegisteredConsumer[] = [];

  async registerConsumer(consumer: TraceConsumer) {
    this._consumers.push(new RegisteredConsumer(consumer));
  }

  async unregisterConsumer(consumer: TraceConsumer) {
    const idx = this._consumers.findIndex((registeredConsumer) => registeredConsumer.consumer === consumer);
    if (idx !== -1) {
      this._consumers.splice(idx, 1);
    }
  }

  createWriter(scopes: TypedMessage[]): TraceWriter {
    return new TraceWriterImpl(this._write.bind(this), scopes);
  }

  async flush() {
    await Promise.all(this._consumers.map((consumer) => consumer.flush()));
  }

  private _write(writer: TraceWriterImpl, event: TypedMessage) {
    const traceEvent: TraceEvent = {
      timestamp: new Date(),
      scope: {
        scope: writer.scopes.map(data => ({
          data,
        })),
      },
      event,
    };
    this._consumers.forEach((consumer) => consumer.consume(traceEvent));
  }
}

export class TraceWriterImpl implements TraceWriter {
  constructor(
    private readonly _write: (writer: TraceWriterImpl, event: TypedMessage) => void,
    public readonly scopes: TypedMessage[]
  ) {}
  

  trace(event: TypedMessage) {
    this._write(this, event);
  }

  scope(...scopes: TypedMessage[]): TraceWriter {
    return new TraceWriterImpl(this._write, [...this.scopes, ...scopes]);
  }
}

export class RegisteredConsumer {
  public readonly consumer: TraceConsumer;

  constructor(consumer: TraceConsumer) {
    this.consumer = consumer;
  }

  consume(event: TraceEvent) {
    void this._consumeSynchronized(event)
  }

  @synchronized
  private async _consumeSynchronized(event: TraceEvent) {
    try {
      await this.consumer.consume(event);
    } catch (err) {
      log.catch(err);
    }
  }

  @synchronized // Will wait for all pending consume calls to finish.
  flush() {}
}