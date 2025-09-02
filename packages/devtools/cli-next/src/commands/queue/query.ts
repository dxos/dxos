import { DXN } from '@dxos/keys';
import { Command, Options } from '@effect/cli';
import { Console, Effect, Schema } from 'effect';
import { ClientService } from '../../services';
import { Queue } from '@dxos/client/echo';

// TODO(dmaretskyi): Extract
const DXNSchema = Schema.String.pipe(
  Schema.transform(Schema.instanceOf(DXN), {
    decode: (value: string) => DXN.parse(value),
    encode: (value: DXN) => value.toString(),
  }),
);

export const query = Command.make(
  'query',
  {
    dxn: Options.text('dxn').pipe(Options.withDescription('DXN of the queue.'), Options.withSchema(DXNSchema)),
  },
  Effect.fnUntraced(function* ({ dxn }) {
    const client = yield* ClientService;
    const queue = (yield* Effect.promise(() => client.graph.createRefResolver({}).resolve(dxn))) as Queue<any>;
    const objects = yield* Effect.promise(() => queue.queryObjects());
    yield* Console.log(JSON.stringify(objects, null, 2));
  }),
).pipe(Command.withDescription('Query objects in a queue.'));
