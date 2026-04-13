//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Organization } from '@dxos/types';

/**
 * A research report linked to an organization or standalone subject.
 * Contains references to the generated Document and source metadata.
 */
export const ResearchReport = Schema.Struct({
  /** Report title. */
  title: Schema.optional(Schema.String),
  /** The generated document. */
  document: Schema.optional(Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false))),
  /** Linked organization. */
  organization: Schema.optional(Ref.Ref(Organization.Organization).pipe(FormInputAnnotation.set(false))),
  /** Research type (paper-search, web-archive, market-analysis). */
  kind: Schema.optional(Schema.String),
  /** Search query used. */
  query: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Number of sources found. */
  sourceCount: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** When the research was conducted. */
  createdAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.researchReport',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--book-open--regular',
    hue: 'indigo',
  }),
);

export interface ResearchReport extends Schema.Schema.Type<typeof ResearchReport> {}

/**
 * Research account for managing search configuration.
 */
export const ResearchAccount = Schema.Struct({
  /** Display name. */
  name: Schema.optional(Schema.String),
  /** Semantic Scholar API key (optional, increases rate limits). */
  semanticScholarKey: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Last search timestamp. */
  lastSearchedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.researchAccount',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--book-open--regular',
    hue: 'indigo',
  }),
);

export interface ResearchAccount extends Schema.Schema.Type<typeof ResearchAccount> {}

/** Input schema for creating a ResearchAccount. */
export const CreateResearchAccountSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({
    title: 'Name',
    description: 'Display name for this research account.',
  })),
});

export interface CreateResearchAccountSchema extends Schema.Schema.Type<typeof CreateResearchAccountSchema> {}

/** Creates a ResearchAccount object. */
export const makeAccount = (props: CreateResearchAccountSchema): ResearchAccount => {
  return Obj.make(ResearchAccount, {
    name: props.name ?? 'Research',
  });
};
