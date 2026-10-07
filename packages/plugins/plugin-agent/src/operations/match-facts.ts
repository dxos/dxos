//
// Copyright 2026 DXOS.org
//

import { type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';

import { FactEntry, type Trigger } from '#types';

const words = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Every word of `needle` occurs in `haystack`; words of three letters or more also match as a prefix ("PR" ≠ "prior", "indexer" ~ "indexers"). */
const mentions = (haystack: string, needle: string): boolean => {
  const available = words(haystack);
  return words(needle).every((word) =>
    available.some((candidate) => (word.length < 3 ? candidate === word : candidate.startsWith(word))),
  );
};

/** A speaker's slug names a person by their whole name or its first word: "rich" is "Rich Burdon". */
const isSpeaker = (name: string, speaker: string | undefined): boolean => {
  if (speaker === undefined) {
    return false;
  }
  const slug = normalizeEntityId(name);
  return speaker === slug || speaker.startsWith(`${slug}-`) || slug.startsWith(`${speaker}-`);
};

const time = (iso: string): number => Date.parse(iso);

export type MatchOptions = {
  /** Facts said before this instant never match, unless the pattern sets its own `after`. */
  after?: string;
};

/** Whether the fact satisfies every field the pattern sets. */
export const matchesPattern = (pattern: Trigger.FactPattern, fact: RDF.Fact, { after }: MatchOptions = {}): boolean => {
  const { assertion, attribution, factuality, illocution } = fact;
  const said = time(attribution.generatedAtTime);
  const since = pattern.after ?? after;
  if (since !== undefined && said < time(since)) {
    return false;
  }
  if (pattern.before !== undefined && said >= time(pattern.before)) {
    return false;
  }
  if (pattern.speaker !== undefined && !isSpeaker(pattern.speaker, attribution.agent)) {
    return false;
  }
  // pipeline-rdf records no illocution for a plain assertion.
  if (pattern.force !== undefined && (illocution?.force ?? 'assertive') !== pattern.force) {
    return false;
  }
  if (pattern.polarity !== undefined && factuality.polarity !== pattern.polarity) {
    return false;
  }
  if (pattern.subject !== undefined && !mentions(FactEntry.termText(assertion.subject), pattern.subject)) {
    return false;
  }
  if (pattern.about !== undefined && !mentions(`${FactEntry.factText(fact)} ${assertion.quote ?? ''}`, pattern.about)) {
    return false;
  }
  if (
    pattern.text !== undefined &&
    !(assertion.quote ?? FactEntry.factText(fact)).toLowerCase().includes(pattern.text.toLowerCase())
  ) {
    return false;
  }
  return true;
};

/** The first fact that fires the trigger: one matching its pattern, said after the trigger was set. */
export const firstMatch = (trigger: Trigger.Trigger, facts: readonly RDF.Fact[]): RDF.Fact | undefined =>
  facts.find((fact) => matchesPattern(trigger.when, fact, { after: trigger.createdAt }));
