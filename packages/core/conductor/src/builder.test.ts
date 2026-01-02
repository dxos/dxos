import { test } from 'vitest';
import { ComputeGraphBuilder, type ComputeNode } from './builder';
import { Schema } from 'effect';

declare const Add: ComputeNode<{ a: number; b: number }, { result: number }>;

test('add 3', () => {
  ComputeGraphBuilder.build(
    {
      input: {
        a: Schema.Number,
        b: Schema.Number,
        c: Schema.Number,
      },
      output: {
        result: Schema.Number,
      },
    },
    (b) => {
      const x = b.node(Add, { a: b.in.a, b: b.in.b });
      const y = b.node(Add, { a: x.out.result, b: b.in.c });

      return {
        result: y.out.result,
      };
    },
  );
});

interface Chat {
  __Chat: '__Chat';
}
const Chat = Schema.declare<Chat>((() => true) as any);

interface Blueprint {
  __Tool: '__Tool';
}
const Blueprint = Schema.declare<Blueprint>((() => true) as any);

declare const TeaSet: Blueprint;

declare const Agent: ComputeNode<{ chat: Chat; instructions: string; blueprints?: Blueprint[] }, { chat: Chat }>;

test('agent making tea', () => {
  ComputeGraphBuilder.build(
    {
      input: {
        chat: Chat,

        teaType: Schema.String,
        milk: Schema.optional(Schema.Boolean),
        numberOfCups: Schema.Number,
      },
      output: {
        chat: Chat,
      },
    },
    (b) => {
      const blueprints = b.const([TeaSet]);

      const step1 = b.node(Agent, {
        chat: b.in.chat,
        instructions: b.const(`Boil the water for ${b.in.numberOfCups} cups`),
        blueprints,
      });
      const step2 = b.node(Agent, {
        chat: step1.out.chat,
        instructions: b.const(`Steep the tee, type=${b.in.teaType}`),
      });
      const step3 = b.node(Agent, {
        chat: step2.out.chat,
        instructions: b.const(`Pour the tea: numberOfCups: ${b.in.numberOfCups}, milk=${b.in.milk}`),
      });
      return {
        chat: step3.out.chat,
      };
    },
  );
});
