//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { ContextQueueService, DatabaseService } from '@dxos/functions';
import { faker } from '@dxos/random';
import { renderObjectLink } from '@dxos/react-ui-components';
import { type ContentBlock, DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

export const createMessage = (role: DataType.ActorRole, blocks: ContentBlock.Any[]): DataType.Message => {
  return Obj.make(DataType.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

export type MessageGenerator = Effect.Effect<void, never, DatabaseService | ContextQueueService>;

export const createMessageGenerator = (): MessageGenerator[] => [
  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('user', [
          {
            _tag: 'text',
            text: faker.lorem.sentence(5),
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text:
              trim`
              ## Markdown
              Here is a [link](https://dxos.org)

              And some **bold** text.

              And some JSON
              \`\`\`json
              {
                "key": "value"
              }
              \`\`\`

              And some code
              \`\`\`js
              const x = 1;
              \`\`\`
            ` + '\n',
          },
          {
            _tag: 'text',
            disposition: 'cot',
            text:
              [
                faker.lorem.paragraph(),
                '',
                ...Array.from({ length: faker.number.int({ min: 3, max: 5 }) }).map(
                  (_, idx) => `${idx + 1}. ${faker.lorem.paragraph()}`,
                ),
              ].join('\n') + '\n',
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text: 'How can I help?',
          },
          {
            _tag: 'suggestion',
            text: 'List tools',
          },
          {
            _tag: 'suggestion',
            text: 'Show info',
          },
          {
            _tag: 'suggestion',
            text: faker.lorem.paragraph(),
          },
        ]),
        createMessage('assistant', [
          {
            _tag: 'text',
            text: 'Select an option:',
          },
          {
            _tag: 'select',
            options: ['Option 1', 'Option 2', 'Option 3'],
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'toolkit',
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('user', [
          {
            _tag: 'text',
            text: faker.lorem.sentence(5),
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    const { db } = yield* DatabaseService;
    const obj1 = db.add(Obj.make(DataType.Organization.Organization, { name: 'DXOS' }));
    // const obj2 = db.add(Obj.make(DataType.Person.Person, { fullName: 'Alice' }));
    // const obj3 = db.add(Obj.make(DataType.Person.Person, { fullName: 'Bob' }));
    // const obj4 = db.add(Obj.make(DataType.Person.Person, { fullName: 'Charlie' }));
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          // Inline tag.
          {
            _tag: 'text',
            text: [faker.lorem.paragraph(), renderObjectLink(obj1), faker.lorem.paragraph(), '\n'].join(' '),
          },

          // Inline cards.
          // ...[obj1, obj2, obj3, obj4].map(
          //   (obj) =>
          //     ({
          //       _tag: 'text',
          //       text: renderObjectLink(obj, true) + '\n',
          //     }) satisfies ContentBlock.Text,
          // ),
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text: faker.lorem.paragraph() + '\n',
          },
        ]),
        createMessage('assistant', [
          {
            _tag: 'toolCall',
            toolCallId: '1234',
            name: 'search',
            input: JSON.stringify({}),
            providerExecuted: false,
          },
        ]),
        createMessage('user', [
          {
            _tag: 'toolResult',
            toolCallId: '1234',
            name: 'search',
            result: 'This is a tool result.',
            providerExecuted: false,
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text: faker.lorem.paragraph() + '\n',
          },
        ]),
        createMessage('assistant', [
          {
            _tag: 'toolCall',
            toolCallId: '4567',
            name: 'create',
            input: JSON.stringify({}),
            providerExecuted: false,
          },
        ]),
        createMessage('user', [
          {
            _tag: 'toolResult',
            toolCallId: '4567',
            name: 'create',
            result: 'This is a tool result.',
            providerExecuted: false,
          },
        ]),
        createMessage('assistant', [
          {
            _tag: 'text',
            text:
              Array.from({ length: faker.number.int({ min: 2, max: 3 }) })
                .map(() => faker.lorem.paragraph())
                .join('\n\n') + '\n',
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text: faker.lorem.paragraph(),
          },
        ]),
      ]),
    );
  }),
];
