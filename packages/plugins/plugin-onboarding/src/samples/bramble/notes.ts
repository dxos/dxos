//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, EID, Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Organization, type Person, type TaskSet } from '@dxos/types';

import { type OrgKey, type OrgMap } from './organizations.ts';
import { type PersonKey, type PersonMap } from './people.ts';
import { daysAgo, daysFromNow } from './util.ts';

//
// Markdown notes (with inline DXN links and block embeds)
//

export type NotesBundle = {
  cuppingNotes: Markdown.Document;
  itinerary: Markdown.Document;
  tastingProtocol: Markdown.Document;
  wholesaleTerms: Markdown.Document;
  welcomePacket: Markdown.Document;
};

const makeNotes = (
  people: Record<PersonKey, Person.Person>,
  organizations: Record<OrgKey, Organization.Organization>,
  taskSet: TaskSet.TaskSet,
): NotesBundle => {
  // Helpers — produce markdown link / block-embed syntax that the editor understands.
  // Use space-relative URIs so links remain valid when the snapshot is imported into a new space.
  const lnk = (label: string, obj: Obj.Unknown) => `[${label}](${EID.make({ entityId: obj.id })})`;
  const emb = (label: string, obj: Obj.Unknown) => `![${label}](${EID.make({ entityId: obj.id })})`;

  const cuppingNotes = Markdown.make({
    name: 'Cupping notes — Finca Esperanza Lot A',
    content: [
      '# Cupping notes — Finca Esperanza Lot A',
      '',
      `**Farm:** ${lnk('Finca Esperanza', organizations.fincaEsperanza)} · **Contact:** ${lnk('Carmen Restrepo', people.carmen)}`,
      '',
      `**Date:** ${daysAgo(20, 10).slice(0, 10)} · **Cuppers:** ${lnk('Kai', people.kai)}, ${lnk('Diego', people.diego)}, ${lnk('Sam', people.sam)}`,
      '',
      '## Profile',
      '',
      '- **Fragrance/Aroma:** Stone fruit, jasmine, light cocoa.',
      '- **Acidity:** Bright, malic, well-structured.',
      '- **Body:** Medium, silky.',
      '- **Flavor:** Red apple, raspberry, milk chocolate, almond finish.',
      '- **Aftertaste:** Long, clean, slightly floral.',
      '',
      '## Scores',
      '',
      '| Cupper | Score |',
      '| --- | --- |',
      '| Kai | 87.5 |',
      '| Diego | 88.0 |',
      '| Sam | 87.0 |',
      '',
      '## Notes',
      '',
      'Best lot Carmen has sent us in three years. Worth pushing into the Spring Blend at a higher ratio than we initially planned.',
    ].join('\n'),
  });

  const itinerary = Markdown.make({
    name: 'Q2 sourcing trip — itinerary',
    content: [
      '# Q2 sourcing trip — itinerary',
      '',
      `**Traveler:** ${lnk('Diego Alvarez', people.diego)}`,
      '',
      `**Dates:** ${daysFromNow(21).slice(0, 10)} → ${daysFromNow(35).slice(0, 10)}`,
      '',
      '## Colombia (Huila)',
      '',
      `**Host:** ${lnk('Carmen Restrepo', people.carmen)} · ${lnk('Finca Esperanza', organizations.fincaEsperanza)}`,
      '',
      '- Land in Bogotá; drive to Neiva.',
      '- Two days at Finca Esperanza with Carmen.',
      '- Visit two new lots recommended by our importer.',
      '- Return to Bogotá; fly out.',
      '',
      '## Peru (remote)',
      '',
      '- Video call with the Cajamarca producer our importer introduced. We have a small sample lot on hand.',
      '',
      '## Ethiopia (Sidamo)',
      '',
      `**Host:** ${lnk('Abel Tadesse', people.abel)} · ${lnk('Sidamo Cooperative', organizations.sidamoCoop)}`,
      '',
      '- Arrive Addis Ababa; meet Abel.',
      '- Three days in Sidamo (cooperative + two member washing stations).',
      '- Cup the new harvest in Addis before flying home.',
      '',
      '## Buying targets',
      '',
      '- Colombia: lock 18 bags (Esperanza) + 6 bags (new lot if it cups above 87).',
      '- Ethiopia: confirm the full container of Lot #42; optionally add a smaller naturals lot.',
    ].join('\n'),
  });

  const tastingProtocol = Markdown.make({
    name: 'Spring blend tasting protocol',
    content: [
      '# Spring blend — tasting protocol',
      '',
      `Tasks: ${emb('Spring Blend Launch', taskSet)}`,
      '',
      '## Setup',
      '',
      '- Prepare 4 samples per session: v1, v2, v3, and the control (current Linden blend).',
      '- Grind 10 g per sample, 200 ml at 94 °C.',
      '- Evaluate dry fragrance, wet aroma, and taste at 4-min, 8-min, 12-min intervals.',
      '',
      '## Brew parameters',
      '',
      '1. **Espresso:** 18 g in / 36 g out / 27–30 s.',
      '2. **Filter:** 1:16 ratio, 4:00 total time.',
      '',
      '## Scoring dimensions',
      '',
      'Fragrance/Aroma · Flavour · Aftertaste · Acidity · Body · Balance · Uniformity · Cleanliness · Sweetness',
      '',
      '## Key targets',
      '',
      '- Espresso-forward: good body at 1:2.5 ratio.',
      '- Profile: fruit-forward (berry, stone fruit), chocolate mid, clean finish.',
      '- Score on the SCA form, then add a short qualitative note.',
      '- Re-cup after 7 days to check for stale notes.',
    ].join('\n'),
  });

  const wholesaleTerms = Markdown.make({
    name: 'Wholesale terms',
    content: [
      '# Wholesale terms',
      '',
      'Prices per pound, roasted, shipped in 5 lb bags. The webshop sells the same coffees in 12 oz retail bags.',
      '',
      '| Coffee | Wholesale / lb | Retail / 12 oz |',
      '| --- | --- | --- |',
      '| Linden (everyday espresso) | $18 | $19 |',
      '| Field Notes (filter) | $18 | $19 |',
      '| Late Shift (dark) | $17 | $18 |',
      '| Finca Esperanza single-origin | $24 | $26 |',
      '| Sidamo Lot #42 single-origin | $24 | $26 |',
      '| Spring Blend (preorder) | $21 | $22 |',
      '',
      '## Tiers',
      '',
      '- **Starter:** under 40 lb a month. List price, 10 lb minimum order.',
      '- **Standing order:** 40 lb a month or more on a fixed schedule. 8% off list and a free grinder calibration visit (Bay Area) or video call (everywhere else).',
      '',
      '## Ordering and delivery',
      '',
      '- Order by email to Sam by Monday noon; we roast Wednesday and ship Thursday.',
      '- Bay Area: our van, Friday. Everywhere else: two-day ground, arrives the following Monday or Tuesday.',
      '- Net 30 for accounts past their third order; card on file before that.',
    ].join('\n'),
  });

  const welcomePacket = Markdown.make({
    name: 'Olive & Vine welcome packet (draft)',
    content: [
      '# Welcome to Bramble, Olive & Vine',
      '',
      `For ${lnk('Mateo Ruiz', people.mateo)} at ${lnk('Olive & Vine', organizations.oliveAndVine)}, East Austin.`,
      '',
      '## Dialing in Linden',
      '',
      '_To write._',
      '',
      '## How to order',
      '',
      '_To write._',
      '',
      '## Your pricing',
      '',
      '_To write._',
      '',
      '## Delivery to Austin',
      '',
      '_To write._',
      '',
      `Questions go to ${lnk('Sam Okafor', people.sam)}, sam@bramblecoffee.com.`,
    ].join('\n'),
  });

  return { cuppingNotes, itinerary, tastingProtocol, wholesaleTerms, welcomePacket };
};

/** Notes that reference people, organizations and the task set by DXN link and block embed. */
export type NotesInput = { people: PersonMap; organizations: OrgMap; taskSet: TaskSet.TaskSet };

export const Notes: SampleSpace.Phase<NotesBundle, NotesInput> = SampleSpace.phase('notes', {
  schemas: [Markdown.Document],
  run: ({ people, organizations, taskSet }) =>
    Effect.gen(function* () {
      const notes = makeNotes(people, organizations, taskSet);
      for (const note of Object.values(notes)) {
        yield* Database.add(note);
      }
      return notes;
    }),
});
