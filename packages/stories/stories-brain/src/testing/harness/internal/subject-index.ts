//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { messageSource } from '@dxos/pipeline-email';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import { slugify } from './fact-store';

export type SubjectMessage = {
  readonly source: string;
  readonly from: string;
  readonly subject: string;
  readonly text: string;
};

export type SubjectFact = {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
};

export type SubjectRetrieval = {
  readonly subject: string;
  readonly factCount: number;
  readonly messages: SubjectMessage[];
  readonly facts: SubjectFact[];
};

/**
 * The Fact→source bridge: uses the fact store as an INDEX. Given a subject, it finds the facts that
 * mention that entity, follows each fact's `source` (a message-id) back to the actual message, and
 * returns those source messages (verbatim) alongside the facts. The agent then grounds its answer in
 * real message text, with the fact store doing precise entity-based retrieval.
 */
export class SubjectIndex extends Context.Tag('@dxos/stories-brain/SubjectIndex')<SubjectIndex, SubjectIndexApi>() {}

export interface SubjectIndexApi {
  readonly retrieve: (subject: string, limit: number) => SubjectRetrieval;
}

// Display label + slug for a fact term (entity or literal).
const termLabel = (term: RDF.Fact['assertion']['subject']): string => {
  if (term && typeof term === 'object') {
    if ('entity' in term && typeof term.entity === 'string') {
      return typeof (term as { label?: unknown }).label === 'string' ? (term as { label: string }).label : term.entity;
    }
    if ('value' in term && term.value != null) {
      return String((term as { value: unknown }).value);
    }
  }
  return '';
};

// Whether a fact term refers to the subject. Extractors slug the same person differently
// ("nicole-gudmand" vs "nicole" vs "ngudmand"), so exact-slug matching is too brittle: match if the
// entity slug (or slugified label) CONTAINS any subject name token as a substring (e.g. "gudmand" ⊂
// "ngudmand"). Tokens shorter than 4 chars are dropped to avoid spurious hits.
const subjectTokens = (subject: string): string[] =>
  subject
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);

const termMatches = (term: RDF.Fact['assertion']['subject'], tokens: readonly string[]): boolean => {
  if (term && typeof term === 'object' && 'entity' in term && typeof term.entity === 'string') {
    const haystack = `${term.entity} ${slugify(termLabel(term))}`;
    return tokens.some((token) => haystack.includes(token));
  }
  return false;
};

export const buildSubjectIndex = (
  facts: readonly RDF.Fact[],
  messages: readonly Message.Message[],
): SubjectIndexApi => {
  const bySource = new Map<string, Message.Message>();
  for (const message of messages) {
    bySource.set(messageSource(message), message);
  }

  return {
    retrieve: (subject, limit) => {
      const tokens = subjectTokens(subject);
      const related = facts.filter(
        (fact) => termMatches(fact.assertion.subject, tokens) || termMatches(fact.assertion.object, tokens),
      );
      const sources = [...new Set(related.map((fact) => fact.attribution.source))];
      const resolved = sources
        .map((source) => bySource.get(source))
        .filter((message): message is Message.Message => message !== undefined)
        .slice(0, limit)
        .map((message) => ({
          source: messageSource(message),
          from: `${message.sender.name ?? ''} <${message.sender.email ?? ''}>`.trim(),
          subject: String(message.properties?.subject ?? ''),
          text: Message.extractText(message).slice(0, 2000),
        }));
      const facts_ = related.slice(0, 500).map((fact) => ({
        subject: termLabel(fact.assertion.subject),
        predicate: fact.assertion.predicate,
        object: termLabel(fact.assertion.object),
      }));
      return { subject, factCount: related.length, messages: resolved, facts: facts_ };
    },
  };
};

/** A `SubjectIndex` layer built from the facts + messages — injected via `extraServices`. */
export const subjectIndexLayer = (
  facts: readonly RDF.Fact[],
  messages: readonly Message.Message[],
): Layer.Layer<SubjectIndex> =>
  Layer.effect(
    SubjectIndex,
    Effect.sync(() => buildSubjectIndex(facts, messages)),
  );
