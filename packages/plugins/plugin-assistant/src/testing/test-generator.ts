//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Obj } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/Obj';
import { random } from '@dxos/random';
import { renderObjectLink, textStream } from '@dxos/react-ui-markdown';
import { type Actor, type ContentBlock, Message, Organization } from '@dxos/types';
import { trim } from '@dxos/util';

export const createMessage = (role: Actor.Role, blocks: ContentBlock.Any[]): Message.Message => {
  return Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

export type MessageGenerator = Effect.Effect<
  void,
  never,
  Database.Service | Feed.ContextFeedService | Feed.FeedService
>;

export const createMessageGenerator = (): MessageGenerator[] => [
  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
      createMessage('user', [
        {
          _tag: 'text',
          text: random.lorem.sentence(5),
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    const { db } = yield* Database.Service;
    const obj1 = db.add(
      Obj.make(Organization.Organization, {
        name: 'DXOS',
        website: 'https://dxos.org',
        description: 'DXOS is a decentralized network for collaborative applications.',
      }),
    );
    // const obj2 = db.add(Obj.make(Person.Person, { fullName: 'Alice' }));
    // const obj3 = db.add(Obj.make(Person.Person, { fullName: 'Bob' }));
    // const obj4 = db.add(Obj.make(Person.Person, { fullName: 'Charlie' }));
    yield* Feed.append(feed, [
      createMessage('assistant', [
        // Inline tag.
        {
          _tag: 'text',
          text: [random.lorem.paragraph(), renderObjectLink(obj1), random.lorem.paragraph(), '\n'].join(' '),
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
    ]);
  }),

  // Streaming text block: appends a pending text block, then mutates `text` in chunks
  // so the syncer renders progressive deltas through the feed (not via the controller).
  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    const feedService = yield* Feed.FeedService;
    const message = createMessage('assistant', [{ _tag: 'text', text: '', pending: true }]);
    yield* Feed.append(feed, [message]);

    const fullText = [
      'Streaming a response **word by word** through the feed:',
      random.lorem.paragraph(),
      random.lorem.paragraph(),
    ].join('\n\n');

    yield* Effect.promise(async () => {
      for await (const chunk of textStream(fullText, { wordsPerChunk: 2, chunkDelay: 60 })) {
        Obj.update(message, (message) => {
          const block = message.blocks[0] as Mutable<ContentBlock.Text>;
          block.text += chunk;
        });
        // Feed queries only react to feed-level updates, not in-place object mutations.
        await feedService.append(feed, []);
      }
      Obj.update(message, (message) => {
        const block = message.blocks[0] as Mutable<ContentBlock.Text>;
        block.pending = false;
      });
      await feedService.append(feed, []);
    });
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
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
              random.lorem.paragraph(),
              '',
              ...Array.from({
                length: random.number.int({ min: 3, max: 5 }),
              }).map((_, idx) => `${idx + 1}. ${random.lorem.paragraph()}`),
            ].join('\n') + '\n',
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
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
          text: random.lorem.paragraph(),
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
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
      createMessage('assistant', [
        {
          _tag: 'toolkit',
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
      createMessage('user', [
        {
          _tag: 'text',
          text: random.lorem.sentence(5),
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
      createMessage('assistant', [
        {
          _tag: 'text',
          text: random.lorem.paragraph() + '\n',
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
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
      createMessage('assistant', [
        {
          _tag: 'text',
          text: random.lorem.paragraph() + '\n',
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
            Array.from({ length: random.number.int({ min: 2, max: 3 }) })
              .map(() => random.lorem.paragraph())
              .join('\n\n') + '\n',
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { feed } = yield* Feed.ContextFeedService;
    yield* Feed.append(feed, [
      createMessage('assistant', [
        {
          _tag: 'text',
          text: random.lorem.paragraph(),
        },
      ]),
    ]);
  }),
];
