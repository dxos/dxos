//
// Copyright 2025 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Space } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { Mailbox, type Tag, sortTags } from '../types';

const TAGS: Tag[] = [
  { label: 'important', hue: 'green' },
  { label: 'investor', hue: 'purple' },
  { label: 'team', hue: 'green' },
  { label: 'eng', hue: 'blue' },
  { label: 'work', hue: 'emerald' },
  { label: 'personal', hue: 'pink' },
];

export const createMessages = (count = 10) => {
  const text = faker.lorem.paragraph();
  return faker.helpers.multiple(
    () =>
      Obj.make(DataType.Message, {
        created: faker.date.recent().toISOString(),
        sender: {
          identityDid: IdentityDid.random(),
          name: faker.person.fullName(),
        },
        blocks: [
          {
            _tag: 'text',
            text,
          },
        ],
        properties: {
          subject: faker.helpers.arrayElement(['', 'Re: ']) + faker.lorem.sentence(8),
          snippet: text,
          tags: faker.helpers.uniqueArray(TAGS, faker.number.int(3)).sort(sortTags),
        },
      }),
    {
      count,
    },
  );
};

type CreateOptions = {
  paragraphs: number;
  links: number;
};

/**
 * Creates a message with plain and enriched content blocks, where the enriched version
 * contains links to contacts and the plain version has the same content with links stripped.
 */
export const createMessage = (space?: Space, options: CreateOptions = { paragraphs: 5, links: 5 }) => {
  let text = faker.helpers
    .multiple(() => faker.lorem.paragraph(faker.number.int(3)), {
      count: options.paragraphs || 1,
    })
    .join('\n\n');

  let enrichedText = text;
  if (space) {
    const words = text.split(' ');

    // Links.
    if (options.links) {
      const linkCount = Math.floor(Math.random() * options.links) + 1;
      for (let i = 0; i < linkCount; i++) {
        const fullName = faker.person.fullName();
        const obj = space.db.add(Obj.make(DataType.Person, { fullName }));
        const dxn = Ref.make(obj).dxn.toString();
        const position = Math.floor(Math.random() * words.length);
        words.splice(position, 0, `[${fullName}](${dxn})`);
      }
    }

    // First create the enriched text with links.
    enrichedText = words.join(' ');

    // Then create plain text by stripping out the [label][dxn] syntax but keeping the label text itself.
    text = enrichedText.replace(/\[(.*?)\]\[.*?\]/g, '$1');
  }

  const tags = faker.helpers.randomSubset(TAGS, { min: 0, max: TAGS.length });
  tags.sort(sortTags);

  return Obj.make(DataType.Message, {
    created: faker.date.recent().toISOString(),
    sender: {
      identityDid: IdentityDid.random(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
    },
    // First block plain text (with links stripped), second block enriched text (with links).
    blocks: [
      { _tag: 'text', text },
      { _tag: 'text', text: enrichedText },
    ],
    properties: {
      subject: faker.helpers.arrayElement(['', 'Re: ']) + faker.lorem.sentence(8),
      snippet: text,
      tags,
    },
  });
};

/**
 * Initializes a mailbox with messages in the given space.
 */
export const initializeMailbox = async (space: Space, messageCount = 30) => {
  const mailbox = Mailbox.make({ space });
  const queueDxn = mailbox.queue.dxn;
  const queue = space.queues.get<DataType.Message>(queueDxn);
  await queue.append([...Array(messageCount)].map(() => createMessage(space)));
  space.db.add(mailbox);
  return mailbox;
};
