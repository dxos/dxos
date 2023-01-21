import { test } from '@dxos/test'
import { TraceWriter } from "./api";
import { TraceCollector } from './collector';
import { ArrayTraceConsumer } from './consumers/array-consumer';
import expect from 'expect'

export class Swarm {
  private _traceWriter: TraceWriter;

  constructor(
    traceWriter: TraceWriter,
  ) {
    this._traceWriter = traceWriter;
  }

  createConnection(id: string) {
    return new Connection(this._traceWriter.scope({
      '@type': "example.testing.data.TestPayload",
      data: "connectionScope: " + id
    }));
  }
}

export class Connection {
  private _traceWriter: TraceWriter;

  constructor(
    traceWriter: TraceWriter,
  ) {
    this._traceWriter = traceWriter;
  }

  logEvent() {
    this._traceWriter.trace({
      '@type': "example.testing.data.TestPayload",
      data: "test"
    })
  }
}

test("tracing", async () => {
  const collector = new TraceCollector();
  const consumer = new ArrayTraceConsumer();
  collector.registerConsumer(consumer);


  const traceWriter = collector.createWriter([{
    '@type': "example.testing.data.TestPayload",
    data: "rootScope"
  }])

  const swarm = new Swarm(traceWriter.scope({
    '@type': "example.testing.data.TestPayload",
    data: "swarmScope"
  }));

  const connection = swarm.createConnection("connection1");
  connection.logEvent()

  await collector.flush();
  expect(consumer.events).toEqual([
    {
      timestamp: expect.any(Date),
      event: {
        '@type': "example.testing.data.TestPayload",
        data: "test"
      },
      scope: {
        scope: [
          {
            data: {
              '@type': "example.testing.data.TestPayload",
              data: "rootScope"
            }
          },
          {
            data: {
              '@type': "example.testing.data.TestPayload",
              data: "swarmScope"
            }
          },
          {
            data: {
              '@type': "example.testing.data.TestPayload",
              data: "connectionScope: connection1"
            }
          }
        ]
      }
    },
  ]);

})