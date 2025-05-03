//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { makeRef, refFromDXN } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { live, type Space } from '@dxos/react-client/echo';
import { Contact, MessageType } from '@dxos/schema';

import { MailboxType } from '../../types';

const EXAMPLE_TAGS = [
  { label: 'important', hue: 'amber' },
  { label: 'work', hue: 'emerald' },
  { label: 'personal', hue: 'indigo' },
];

/**
 * Creates a message with optional enriched content linking to contacts.
 */
export const createMessage = (space?: Space) => {
  const text = faker.lorem.paragraphs(5);
  let enrichedText = text;

  if (space) {
    const words = text.split(' ');
    const linkCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < linkCount; i++) {
      const fullName = faker.person.fullName();
      const obj = space.db.add(live(Contact, { fullName }));
      const dxn = makeRef(obj).dxn.toString();

      const position = Math.floor(Math.random() * words.length);
      words.splice(position, 0, `[${fullName}][${dxn}]`);
    }

    enrichedText = words.join(' ');
  }

  const tags = faker.helpers.randomSubset(EXAMPLE_TAGS, { min: 0, max: EXAMPLE_TAGS.length });

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

  return live(MessageType, {
    created: faker.date.recent().toISOString(),
    sender: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
    },
    // TODO(ZaymonFC): First block raw, second block enriched.
    blocks: [{ type: 'text', text: enrichedText }],
    properties: { tags },
  });
};

/**
 * Initializes a mailbox with messages in the given space.
 */
export const initializeMailbox = async (space: Space, messageCount = 30) => {
  const queueDxn = new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]);
  const queue = space.queues.get<MessageType>(queueDxn);
  queue.append([...Array(messageCount)].map(() => createMessage(space)));
  const mailbox = live(MailboxType, { queue: refFromDXN(queueDxn) });
  space.db.add(mailbox);
  return mailbox;
};
