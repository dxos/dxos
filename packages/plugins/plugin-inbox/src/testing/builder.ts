//
// Copyright 2025 DXOS.org
//

import { addDays, addMinutes, roundToNearestMinutes, startOfDay, subDays } from 'date-fns';

import { Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Space } from '@dxos/react-client/echo';
import { Actor, Event, Message, Person } from '@dxos/types';

import { LABELS } from './data';

//
// Types
//

export type DateRange = {
  /** Inclusive range start. */
  start?: Date;
  /** Inclusive range end. */
  end?: Date;
};

export type BuilderOptions = {
  /**
   * Date range for generated events.
   * Defaults to [now − 30 days, now + 14 days].
   */
  events?: DateRange;
  /**
   * Date range for generated messages.
   * Defaults to [now − 30 days, now].
   */
  messages?: DateRange;
};

export type LinkedMessageOptions = {
  /** Number of paragraphs to generate per message. Defaults to 3. */
  paragraphs?: number;
  /** Maximum number of linked Person objects to splice into the text. Defaults to 5. */
  links?: number;
};

export type BuildResult = {
  /** Events sorted chronologically by startDate. */
  events: Event.Event[];
  /** Messages sorted chronologically by created. */
  messages: Message.Message[];
  persons: Person.Person[];
};

//
// Constants
//

const WORK_START_MINUTES = 9 * 60; // 09:00
const WORK_END_MINUTES = 17 * 60; // 17:00

//
// Builder
//

/**
 * Chainable builder for creating test data distributed across configurable date ranges.
 * Events are constrained to working hours (09:00–17:00); messages can occur at any time.
 * Items are sorted chronologically on `build()`.
 *
 * @example
 * ```ts
 * const { events, messages } = new Builder()
 *   .createPersons(5)
 *   .createEvents(30)
 *   .createMessages(100)
 *   .build();
 * ```
 */
export class Builder {
  private readonly _events: Event.Event[] = [];
  private readonly _messages: Message.Message[] = [];
  private readonly _persons: Person.Person[] = [];
  private readonly _actors: Actor.Actor[] = [];

  private readonly _eventRange: Required<DateRange>;
  private readonly _messageRange: Required<DateRange>;

  constructor({ events, messages }: BuilderOptions = {}) {
    const now = new Date();
    this._eventRange = {
      start: events?.start ?? subDays(now, 30),
      end: events?.end ?? addDays(now, 14),
    };
    this._messageRange = {
      start: messages?.start ?? subDays(now, 30),
      end: messages?.end ?? now,
    };
  }

  //
  // Internal helpers
  //

  /** Returns a uniformly random Date within the given range. */
  private _randomTimeInRange(range: Required<DateRange>): Date {
    const rangeMs = range.end.getTime() - range.start.getTime();
    return new Date(range.start.getTime() + Math.random() * rangeMs);
  }

  /**
   * Returns a random working-hours timestamp within the event range.
   * Picks a random day, then a random 15-minute slot between 09:00 and 17:00.
   */
  private _nextEventTime(): Date {
    const randomDay = this._randomTimeInRange(this._eventRange);
    const randomMinutes = faker.number.int({ min: WORK_START_MINUTES, max: WORK_END_MINUTES });
    return roundToNearestMinutes(addMinutes(startOfDay(randomDay), randomMinutes), { nearestTo: 15 });
  }

  /** Returns a random timestamp within the message range (any time of day). */
  private _nextMessageTime(): Date {
    return this._randomTimeInRange(this._messageRange);
  }

  /** Creates an actor, optionally seeded from a Person. */
  private _makeActor(person?: Person.Person): Actor.Actor {
    return {
      identityDid: IdentityDid.random(),
      email: faker.internet.email(),
      name: person?.fullName ?? faker.person.fullName(),
    };
  }

  /** Returns a random actor from the pool (70% weight) or creates a fresh one. */
  private _randomActor(): Actor.Actor {
    return this._actors.length > 0 && Math.random() > 0.3
      ? faker.helpers.arrayElement(this._actors)
      : this._makeActor();
  }

  //
  // Person factory
  //

  /**
   * Creates a single Person and adds them to the internal actor pool.
   */
  createPerson(): this {
    const person = Person.make({ fullName: faker.person.fullName() });
    this._persons.push(person);
    this._actors.push(this._makeActor(person));
    return this;
  }

  /**
   * Creates multiple Persons and adds them to the actor pool.
   */
  createPersons(count: number): this {
    for (let index = 0; index < count; index++) {
      this.createPerson();
    }
    return this;
  }

  //
  // Event factory
  //

  /**
   * Creates a single calendar Event at a random time within the event range (09:00–17:00).
   */
  createEvent(): this {
    const startDate = this._nextEventTime();
    const durationMinutes = faker.number.int({ min: 1, max: 8 }) * 15;
    const endDate = addMinutes(startDate, durationMinutes);

    const owner = this._randomActor();
    const attendeeCount = faker.number.int({ min: 1, max: 4 });
    const attendees = [owner, ...Array.from({ length: attendeeCount }, () => this._randomActor())];

    this._events.push(
      Event.make({
        title: faker.lorem.sentence(faker.number.int({ min: 3, max: 8 })),
        owner,
        attendees,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    );

    return this;
  }

  /**
   * Creates multiple Events, each at a random time within the event range.
   */
  createEvents(count: number): this {
    for (let index = 0; index < count; index++) {
      this.createEvent();
    }
    return this;
  }

  //
  // Message factory
  //

  /**
   * Creates a single plain-text Message at a random time within the message range.
   */
  createMessage(): this {
    const created = this._nextMessageTime();
    const paragraphCount = faker.number.int({ min: 1, max: 4 });
    const text = faker.helpers
      .multiple(() => faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 })), { count: paragraphCount })
      .join('\n\n');

    this._messages.push(
      Message.make({
        created: created.toISOString(),
        sender: this._randomActor(),
        blocks: [{ _tag: 'text', text }],
        properties: {
          subject:
            faker.helpers.arrayElement(['', 'Re: ']) + faker.lorem.sentence(faker.number.int({ min: 4, max: 8 })),
          snippet: text.slice(0, 120),
          labels: faker.helpers.randomSubset(Object.keys(LABELS), {
            min: 0,
            max: Math.min(3, Object.keys(LABELS).length),
          }),
        },
      }),
    );

    return this;
  }

  /**
   * Creates multiple plain-text Messages, each at a random time within the message range.
   */
  createMessages(count: number): this {
    for (let index = 0; index < count; index++) {
      this.createMessage();
    }
    return this;
  }

  //
  // Linked message factory
  //

  /**
   * Creates a single Message whose body contains markdown links to Person objects
   * added to the given Space database. The message has two content blocks:
   * a plain-text block (links stripped) and an enriched block (links intact).
   */
  createLinkedMessage(space: Space, { paragraphs = 3, links = 5 }: LinkedMessageOptions = {}): this {
    const created = this._nextMessageTime();

    let text = faker.helpers
      .multiple(() => faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 })), { count: paragraphs })
      .join('\n\n');

    let enrichedText = text;
    const words = text.split(' ');

    if (links > 0) {
      const linkCount = Math.floor(Math.random() * links) + 1;
      for (let index = 0; index < linkCount; index++) {
        const fullName = faker.person.fullName();
        const obj = space.db.add(Person.make({ fullName }));
        const dxn = Ref.make(obj).dxn.toString();
        const position = Math.floor(Math.random() * words.length);
        words.splice(position, 0, `[${fullName}](${dxn})`);
      }
    }

    // First block: plain text with link syntax stripped, keeping the label.
    enrichedText = words.join(' ');
    text = enrichedText.replace(/\[(.*?)\]\[.*?\]/g, '$1');

    this._messages.push(
      Message.make({
        created: created.toISOString(),
        sender: this._randomActor(),
        // First block plain text (links stripped), second block enriched text (links intact).
        blocks: [
          { _tag: 'text', text },
          { _tag: 'text', text: enrichedText },
        ],
        properties: {
          subject:
            faker.helpers.arrayElement(['', 'Re: ']) + faker.lorem.sentence(faker.number.int({ min: 4, max: 8 })),
          snippet: text.slice(0, 120),
          labels: faker.helpers.randomSubset(Object.keys(LABELS), {
            min: 0,
            max: Math.min(3, Object.keys(LABELS).length),
          }),
        },
      }),
    );

    return this;
  }

  /**
   * Creates multiple linked Messages, each at a random time within the message range.
   */
  createLinkedMessages(count: number, space: Space, options?: LinkedMessageOptions): this {
    for (let index = 0; index < count; index++) {
      this.createLinkedMessage(space, options);
    }
    return this;
  }

  //
  // Build
  //

  /**
   * Returns events sorted chronologically by startDate, messages sorted by created, and all persons.
   */
  build(): BuildResult {
    return {
      events: [...this._events].sort((eventA, eventB) => eventA.startDate.localeCompare(eventB.startDate)),
      messages: [...this._messages].sort((msgA, msgB) => msgA.created.localeCompare(msgB.created)),
      persons: [...this._persons],
    };
  }
}
