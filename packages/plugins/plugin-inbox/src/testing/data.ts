//
// Copyright 2025 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Space } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { type Tag } from '../components';
import { Mailbox } from '../types';

const TAGS: Tag[] = [
  { label: 'important', hue: 'green' },
  { label: 'investor', hue: 'purple' },
  { label: 'team', hue: 'green' },
  { label: 'eng', hue: 'blue' },
  { label: 'work', hue: 'emerald' },
  { label: 'personal', hue: 'pink' },
];

const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);

export const createMessages = (count = 10) => {
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
            text: faker.lorem.paragraph(),
          },
        ],
        properties: {
          subject: faker.commerce.productName(),
          tags: faker.helpers.uniqueArray(TAGS, faker.number.int(3)).sort(sortTags),
        },
      }),
    { count },
  );
};

/**
 * Creates a message with plain and enriched content blocks, where the enriched version
 * contains links to contacts and the plain version has the same content with links stripped.
 */
export const createMessage = (space?: Space) => {
  // Start with base text
  let text = faker.lorem.paragraphs(5);
  let enrichedText = text;

  if (space) {
    const words = text.split(' ');
    const linkCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < linkCount; i++) {
      const fullName = faker.person.fullName();
      const obj = space.db.add(Obj.make(DataType.Person, { fullName }));
      const dxn = Ref.make(obj).dxn.toString();

      const position = Math.floor(Math.random() * words.length);
      words.splice(position, 0, `[${fullName}](${dxn})`);
    }

    // First create the enriched text with links
    enrichedText = words.join(' ');

    // Then create plain text by stripping out the [label][dxn] syntax
    // but keeping the label text itself
    text = enrichedText.replace(/\[(.*?)\]\[.*?\]/g, '$1');
  }

  const tags = faker.helpers.randomSubset(TAGS, { min: 0, max: TAGS.length });

  const hasBothWorkAndPersonal =
    tags.some((tag) => tag.label === 'work') && tags.some((tag) => tag.label === 'personal');

  if (hasBothWorkAndPersonal) {
    const indexToRemove = tags.findIndex((tag) => tag.label === (Math.random() > 0.5 ? 'work' : 'personal'));
    tags.splice(indexToRemove, 1);
  }

  // Maybe spam.
  if (Math.random() < 0.05) {
    tags.length = 0;
    tags.push({ label: 'spam', hue: 'error' });
  }

  tags.sort((a, b) => a.label.localeCompare(b.label));

  return Obj.make(DataType.Message, {
    created: faker.date.recent().toISOString(),
    sender: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
    },
    // First block plain text (with links stripped), second block enriched text (with links)
    blocks: [
      { _tag: 'text', text },
      { _tag: 'text', text: enrichedText },
    ],
    properties: { tags },
  });
};

/**
 * Initializes a mailbox with messages in the given space.
 */
export const initializeMailbox = async (space: Space, messageCount = 30) => {
  const queueDxn = space.queues.create().dxn;
  const queue = space.queues.get<DataType.Message>(queueDxn);
  await queue.append([...Array(messageCount)].map(() => createMessage(space)));
  const mailbox = Mailbox.make({ queue: queueDxn });
  space.db.add(mailbox);
  return mailbox;
};
