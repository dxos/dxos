//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Feed, Obj, Tag } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { TagIndex } from '@dxos/schema';
import { type Actor, Message, type Person } from '@dxos/types';

import { MAIN_CHARACTER, PEOPLE_SEEDS, type PersonKey, type PersonMap } from './people.ts';
import { actor, daysAgo, textBlock, threadIdFor } from './util.ts';

const makeMailbox = (
  people: Record<PersonKey, Person.Person>,
): { mailbox: Mailbox.Mailbox; messages: Message.Message[]; messageTags: Map<string, SystemTags.SystemTagId[]> } => {
  const mailbox = Mailbox.make({ name: 'Inbox' });

  // Build emails as a chronological list — oldest first. Numbers are days-ago. `to` names the
  // recipient(s); replies reuse the root's subject with a "Re:" prefix so subject-based threading
  // (see below) collapses them into one conversation.
  type Email = {
    from: PersonKey | 'noise';
    subject: string;
    body: string;
    daysAgo: number;
    to: string;
    senderOverride?: Actor.Actor;
    // Canonical system tags beyond the two every message gets by rule (`inbox`, plus `sent` for mail
    // the MAIN_CHARACTER authored) — these back the mailbox's Starred / Important folders and the
    // category chips the classification pipeline would otherwise assign.
    tags?: SystemTags.SystemTagId[];
    // Archived: the `inbox` tag comes OFF (archiving is that tag's removal, never a new tag), so the
    // message keeps showing under All mail while leaving the Inbox folder.
    archived?: boolean;
    // RFC 2369 `List-Unsubscribe` header. Marks the sender as bulk mail: it groups into the mailbox's
    // Subscriptions view (see {@link Mailbox.deriveSubscriptions}) and suppresses reply drafting.
    listUnsubscribe?: string;
  };
  const peopleSeedByKey = Object.fromEntries(PEOPLE_SEEDS.map((seed) => [seed.key, seed])) as Record<
    PersonKey,
    (typeof PEOPLE_SEEDS)[number]
  >;
  const senderFor = (key: PersonKey): Actor.Actor => {
    const seed = peopleSeedByKey[key];
    if (!seed) {
      throw new Error(`No PEOPLE_SEEDS entry for PersonKey "${key}". Add the person or use senderOverride.`);
    }
    return actor(seed.fullName, seed.email);
  };
  // Render an RFC-style recipient header ("Kai Chen <kai@bramblecoffee.com>, …") from person keys.
  const toAddr = (...keys: PersonKey[]): string =>
    keys.map((key) => `${peopleSeedByKey[key].fullName} <${peopleSeedByKey[key].email}>`).join(', ');

  // This is Kai's mailbox (she's the {@link MAIN_CHARACTER}), so every inbound message is addressed to
  // her and the Bramble-side replies to outside parties are sent by her. Kai's own notes to the team
  // keep the team as recipients.
  const emails: Email[] = [
    {
      from: 'carmen',
      daysAgo: 41,
      to: toAddr('kai'),
      subject: 'Hola Kai — Q2 harvest update from Esperanza',
      tags: ['important'],
      body: 'Hola Kai, the cherries are coming in heavier than last year. Brix is good. I think we will have your full lot ready for shipment in 5–6 weeks. Will send photos next week. Saludos, Carmen',
    },
    {
      from: 'kai',
      daysAgo: 40,
      to: toAddr('carmen'),
      subject: 'Re: Hola Kai — Q2 harvest update from Esperanza',
      body: 'Carmen — that is great news. I will plan around a mid-June arrival and loop Diego in on the logistics. Let me know if you need anything from us before then. — Kai',
    },
    {
      from: 'abel',
      daysAgo: 38,
      to: toAddr('kai'),
      subject: 'Sidamo: lots 42–44 cupping scores',
      tags: ['starred'],
      body: 'Kai, attached are the cupping scores for lots 42–44 this season. Lot 42 is the standout — fruit-forward, jasmine, clean ferment. Pricing for the full container coming separately. — Abel',
    },
    {
      from: 'jordan',
      daysAgo: 35,
      to: toAddr('kai'),
      subject: 'Reorder: 30 lb Linden + 10 lb Field Notes',
      tags: ['important'],
      body: 'Hi Kai, ready for another round. Same as last time: 30 lb Linden whole bean, 10 lb Field Notes. Friday delivery if possible. — Jordan',
    },
    {
      from: 'noise',
      daysAgo: 35,
      to: toAddr('kai'),
      subject: 'Your Stripe payout — $4,218.91',
      senderOverride: actor('Stripe', 'no-reply@stripe.com'),
      tags: ['updates'],
      body: 'Your weekly payout has been initiated. View details in the Stripe dashboard.',
    },
    {
      from: 'priya',
      daysAgo: 33,
      to: toAddr('kai'),
      subject: 'Espresso blend pilot — interested',
      body: "Hi Kai — Hatch would love to be part of the Spring Blend pilot. We have an espresso bar that's ready for something new. What are next steps? — Priya",
    },
    {
      from: 'kai',
      daysAgo: 32,
      to: toAddr('priya'),
      subject: 'Re: Espresso blend pilot — interested',
      body: 'Priya — yes! I will send a 2 lb sample with v1 of the blend next week. Would love your feedback. — Kai',
    },
    {
      from: 'carmen',
      daysAgo: 30,
      to: toAddr('kai'),
      subject: 'Fotos del beneficio',
      body: 'Photos from the wet mill this week. The new patio is making a real difference for drying. Te mando un abrazo. — Carmen',
    },
    {
      from: 'diego',
      daysAgo: 28,
      to: toAddr('kai'),
      subject: 'Trip planning — Colombia → Ethiopia',
      body: 'Kai — I am locking dates for the Q2 trip. Tentatively: 9 days in Huila, then 5 in Ethiopia. Will share the full itinerary by end of week. — Diego',
    },
    {
      from: 'noise',
      daysAgo: 27,
      to: toAddr('kai'),
      subject: 'Coffee Expo NYC — registration open',
      senderOverride: actor('SCA Events', 'events@sca.coffee'),
      tags: ['promotions'],
      listUnsubscribe: '<https://sca.coffee/email/unsubscribe?list=events>, <mailto:unsubscribe@sca.coffee>',
      body: 'Specialty Coffee Expo NYC registration is now open. Early-bird pricing through next month.',
    },
    {
      from: 'kai',
      daysAgo: 26,
      to: toAddr('diego', 'sam', 'riley'),
      subject: 'Roast curve memo — Spring Blend v1',
      body: 'Team — current draft is in the roast log. First crack at 9:18, drop at 11:30. We are tasting flat for the espresso shot — will pull up the development a touch on v2. — Kai',
    },
    {
      from: 'jordan',
      daysAgo: 24,
      to: toAddr('kai'),
      subject: 'Question about the Sidamo single-origin',
      body: 'Hi Kai — any chance of getting a few pounds of the new Sidamo when it lands? Customers loved the last lot. — Jordan',
    },
    {
      from: 'kai',
      daysAgo: 23,
      to: toAddr('jordan'),
      subject: 'Re: Question about the Sidamo single-origin',
      body: 'Jordan — putting you down for 8 lb of lot 42 when it arrives. Should be ~3 weeks out. — Kai',
    },
    {
      from: 'mateo',
      daysAgo: 21,
      to: toAddr('kai'),
      subject: 'Hello from Olive & Vine in Austin',
      body: 'Hi Kai — Olive & Vine is a small wine bar / coffee bar opening soon in East Austin. A friend at North Star recommended you. Could we talk wholesale? — Mateo',
    },
    {
      from: 'kai',
      daysAgo: 20,
      to: toAddr('mateo'),
      subject: 'Re: Hello from Olive & Vine in Austin',
      body: 'Mateo — we would love to. Sending a sampler with Linden, Field Notes, and a current single-origin tomorrow. Let me know what resonates. — Kai',
    },
    {
      from: 'priya',
      daysAgo: 17,
      to: toAddr('kai'),
      subject: 'Cupping invite — Tuesday',
      body: 'Kai — we are doing a cupping at the bakery next Tuesday at 4. Could send the Spring Blend v1 ahead, or would you want to bring it in person? — Priya',
    },
    {
      from: 'noise',
      daysAgo: 15,
      to: toAddr('kai'),
      subject: 'Shipment update: tracking #1Z999AA10123456789',
      senderOverride: actor('UPS', 'tracking@ups.com'),
      tags: ['updates'],
      body: 'Your shipment is in transit. Expected delivery: tomorrow by 8pm.',
    },

    // Bulk mail — each carries a `List-Unsubscribe` header, so the Subscriptions view groups them by
    // sender (noisiest first) and the reply generator skips them.
    {
      from: 'noise',
      daysAgo: 22,
      to: toAddr('kai'),
      subject: 'Daily Coffee News — this week in specialty',
      senderOverride: actor('Daily Coffee News', 'newsletter@dailycoffeenews.com'),
      tags: ['updates'],
      listUnsubscribe: '<https://dailycoffeenews.com/email-preferences>',
      body: 'This week: green prices ease off their Q1 highs, two roasteries open in the Southeast, and a look at solar drying beds in Huila.',
    },
    {
      from: 'noise',
      daysAgo: 13,
      to: toAddr('kai'),
      subject: 'Spring sale — 20% off packaging supplies',
      senderOverride: actor('Stack & Co. Packaging', 'offers@stackandco.com'),
      tags: ['promotions'],
      listUnsubscribe: '<https://stackandco.com/unsubscribe?id=bramble>',
      body: 'Bags, tins, and valves are 20% off through the end of the month. Free shipping over $250.',
    },
    {
      from: 'noise',
      daysAgo: 8,
      to: toAddr('kai'),
      subject: 'Daily Coffee News — origin report: Huila',
      senderOverride: actor('Daily Coffee News', 'newsletter@dailycoffeenews.com'),
      tags: ['updates'],
      listUnsubscribe: '<https://dailycoffeenews.com/email-preferences>',
      body: 'Our correspondent walks three washing stations in Huila and reports on how the longer rains are shifting harvest windows.',
    },
    {
      from: 'riley',
      daysAgo: 12,
      to: toAddr('kai'),
      subject: 'Packaging vendor switch — heads up',
      body: 'Kai — we are moving label printing from Stack & Co. to Letterform Press starting next month. Better minimums and same lead times. — Riley',
    },
    {
      from: 'abel',
      daysAgo: 9,
      to: toAddr('kai'),
      subject: 'Pricing — Sidamo container',
      tags: ['starred', 'important'],
      body: 'Kai — pricing attached for the full container. Up ~6% from last year, in line with what we discussed. Confirm and I will start the export paperwork. — Abel',
    },
    {
      from: 'kai',
      daysAgo: 7,
      to: toAddr('diego', 'sam', 'riley'),
      subject: 'Spring blend v2 — cupping notes',
      body: 'v2 cupping notes are in the document. Big improvement on body, the espresso shot is much more balanced. Heading toward v3 with a small ratio change. — Kai',
    },
    {
      from: 'jordan',
      daysAgo: 4,
      to: toAddr('kai'),
      subject: 'Visiting Oakland — coffee?',
      body: 'Kai — I am in town next Wednesday. Want to grab a cupping at the roastery? — Jordan',
    },
    {
      from: 'priya',
      daysAgo: 2,
      to: toAddr('kai'),
      subject: 'Spring blend v1 — feedback',
      tags: ['starred', 'important'],
      body: 'Kai — the team loved the chocolate and red fruit notes. Wholesale customers asked about the espresso roast specifically. Would order standing 20 lb/wk starting at launch. — Priya',
    },

    // Replies that extend existing threads (subjects match a root above, with a "Re:" prefix).
    {
      from: 'kai',
      daysAgo: 34,
      to: toAddr('jordan'),
      subject: 'Re: Reorder: 30 lb Linden + 10 lb Field Notes',
      body: 'On it, Jordan — Friday delivery confirmed. I am tossing in a small bag of the new Sidamo lot 42 for you to try. — Kai',
    },
    {
      from: 'priya',
      daysAgo: 31,
      to: toAddr('kai'),
      subject: 'Re: Espresso blend pilot — interested',
      body: 'Perfect — the espresso bar is all yours to experiment on. We will pull shots the day it lands. — Priya',
    },
    {
      from: 'kai',
      daysAgo: 8,
      to: toAddr('abel'),
      subject: 'Re: Pricing — Sidamo container',
      body: 'Confirmed, Abel — go ahead with the export paperwork. Diego will be in Sidamo next month and is looking forward to meeting you. — Kai',
    },
    {
      from: 'kai',
      daysAgo: 1,
      to: toAddr('priya'),
      subject: 'Re: Spring blend v1 — feedback',
      body: 'Wonderful to hear, Priya. I will pencil in a standing 20 lb/wk for launch and send v3 the moment it is signed off. — Kai',
    },

    // Label proofs — a three-message thread with Riley on the Letterform Press redesign. Settled, so
    // the whole thread is archived: it stays in All mail (and in Sent, for Kai's reply) but has left
    // the Inbox folder, which is what makes the two folders differ in the exemplar.
    {
      from: 'riley',
      daysAgo: 19,
      to: toAddr('kai'),
      subject: 'Label proofs — Spring Blend',
      archived: true,
      body: 'First proofs back from Letterform Press. I am partial to option B with the bramble sketch. Any objections before I approve? — Riley',
    },
    {
      from: 'kai',
      daysAgo: 18,
      to: toAddr('riley'),
      subject: 'Re: Label proofs — Spring Blend',
      archived: true,
      body: 'Option B for me too. Could we warm the background up a shade? Otherwise ship it. — Kai',
    },
    {
      from: 'riley',
      daysAgo: 16,
      to: toAddr('kai'),
      subject: 'Re: Label proofs — Spring Blend',
      archived: true,
      body: 'Done — warming it up and sending final approval to the printer today. — Riley',
    },

    // Green coffee arrival — a two-message logistics thread, also archived once the delivery landed.
    {
      from: 'riley',
      daysAgo: 11,
      to: toAddr('kai'),
      subject: 'Esperanza container — customs cleared',
      archived: true,
      body: 'The Esperanza container cleared customs in Oakland this morning. Delivery to the warehouse is set for Thursday. — Riley',
    },
    {
      from: 'kai',
      daysAgo: 10,
      to: toAddr('riley'),
      subject: 'Re: Esperanza container — customs cleared',
      archived: true,
      body: 'Perfect. I will have Diego check moisture on arrival Thursday. — Kai',
    },

    // Q2 planning — a two-message internal thread, with Kai kicking it off.
    {
      from: 'kai',
      daysAgo: 6,
      to: toAddr('diego', 'sam', 'riley'),
      subject: 'Q2 planning — agenda',
      body: 'Pulling together the Q2 planning agenda: Spring Blend launch date, sourcing-trip logistics, and the part-time roaster hire. Send me anything to add. — Kai',
    },
    {
      from: 'riley',
      daysAgo: 5,
      to: toAddr('kai'),
      subject: 'Re: Q2 planning — agenda',
      body: 'Adding packaging lead times and the new freight quote to the list. — Riley',
    },
  ];

  // Author order is chronological (oldest-first) so a reply's parent is created before it. Sort
  // defensively by `daysAgo` (descending = oldest-first) so new entries can be appended in any order
  // above without hand-placing them; the sort is stable, so same-day messages keep their listed order.
  emails.sort((left, right) => right.daysAgo - left.daysAgo);

  // Each non-first message in a thread (see {@link threadIdFor}) links to its predecessor via
  // `parentMessage`; the chronological sort above guarantees a reply's parent is created before it.
  const lastMessageIdByThread = new Map<string, string>();
  const messageTags = new Map<string, SystemTags.SystemTagId[]>();
  const messages: Message.Message[] = emails.map((email) => {
    const sender = email.senderOverride ?? senderFor(email.from as PersonKey); // 'noise' emails always carry senderOverride.
    const threadId = threadIdFor(email.subject);
    const parentMessage = lastMessageIdByThread.get(threadId);
    const message = Message.make({
      created: daysAgo(email.daysAgo, 10),
      sender,
      blocks: [textBlock(email.body)],
      threadId,
      ...(parentMessage ? { parentMessage } : {}),
      properties: {
        subject: email.subject,
        threadId,
        to: email.to,
        ...(email.listUnsubscribe ? { listUnsubscribe: email.listUnsubscribe } : {}),
      },
    });
    lastMessageIdByThread.set(threadId, message.id);
    // Two tags come by rule — `inbox` unless the thread is archived, and `sent` for mail the
    // MAIN_CHARACTER authored — with anything the email declares layered on top.
    messageTags.set(message.id, [
      ...(email.archived ? [] : (['inbox'] as const)),
      ...(email.from === MAIN_CHARACTER ? (['sent'] as const) : []),
      ...(email.tags ?? []),
    ]);
    return message;
  });

  return { mailbox, messages, messageTags };
};

// Conversation summaries, keyed by thread subject (any message's subject in the thread — it is
// normalized to the thread key). `SummarizeMailbox` derives these with a model at runtime; the
// exemplar writes them by hand so a fresh import shows the affordance without a model call.
const THREAD_SUMMARIES: Record<string, string> = {
  'Espresso blend pilot — interested':
    'Hatch wants in on the Spring Blend pilot for their espresso bar. Kai committed to a 2 lb sample of v1; Priya confirmed the bar is available to experiment on.',
  'Label proofs — Spring Blend':
    'Riley picked option B (bramble sketch) from the Letterform Press proofs. Kai asked for a warmer background; Riley warmed it and sent final approval to the printer. **Closed.**',
  'Pricing — Sidamo container':
    'Abel quoted the full Sidamo container at ~6% over last year, in line with earlier discussion. Kai confirmed and told him to start the export paperwork.',
  'Q2 planning — agenda':
    'Kai opened the Q2 agenda: Spring Blend launch date, sourcing-trip logistics, and the part-time roaster hire. Riley added packaging lead times and the new freight quote.',
  'Spring blend v1 — feedback':
    'Hatch cupped v1 and liked the chocolate and red fruit; their wholesale customers asked specifically about the espresso roast. Priya would commit to a standing **20 lb/week** at launch, which Kai penciled in.',
};

/**
 * Files each {@link THREAD_SUMMARIES} entry under the newest message of its thread, in the mailbox's
 * `annotations` feed — the second, derived-only feed alongside the message log. Summaries are
 * immutable annotation Messages whose `parentMessage` names their subject, so the conversation view
 * resolves them without the message feed carrying anything derived.
 */
const makeSummaries = (messages: Message.Message[]): Message.Message[] => {
  // Messages arrive oldest-first, so the last one seen per thread is the newest.
  const newestByThread = new Map<string, Message.Message>();
  for (const message of messages) {
    if (message.threadId) {
      newestByThread.set(message.threadId, message);
    }
  }

  const summaries = Object.entries(THREAD_SUMMARIES).map(([subject, text]) => {
    const message = newestByThread.get(threadIdFor(subject));
    if (!message) {
      throw new Error(`No thread found for summary subject "${subject}".`);
    }

    return Mailbox.makeSummary({
      message,
      text,
      // An hour after the message it summarizes: a summary dated before its subject reads as stale.
      created: new Date(Date.parse(message.created) + 60 * 60 * 1000).toISOString(),
    });
  });

  return summaries;
};

/**
 * The shared team inbox: one Message per email in the mailbox's own feed, the hand-written
 * conversation summaries in its derived `annotations` feed, and canonical system tags in its child
 * `TagIndex`.
 *
 * `inbox` backs the Inbox folder the mailbox opens on (archiving is that tag's absence), `sent` the
 * Sent folder, `starred`/`important` their own folders, and the category tags (`promotions`,
 * `updates`) stand in for what the classification pipeline assigns on a synced mailbox. Feed messages
 * are immutable, so membership lives in the tag index rather than on the messages.
 */
export type InboxResult = { mailbox: Mailbox.Mailbox; messages: Message.Message[] };

export const Inbox: SampleSpace.Phase<InboxResult, PersonMap> = SampleSpace.phase('inbox', {
  schemas: [Mailbox.Mailbox, Message.Message, TagIndex.TagIndex, Tag.Tag, Feed.Feed],
  run: (people: PersonMap) =>
    Effect.gen(function* () {
      const { mailbox, messages, messageTags } = makeMailbox(people);
      yield* Database.add(mailbox);

      const index = mailbox.tags.target;
      const feed = mailbox.feed.target;
      if (!index || !feed) {
        return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'mailbox-incomplete' } }));
      }

      yield* SampleSpace.tagBatch(
        messages.flatMap((message) => (messageTags.get(message.id) ?? []).map((key) => ({ object: message, key }))),
        { index, resolve: (db, key) => SystemTags.findOrCreateSystemTag(db, key as SystemTags.SystemTagId) },
      );

      // Bulk-mail senders for the Subscriptions view, grouped by the same function the extraction
      // pipeline runs rather than hand-listed, so the counts always match the feed.
      Obj.update(mailbox, (mailbox) => {
        mailbox.subscriptions = Mailbox.deriveSubscriptions(messages);
      });

      const { db } = yield* Database.Service;
      const annotations = Mailbox.findOrCreateAnnotations(mailbox, db);
      yield* SampleSpace.appendToFeed(feed, messages);
      yield* SampleSpace.appendToFeed(annotations, makeSummaries(messages));

      return { mailbox, messages };
    }),
});
