//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter } from '@dxos/echo';
import { buildContactGraph, getIdentityIndex } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { ProjectMailboxOperation } from '#types';

import {
  findOrCreateDocumentArtifact,
  groupByThread,
  messagesAscending,
  senderMatches,
  setDocumentContent,
} from './helpers';

/** The artifact the pipeline owns; regenerated wholesale each run. */
export const INVESTOR_LOG_NAME = 'Investor Conversations';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const SUMMARY_PROMPT = trim`
  Summarize the following email conversation with an investor in 2-3 sentences for a fundraising
  log: who is involved, what was discussed or asked, and any next step. Respond with plain prose
  only — no headings, no lists.
`;

const threadDigest = (messages: readonly Message.Message[]): string => {
  const participants = [...new Set(messages.map((message) => message.sender?.email ?? 'unknown'))];
  const first = messages[0];
  const snippet = typeof first.properties?.snippet === 'string' ? first.properties.snippet.slice(0, 200) : '';
  return `${messages.length} message(s) with ${participants.join(', ')}. ${snippet}`.trim();
};

const threadText = (messages: readonly Message.Message[]): string =>
  messages
    .map((message) => {
      const body = message.blocks.find((block) => block._tag === 'text')?.text ?? '';
      return `From: ${message.sender?.email ?? '?'} (${message.created})\nSubject: ${message.properties?.subject ?? ''}\n${body.slice(0, 1_000)}`;
    })
    .join('\n\n---\n\n');

/**
 * Investor-log pipeline — the CRM project example: filters the feed to investor-domain senders,
 * extracts their contact graph (Person + Organization, idempotent through the identity index), and
 * regenerates the project's "Investor Conversations" document with one section per thread. The
 * per-thread summary is an LLM generation when `summarize` is set, a deterministic digest
 * otherwise, so the pipeline is testable offline and enrichable online.
 */
const handler = ProjectMailboxOperation.UpdateInvestorLog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, mailbox: mailboxRef, domains, summarize, model }) {
      const project = yield* Database.load(projectRef);
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const matched = messagesAscending(messages).filter((message) => senderMatches(message, domains));

      // Contact extraction for every investor sender (allow-listed explicitly by the domains input).
      const index = yield* getIdentityIndex(db, { refresh: true });
      let contacts = 0;
      const seen = new Set<string>();
      for (const message of matched) {
        const email = message.sender?.email?.toLowerCase();
        if (!email || seen.has(email)) {
          continue;
        }
        seen.add(email);
        const graph = yield* buildContactGraph({ email, name: message.sender?.name }, db, { index });
        if (graph.organization) {
          db.add(graph.organization);
        }
        if (graph.contact) {
          db.add(graph.contact);
          contacts += 1;
        }
      }

      // One section per conversation.
      const threads = groupByThread(matched);
      const sections: string[] = [];
      for (const [, thread] of threads) {
        const subject =
          typeof thread[0].properties?.subject === 'string' ? thread[0].properties.subject : '(no subject)';
        const summary = summarize
          ? yield* LanguageModel.generateText({ prompt: `${SUMMARY_PROMPT}\n\n${threadText(thread)}` }).pipe(
              Effect.map((response) => response.text.trim()),
              Effect.provide(AiService.model(model ?? DEFAULT_MODEL).pipe(Layer.orDie)),
              // Summaries are advisory: a failed generation degrades to the digest, never the run.
              Effect.orElseSucceed(() => threadDigest(thread)),
            )
          : threadDigest(thread);
        sections.push(`## ${subject}\n\n${summary}`);
      }

      const document = yield* findOrCreateDocumentArtifact(project, INVESTOR_LOG_NAME);
      const content = [`# ${INVESTOR_LOG_NAME}`, '', ...sections, ''].join('\n');
      yield* setDocumentContent(document, content);

      yield* Effect.promise(() => db.flush());
      log.info('investor-log: done', {
        project: project.name,
        scanned: messages.length,
        matched: matched.length,
        threads: threads.size,
        contacts,
      });
      return { scanned: messages.length, matched: matched.length, threads: threads.size, contacts };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
