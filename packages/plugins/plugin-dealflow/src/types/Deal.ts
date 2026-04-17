//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Organization, Person, Thread } from '@dxos/types';

/** Deal stage options matching a typical VC pipeline. */
export const StageOptions = [
  { id: 'sourcing', title: 'Sourcing', color: 'neutral' },
  { id: 'screening', title: 'Screening', color: 'indigo' },
  { id: 'diligence', title: 'Due Diligence', color: 'purple' },
  { id: 'termsheet', title: 'Term Sheet', color: 'amber' },
  { id: 'closed', title: 'Closed', color: 'emerald' },
  { id: 'passed', title: 'Passed', color: 'red' },
];

/** Investment round options. */
export const RoundOptions = [
  { id: 'pre-seed', title: 'Pre-Seed' },
  { id: 'seed', title: 'Seed' },
  { id: 'series-a', title: 'Series A' },
  { id: 'series-b', title: 'Series B' },
  { id: 'series-c', title: 'Series C+' },
  { id: 'growth', title: 'Growth' },
];

/**
 * A venture capital deal tracking a potential investment.
 * References existing DXOS types: Organization (target company), Person (lead partner),
 * Pipeline (deal stage), and Thread (team discussion).
 */
export const Deal = Schema.Struct({
  /** Deal name (typically the company name). */
  name: Schema.optional(Schema.String),
  /** Target company. */
  organization: Schema.optional(Ref.Ref(Organization.Organization).pipe(FormInputAnnotation.set(false))),
  /** Lead partner on this deal. */
  lead: Schema.optional(Ref.Ref(Person.Person).pipe(FormInputAnnotation.set(false))),
  /** Current pipeline stage. */
  stage: Schema.optional(Schema.String),
  /** Investment round type. */
  round: Schema.optional(Schema.String),
  /** Requested investment amount. */
  askAmount: Schema.optional(Schema.Number),
  /** Company valuation. */
  valuation: Schema.optional(Schema.Number),
  /** Investment thesis / notes. */
  thesis: Schema.optional(Schema.String),
  /** Discussion thread for this deal. */
  thread: Schema.optional(Ref.Ref(Thread.Thread).pipe(FormInputAnnotation.set(false))),
  /** Trello card ID for sync (if sourced from Trello). */
  trelloCardId: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** First contact date. */
  firstContact: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Last activity date. */
  lastActivity: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Sector/vertical tags. */
  sectors: Schema.optional(Schema.Array(Schema.String)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.deal',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--handshake--regular',
    hue: 'emerald',
  }),
);

export interface Deal extends Schema.Schema.Type<typeof Deal> {}

/** Creates a Deal object. */
export const make = (props: Partial<Obj.MakeProps<typeof Deal>> = {}): Deal => Obj.make(Deal, props);
