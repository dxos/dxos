//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { asStringArray, generateText, parseJsonObject } from '../llm';
import { type ModelVariant } from '../models';
import { type SummarizeOptions, type SummaryKind, summaryKindFor } from './summarize';

// Single per-message LLM pass (REPORT §5): the per-message enrichment stages — tag, summarize, and
// salient-fact extraction — were three separate model calls that each re-read the message. Fold them
// into ONE prompt so the model reads the message once, cutting both latency and token cost. Triage-
// aware: person mail asks for a full summary, org / bulk mail for a one-line label (see summarize.ts).
// (This is the enrichment fold; the structured RDF fact pipeline in pipeline-rdf stays separate.)

export type EnrichResult = {
  readonly tags: string[];
  readonly spam: boolean;
  /** A full bullet summary (person mail) or a one-line category label (org / bulk mail). */
  readonly summary: string;
  readonly summaryKind: SummaryKind;
  /** Concrete standalone facts stated in the message (dates, amounts, commitments); may be empty. */
  readonly facts: string[];
};

/** Builds the combined prompt; the summary instruction switches on the triage `kind`. */
export const buildEnrichPrompt = (kind: SummaryKind): string =>
  trim`
    Analyze the email below and respond with ONLY a JSON object of the form
    {"tags": string[], "spam": boolean, "summary": string, "facts": string[]}.
    - tags: 1-5 short, lowercase, single-word topic tags (e.g. "invoice", "newsletter", "personal").
    - spam: true if the email is spam or a cold marketing blast; then also include the tag "spam".
    - summary: ${
      kind === 'label'
        ? 'ONE short line (< 10 words) — what kind of automated/organizational mail this is and who it is from (e.g. "Invoice from Acme").'
        : 'a terse markdown bullet list (1-3 bullets); start each bullet with a verb or the sender name, never "The email".'
    }
    - facts: 0-6 concrete standalone facts asserted in the email (dates, amounts, commitments, names); [] if none.
  `;

/**
 * Parses the combined enrichment response leniently (local models wrap JSON in prose / fences). Spam
 * is inferred from either the `spam` flag or a "spam" tag, mirroring `classifyTags`; the `summaryKind`
 * is carried through from the triage decision so callers know whether they got a summary or a label.
 */
export const parseEnrichResponse = (raw: string, kind: SummaryKind): EnrichResult => {
  const parsed = parseJsonObject<{ tags?: unknown; spam?: unknown; summary?: unknown; facts?: unknown }>(raw, {});
  const tags = asStringArray(parsed.tags).map((tag) => tag.toLowerCase());
  const spam = parsed.spam === true || tags.includes('spam');
  return {
    tags: spam && !tags.includes('spam') ? [...tags, 'spam'] : tags,
    spam,
    summary: String(parsed.summary ?? '').trim(),
    summaryKind: kind,
    facts: asStringArray(parsed.facts),
  };
};

/**
 * Enriches a message in a single model call: tags + spam + a triage-appropriate summary/label +
 * salient facts. Replaces the three separate `classifyTags` / `summarizeTriaged` / fact passes for
 * the per-message foreground/background enrichment path.
 */
export const enrichMessage = (
  message: Message.Message,
  variant: ModelVariant,
  options: SummarizeOptions = {},
): Effect.Effect<EnrichResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const kind = summaryKindFor(message, options);
    const subject = String(message.properties?.subject ?? '');
    const raw = yield* generateText(
      variant.model,
      variant.provider,
      `${buildEnrichPrompt(kind)}\n\nSubject: ${subject}\n\n${Message.extractText(message)}`,
    );
    return parseEnrichResponse(raw, kind);
  });
