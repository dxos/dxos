//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Organization, Person } from '@dxos/types';

import * as Deal from './Deal';

/** Signal kind options. */
export const KindOptions = [
  { id: 'funding', title: 'Funding Round', icon: 'ph--currency-dollar--regular' },
  { id: 'hire', title: 'Key Hire', icon: 'ph--user-plus--regular' },
  { id: 'launch', title: 'Product Launch', icon: 'ph--rocket--regular' },
  { id: 'paper', title: 'Academic Paper', icon: 'ph--article--regular' },
  { id: 'social', title: 'Social Activity', icon: 'ph--chat-circle--regular' },
  { id: 'code', title: 'Code Activity', icon: 'ph--git-branch--regular' },
  { id: 'token', title: 'Token Event', icon: 'ph--coins--regular' },
  { id: 'news', title: 'News/Media', icon: 'ph--newspaper--regular' },
];

/**
 * An atomic piece of intelligence about a company, person, or deal.
 * Signals are created by data source plugins (GitHub, social, Harmonic, etc.)
 * and form a timeline of events relevant to deal flow.
 */
export const Signal = Schema.Struct({
  /** Signal title/headline. */
  title: Schema.String,
  /** Detailed description. */
  description: Schema.optional(Schema.String),
  /** Signal kind (funding, hire, launch, paper, social, code, token, news). */
  kind: Schema.optional(Schema.String),
  /** Source system (github, twitter, harmonic, manual, etc.). */
  source: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** URL to the original source. */
  url: Schema.optional(Schema.String),
  /** Organization this signal is about. */
  organization: Schema.optional(Ref.Ref(Organization.Organization).pipe(FormInputAnnotation.set(false))),
  /** Person this signal is about. */
  person: Schema.optional(Ref.Ref(Person.Person).pipe(FormInputAnnotation.set(false))),
  /** Deal this signal relates to. */
  deal: Schema.optional(Ref.Ref(Deal.Deal).pipe(FormInputAnnotation.set(false))),
  /** When the signal was detected. */
  detectedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Arbitrary structured data from the source. */
  data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.signal',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--lightning--regular',
    hue: 'amber',
  }),
);

export interface Signal extends Schema.Schema.Type<typeof Signal> {}

/** Creates a Signal object. */
export const make = (props: Obj.MakeProps<typeof Signal>): Signal => Obj.make(Signal, props);
