//
// Copyright 2025 DXOS.org
//

import { addMinutes, roundToNearestMinutes } from 'date-fns';

import { Obj, Ref, Tag } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Space } from '@dxos/react-client/echo';
import { Event, Message, Person } from '@dxos/types';

import { Mailbox } from '../types';
import { sortByCreated } from '../util';

export const TAGS: Tag.Tag[] = [
  Tag.make({ label: 'important', hue: 'green' }),
  Tag.make({ label: 'investor', hue: 'purple' }),
  Tag.make({ label: 'team', hue: 'green' }),
  Tag.make({ label: 'eng', hue: 'cyan' }),
  Tag.make({ label: 'work', hue: 'emerald' }),
  Tag.make({ label: 'personal', hue: 'pink' }),
];

export const TAGS_MAP = TAGS.reduce((acc, tag) => ({ ...acc, [tag.id]: { label: tag.label, hue: tag.hue } }), {});

type CreateOptions = {
  paragraphs: number;
  links: number;
};

//
// Create event
//

export const createEvents = (count: number, space?: Space, options?: CreateOptions) => {
  return faker.helpers.multiple(() => createEvent(space, options), { count }).sort(sortByCreated('startDate'));
};

export const createEvent = (space?: Space, options: CreateOptions = { paragraphs: 5, links: 5 }): Event.Event => {
  const createActor = () => ({ email: faker.internet.email() });
  const owner = createActor();
  const startDate = roundToNearestMinutes(faker.date.recent(), { nearestTo: 30 });
  const endDate = addMinutes(startDate, faker.number.int({ min: 1, max: 10 }) * 15);

  return Obj.make(Event.Event, {
    name: faker.lorem.sentence(8),
    owner,
    attendees: [owner, ...faker.helpers.multiple(() => createActor(), { count: faker.number.int({ min: 1, max: 5 }) })],
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    links: [],
  });
};

//
// Create message
//

export const createMessages = (count: number, space?: Space, options?: CreateOptions) => {
  return faker.helpers
    .multiple(() => createMessage(space, options), { count })
    .sort(sortByCreated('created'))
    .reverse();
};

/**
 * Creates a message with plain and enriched content blocks, where the enriched version
 * contains links to contacts and the plain version has the same content with links stripped.
 */
export const createMessage = (space?: Space, options: CreateOptions = { paragraphs: 5, links: 5 }): Message.Message => {
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
        const obj = space.db.add(Obj.make(Person.Person, { fullName }));
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

  return Obj.make(
    Message.Message,
    {
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
      },
    },
    {
      tags: faker.helpers.randomSubset(
        TAGS.map((tag) => tag.id),
        { min: 0, max: TAGS.length },
      ),
    },
  );
};

/**
 * Initializes a mailbox with messages in the given space.
 */
export const initializeMailbox = async (space: Space, count = 30) => {
  const mailbox = Mailbox.make({ space });
  const queue = space.queues.get<Message.Message>(mailbox.queue.dxn);
  await queue.append(createMessages(count, space));
  space.db.add(mailbox);
  return mailbox;
};
