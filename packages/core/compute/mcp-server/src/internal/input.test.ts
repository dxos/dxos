//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import * as Input from './input';

const TaskSet = Type.makeObject<{ name: string }>(DXN.make('com.example.type.taskSet', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
);

const CreateTask = Operation.make({
  meta: { key: DXN.make('com.example.operation.fn.taskCreate'), name: 'Create Task' },
  input: Schema.Struct({
    title: Schema.String,
    taskSet: Ref.Ref(TaskSet).annotate({ description: 'Owning task set.' }),
    parent: Schema.optional(Ref.Ref(TaskSet)),
  }),
  output: Schema.Struct({ id: Schema.String }),
  services: [Database.Service],
});

/** `CreateTask`'s input is a struct, so `Input.codec` always returns one; assert that once here. */
const getCodec = (): Input.Codec => {
  const codec = Input.codec(Operation.serialize(CreateTask));
  if (codec == null) {
    throw new Error('Expected Input.codec to return a codec for a struct input schema.');
  }
  return codec;
};

describe('Input', () => {
  test('a ref argument decodes whether it arrives as an object or JSON-stringified', async ({ expect }) => {
    const codec = getCodec();
    const envelope = { '/': 'echo://BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/01J000000000000000000000000' };

    const structured = await EffectEx.runPromise(
      Schema.decodeUnknownEffect(codec.decode)({ title: 'x', taskSet: envelope }),
    );
    const stringified = await EffectEx.runPromise(
      Schema.decodeUnknownEffect(codec.decode)({ title: 'x', taskSet: JSON.stringify(envelope) }),
    );
    expect(JSON.stringify(structured)).to.equal(JSON.stringify(stringified));
  });

  test('an optional ref stays optional after widening', async ({ expect }) => {
    const codec = getCodec();
    const envelope = { '/': 'echo://BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/01J000000000000000000000000' };
    const decoded = await EffectEx.runPromise(
      Schema.decodeUnknownEffect(codec.decode)({ title: 'x', taskSet: envelope }),
    );
    expect(decoded).to.not.have.property('parent');
  });

  test('a ref argument that is neither an envelope nor JSON is still a decode failure', async ({ expect }) => {
    const codec = getCodec();
    const result = await EffectEx.runPromise(
      Effect.result(Schema.decodeUnknownEffect(codec.decode)({ title: 'x', taskSet: 'not a ref' })),
    );
    expect(result._tag).to.equal('Failure');
  });

  test('the decoded value encodes back to the wire envelope, not a live ref', async ({ expect }) => {
    const codec = getCodec();
    const envelope = { '/': 'echo://BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/01J000000000000000000000000' };
    const decoded = await EffectEx.runPromise(
      Schema.decodeUnknownEffect(codec.decode)({ title: 'x', taskSet: envelope }),
    );
    const wire = (await EffectEx.runPromise(Schema.encodeUnknownEffect(codec.encode)(decoded))) as {
      taskSet: unknown;
    };
    expect(wire.taskSet).to.deep.equal(envelope);
  });

  test('declaresSpaceId reads the input schema, not the annotations', ({ expect }) => {
    expect(Input.declaresSpaceId(Operation.serialize(CreateTask))).to.be.false;
    const withSpaceId = Operation.serialize(
      Operation.make({
        meta: { key: DXN.make('com.example.operation.fn.withSpace'), name: 'With space' },
        input: Schema.Struct({ spaceId: Schema.String }),
        output: Schema.Struct({}),
      }),
    );
    expect(Input.declaresSpaceId(withSpaceId)).to.be.true;
  });
});
