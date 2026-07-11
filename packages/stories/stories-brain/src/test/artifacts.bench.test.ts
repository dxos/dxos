//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { type AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { buildThreads, clusterThreads, materializeTopics, summarizeTopics } from '@dxos/pipeline-email';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import {
  ALL_VARIANTS,
  FACT_STORE_FIXTURE,
  type ModelVariant,
  buildSubjectIndex,
  draftReply,
  factStoreFixtureExists,
  fixtureExists,
  generateText,
  loadFacts,
  loadFixtureMessages,
  trackProgress,
  writeResponses,
} from '../testing/harness';
import {
  ARTIFACT_BEST_OPEN,
  ARTIFACT_DRAFTS,
  ARTIFACT_MODEL,
  ARTIFACT_N,
  ARTIFACT_OWNER,
  ARTIFACT_OWNER_EMAIL,
  ARTIFACT_PROFILES,
} from './defs';

// Qualitative artifacts for the overnight report — the outputs to eyeball, not graded scores:
//   topics.md        — the mailbox's topics, each summarized, with its threads.
//   profiles.md      — contact profiles built from the FULL fact store (facts as accumulated memory).
//   drafts-sample.md — sample reply drafts, the bar (haiku) beside the best open-weight model.
// Produced by a single canonical model over a wider corpus slice so they aren't thin.

const runWith = <Value>(
  variant: ModelVariant,
  effect: Effect.Effect<Value, never, AiService.AiService>,
): Promise<Value> => EffectEx.runPromise(effect.pipe(Effect.provide(AiServiceTestingPreset(variant.preset))));

const variantByName = (needle: string): ModelVariant =>
  ALL_VARIANTS.find((variant) => variant.name.includes(needle)) ?? ALL_VARIANTS[0];

const senderOf = (message: Message.Message): string => message.sender.name ?? message.sender.email ?? 'unknown';

const subjectOf = (message: Message.Message): string => String(message.properties?.subject ?? '(no subject)');

/** Display label for a fact term (entity label/slug or literal). */
const termLabel = (term: RDF.Fact['assertion']['subject']): string => {
  if (term && typeof term === 'object') {
    if ('entity' in term && typeof term.entity === 'string') {
      const label = (term as { label?: unknown }).label;
      return typeof label === 'string' ? label : term.entity;
    }
    if ('value' in term && (term as { value?: unknown }).value != null) {
      return String((term as { value: unknown }).value);
    }
  }
  return '';
};

const titleCase = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');

/** Top entities by mention count (subject + object), excluding owner/self slugs. */
const topEntities = (facts: readonly RDF.Fact[], exclude: readonly string[], limit: number) => {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const fact of facts) {
    for (const term of [fact.assertion.subject, fact.assertion.object]) {
      if (term && typeof term === 'object' && 'entity' in term && typeof term.entity === 'string') {
        counts.set(term.entity, (counts.get(term.entity) ?? 0) + 1);
        const label = termLabel(term);
        if (label) {
          labels.set(term.entity, label);
        }
      }
    }
  }
  return [...counts.entries()]
    .filter(([slug]) => !exclude.includes(slug))
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([slug, count]) => ({ slug, display: labels.get(slug) ?? titleCase(slug), count }));
};

describe.skipIf(!fixtureExists())('overnight artifacts (topics / profiles / sample drafts)', () => {
  test(
    'generate topics, profiles, and sample drafts',
    async ({ expect }) => {
      const model = variantByName(ARTIFACT_MODEL);
      const bestOpen = variantByName(ARTIFACT_BEST_OPEN);
      const messages = loadFixtureMessages().slice(0, ARTIFACT_N);
      log.info('artifacts', {
        model: model.name,
        bestOpen: bestOpen.name,
        messages: messages.length,
      });

      // --- Topics: the canonical corpus pipeline — deterministic thread clustering (subject-token
      // Jaccard + shared participants), LLM-enriched per-topic summaries, materialized as `Topic`
      // ECHO objects. Reuses @dxos/pipeline-email rather than ad-hoc LLM clustering. ---
      {
        const threads = buildThreads(messages, { ownerEmail: ARTIFACT_OWNER_EMAIL, now: new Date().toISOString() });
        const drafts = clusterThreads(threads);
        const progress = trackProgress('artifacts:topics', drafts.length);
        // The corpus algorithm's LLM boundary: a plain async closure over the artifact model.
        const summarizer = (prompt: string): Promise<string> =>
          runWith(model, generateText(model.model, model.provider, prompt, '300 seconds'));
        const enriched = await summarizeTopics(drafts, summarizer);
        progress.advance(drafts.length);
        progress.done();
        const topics = materializeTopics(enriched);
        const subjectById = new Map(threads.map((thread) => [thread.threadId, thread.subject]));
        const sections = [...topics]
          .sort((left, right) => right.threadIds.length - left.threadIds.length)
          .map((topic) => ({
            title: `${topic.label} (${topic.threadIds.length} threads)`,
            body:
              `${topic.summary.trim()}\n\n` +
              `**Keywords:** ${topic.keywords.join(', ') || '—'}\n` +
              `**Participants:** ${topic.participants.join(', ') || '—'}\n\n` +
              `**Threads:**\n${topic.threadIds.map((id) => `- ${subjectById.get(id) ?? id}`).join('\n')}`,
          }));
        writeResponses('topics', sections.length ? sections : [{ title: 'topics', body: '_(no topics produced)_' }]);
        log.info('topics', { threads: threads.length, topics: topics.length });
      }

      // --- Profiles: built from the FULL fact store (facts as accumulated memory of a person). ---
      if (factStoreFixtureExists()) {
        const facts = loadFacts(FACT_STORE_FIXTURE);
        const index = buildSubjectIndex(facts, messages);
        const subjects = topEntities(facts, ARTIFACT_OWNER, ARTIFACT_PROFILES);
        const progress = trackProgress('artifacts:profiles', subjects.length);
        const sections: { title: string; body: string }[] = [];
        for (const subject of subjects) {
          const retrieval = index.retrieve(subject.slug, 300);
          const factLines = retrieval.facts
            .map((fact) => `- ${fact.subject} ${fact.predicate} ${fact.object}`)
            .join('\n');
          const prompt =
            `Write a concise profile of ${subject.display} using ONLY the extracted facts below (a mailbox's ` +
            'accumulated memory of this person). Cover: who they are, what they work on, the topics discussed, ' +
            'and the state of the relationship / any open items. 1–2 short paragraphs, no preamble.\n\n' +
            `FACTS:\n${factLines}`;
          const profile = await runWith(model, generateText(model.model, model.provider, prompt, '300 seconds'));
          sections.push({ title: `${subject.display} (${retrieval.factCount} facts)`, body: profile.trim() });
          progress.advance();
        }
        progress.done();
        writeResponses('profiles', sections.length ? sections : [{ title: 'profiles', body: '_(no profiles)_' }]);
        log.info('profiles', { subjects: subjects.map((subject) => subject.slug) });
      } else {
        log.warn('profiles skipped — no fact store fixture');
      }

      // --- Sample drafts: the bar (haiku) beside the best open-weight model, on replyable messages. ---
      {
        const progress = trackProgress('artifacts:drafts', ARTIFACT_DRAFTS);
        const sections: { title: string; body: string }[] = [];
        for (const message of messages) {
          if (sections.length >= ARTIFACT_DRAFTS) {
            break;
          }
          const barDraft = await runWith(model, draftReply(message, model));
          if (barDraft.skipped) {
            continue; // Bulk/no-reply mail — correctly not drafted.
          }
          const openDraft = await runWith(bestOpen, draftReply(message, bestOpen));
          const excerpt = Message.extractText(message).slice(0, 600).trim();
          sections.push({
            title: `${sections.length + 1}. ${subjectOf(message)}`,
            body:
              `**From ${senderOf(message)}:**\n\n${excerpt}\n\n` +
              `**Reply — ${model.name} (bar):**\n\n${barDraft.draft}\n\n` +
              `**Reply — ${bestOpen.name} (best open):**\n\n${openDraft.draft}`,
          });
          progress.advance();
        }
        progress.done();
        writeResponses(
          'drafts-sample',
          sections.length ? sections : [{ title: 'drafts', body: '_(no replyable messages)_' }],
        );
        log.info('drafts-sample', { drafts: sections.length });
      }

      expect(true).toBe(true);
    },
    6 * 60 * 60_000,
  );
});
