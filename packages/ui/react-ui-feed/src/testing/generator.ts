//
// Copyright 2026 DXOS.org
//

import { random } from '@dxos/random';
import { Message } from '@dxos/types';

export type MessageKind = 'markdown' | 'html' | 'code' | 'short';

export type GeneratorOptions = {
  count: number;
  /** Relative weights per kind; a mixed feed is the realistic case (email threads, AI chats). */
  kinds?: MessageKind[];
  seed?: number;
};

const SENDERS = ['user', 'assistant'] as const;

/**
 * Synthetic feed for measuring the engine.
 *
 * Heights are deliberately uneven — a uniform-height feed would hide exactly the measurement
 * problem the spike exists to answer.
 */
export const createMessages = ({
  count,
  kinds = ['markdown', 'markdown', 'short', 'code', 'html'],
  seed = 999,
}: GeneratorOptions): Message.Message[] => {
  random.seed(seed);
  const start = Date.now() - count * 60_000;

  return Array.from({ length: count }, (_, index) => {
    const kind = kinds[index % kinds.length];
    const role = SENDERS[index % SENDERS.length];
    return Message.make({
      created: new Date(start + index * 60_000).toISOString(),
      sender: { role, name: role === 'user' ? 'Alice' : 'Assistant' },
      blocks: [blockFor(kind, index)],
      properties: { subject: `Message ${index}`, kind },
    });
  });
};

const blockFor = (kind: MessageKind, index: number) => {
  switch (kind) {
    case 'short':
      return { _tag: 'text' as const, text: `**${index}.** ${random.lorem.sentence(6)}` };

    case 'code':
      return {
        _tag: 'text' as const,
        text: [
          `**${index}.** ${random.lorem.sentence(8)}`,
          '',
          '```ts',
          'const feed = useQuery(db, Query.from(feed));',
          'const hits = searchFeed(messages, renderer, query);',
          '```',
          '',
          random.lorem.sentence(12),
        ].join('\n'),
      };

    case 'html':
      return {
        _tag: 'text' as const,
        mimeType: 'text/html',
        text: [
          `<p><strong>${index}.</strong> ${random.lorem.sentence(10)}</p>`,
          `<blockquote>${random.lorem.sentence(14)}</blockquote>`,
          '<ul><li>attachment.pdf</li><li>invoice.csv</li></ul>',
        ].join(''),
      };

    case 'markdown':
    default:
      return {
        _tag: 'text' as const,
        text: [
          `**${index}.** ${random.lorem.sentence(10)}`,
          '',
          random.lorem.paragraph(),
          '',
          `- ${random.lorem.sentence(5)}`,
          `- ${random.lorem.sentence(7)}`,
        ].join('\n'),
      };
  }
};
