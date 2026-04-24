//
// Copyright 2025 DXOS.org
//

import { addDays, addMinutes, roundToNearestMinutes, startOfDay, subDays } from 'date-fns';

import { Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { random } from '@dxos/random';
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

export type MessageLinkOptions = {
  /** Space to which linked Person objects will be added. */
  space: Space;
  /** Maximum number of linked Person objects to splice into the text. Defaults to 5. */
  max?: number;
};

export type MessageOptions = {
  /** Number of paragraphs to generate per message. Defaults to a random value between 1 and 4. */
  paragraphs?: number;
  /**
   * If provided, markdown links to newly-created Person objects are injected into
   * the message text. In this mode the message contains two text blocks: the first
   * with link syntax stripped, the second with links intact.
   */
  links?: MessageLinkOptions;
  /** Thread ID to assign to the message's `threadId`. */
  threadId?: string;
};

export type MessagesOptions = MessageOptions & {
  /**
   * If set, generates a pool of N thread IDs and randomly assigns each message to one.
   * Overrides any `threadId` supplied in the base options.
   */
  threads?: number;
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
    const randomMinutes = random.number.int({ min: WORK_START_MINUTES, max: WORK_END_MINUTES });
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
      email: random.internet.email(),
      name: person?.fullName ?? random.person.fullName(),
    };
  }

  /** Returns a random actor from the pool (70% weight) or creates a fresh one. */
  private _randomActor(): Actor.Actor {
    return this._actors.length > 0 && Math.random() > 0.3
      ? random.helpers.arrayElement(this._actors)
      : this._makeActor();
  }

  //
  // Person factory
  //

  /**
   * Creates a single Person and adds them to the internal actor pool.
   */
  createPerson(): this {
    const person = Person.make({ fullName: random.person.fullName() });
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
    const durationMinutes = random.number.int({ min: 1, max: 8 }) * 15;
    const endDate = addMinutes(startDate, durationMinutes);

    const owner = this._randomActor();
    const attendeeCount = random.number.int({ min: 1, max: 4 });
    const attendees = [owner, ...Array.from({ length: attendeeCount }, () => this._randomActor())];

    this._events.push(
      Event.make({
        title: random.lorem.sentence(random.number.int({ min: 3, max: 8 })),
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
   * Creates a single Message at a random time within the message range.
   * If `options.links` is provided, the message body will include markdown links
   * to newly-created Person objects, and the message will contain two text blocks
   * (first with link syntax stripped, second with links intact).
   */
  createMessage({ paragraphs, links, threadId }: MessageOptions = {}): this {
    const created = this._nextMessageTime();
    const paragraphCount = paragraphs ?? random.number.int({ min: 1, max: 4 });

    let text = random.helpers
      .multiple(() => random.lorem.paragraph(random.number.int({ min: 1, max: 3 })), { count: paragraphCount })
      .join('\n\n');

    let blocks: { _tag: 'text'; text: string }[];
    if (links) {
      const { space, max = 5 } = links;
      const words = text.split(' ');
      const linkCount = Math.floor(Math.random() * max) + 1;
      for (let index = 0; index < linkCount; index++) {
        const fullName = random.person.fullName();
        const obj = space.db.add(Person.make({ fullName }));
        const dxn = Ref.make(obj).dxn.toString();
        const position = Math.floor(Math.random() * words.length);
        words.splice(position, 0, `[${fullName}](${dxn})`);
      }

      const enrichedText = words.join(' ');
      // First block plain text (links stripped), second block enriched text (links intact).
      text = enrichedText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      blocks = [
        { _tag: 'text', text },
        { _tag: 'text', text: enrichedText },
      ];
    } else {
      blocks = [{ _tag: 'text', text }];
    }

    this._messages.push(
      Message.make({
        created: created.toISOString(),
        sender: this._randomActor(),
        blocks,
        ...(threadId && { threadId }),
        properties: {
          subject:
            random.helpers.arrayElement(['', 'Re: ']) + random.lorem.sentence(random.number.int({ min: 4, max: 8 })),
          snippet: text.slice(0, 120),
          labels: random.helpers.randomSubset(Object.keys(LABELS), {
            min: 0,
            max: Math.min(3, Object.keys(LABELS).length),
          }),
        },
      }),
    );

    return this;
  }

  /**
   * Creates multiple Messages, each at a random time within the message range.
   * When `options.threads` is set, a pool of thread IDs is generated and each message
   * is randomly assigned to one of them.
   */
  createMessages(count: number, options?: MessagesOptions): this {
    const { threads, ...messageOptions } = options ?? {};
    const threadIds = threads && threads > 0 ? Array.from({ length: threads }, () => random.string.uuid()) : undefined;
    for (let index = 0; index < count; index++) {
      const threadId = threadIds ? random.helpers.arrayElement(threadIds) : messageOptions.threadId;
      this.createMessage({ ...messageOptions, threadId });
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
