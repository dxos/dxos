//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

type Operation<Input, Output> = (input: Input) => Promise<Output>;

type CellValue<T> = { value?: T };
type CellOperation<Input, Output> = { operation: Operation<Input, Output>; input: Input };
type Cell<Input, Output> = CellValue<Output> | CellOperation<Input, Output>;

const valueOf = <T>(value: T): CellValue<T> => ({ value });

const isOperation = <Input, Output>(cell: Cell<Input, Output>): cell is CellOperation<Input, Output> => {
  return !!(cell as CellOperation<Input, Output>).operation;
};

const getCellValue = async <Input, Output>(cell: Cell<Input, Output>) => {
  if (isOperation(cell)) {
    return cell.operation(cell.input);
  } else {
    return cell.value;
  }
};

const fail = () => {
  throw new Error();
};

describe.only('graph', () => {
  test('cell', async () => {
    const v1: CellValue<number> = valueOf(100);
    expect(await getCellValue(v1)).to.eq(100);

    // TODO(burdon): Effect propagation of errors.
    type Props = { a: Cell<any, number>; b: Cell<any, number> };
    const add: Operation<Props, number> = async ({ a, b }) => {
      const v1 = (await getCellValue(a)) ?? fail();
      const v2 = (await getCellValue(b)) ?? fail();
      return v1 + v2;
    };

    const v2: CellOperation<Props, number> = { operation: add, input: { a: valueOf(100), b: valueOf(200) } };
    expect(await getCellValue(v2)).to.eq(300);

    const v3: CellOperation<Props, number> = { operation: add, input: { a: v2, b: valueOf(300) } };
    expect(await getCellValue(v3)).to.eq(600);
  });

  // TODO(burdon): Test mechanism with prompts.
  // TODO(burdon): Effects.
  // TODO(burdon): Trigger recalculation; signals?

  // test('cell', async () => {
  // type Props = {};
  // const retriever = async ({ text }) => 'dxos is a decentralized platform';
  // LLM({ messages: [System Message, User Message, retriever(User Message) }].
  // });
});

/**
 * Value or operation.
 */
// Nodes: Prompt, Message, Resolver, Retriever
// const Message = S.struct({ text: S.string });
// type Message = S.Schema.Type<typeof Message>;
// type Cell<Value> = {
//   schema?: S.Schema<Value>;
//   value?: Value;
//   operation?: Operation;
//   deps?: Cell<any>[];
// };
//
// describe.only('graph', () => {
//   test.only('basic', async () => {
//     const root: Cell<number> = {
//       operation: async ({ values }: { values: number[] }) => values.reduce((acc, value) => acc + value, 0),
//       deps: {
//         values: [],
//       },
//     };
//
//     const values = await root.operation();
//   });
//
//   test('llm', async () => {
//     const system: Cell<Message> = {
//       value: {
//         text: 'answer the question using only from information given in the context.',
//       },
//     };
//
//     const context: Cell<any> = {
//       operation: async () => 'dxos is a decentralized system.',
//     };
//
//     const question: Cell<Message> = {
//       value: {
//         text: 'what is dxos?',
//       },
//       deps: [system, context],
//     };
//
//     const compute = async (node: Cell<any>) => {
//       return node.value;
//     };
//
//     const value = await compute(question);
//     console.log(value);
//     expect(value).to.eq('hello');
//   });
// });
