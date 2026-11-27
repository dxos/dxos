//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Obj, Relation } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { DraftMessage } from '@dxos/types';

import { Contract, Responder } from '../contracts/index.ts';
import { type SupportCapabilities } from '../plugins/index.ts';
import { Cites, type Support } from '../types/index.ts';
import { type DecideOptions, decide } from './confidence.ts';

/** Reply subject: prefixed once, never stacking `Re:`. */
export const replySubject = (subject: string): string =>
  /^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim()}`;

/** The reply's text: the passage relied on, then the document and section it came from. */
export const replyBody = (name: string | undefined, citation: Support.Citation): string =>
  [
    `Hi ${name?.split(' ')[0] ?? 'there'},`,
    citation.quote,
    `Source: [${citation.title}: ${citation.heading}](${citation.document})`,
  ].join('\n\n');

/**
 * Answers a question when a passage covers it (see `decide`): writes a draft reply that quotes the passage and a
 * `Cites` relation to its document. Writes nothing when the question is left for a person.
 */
export const makeResponder = (
  { db }: SupportCapabilities.Host,
  options: DecideOptions = {},
): Responder.Implementation => ({
  respond: ({ mailbox, message, question, evidence }) =>
    Effect.gen(function* () {
      const decision = decide({ kind: 'question', evidence }, options);
      if (decision.kind === 'task') {
        return { decision };
      }

      const [citation] = decision.citations;
      const documents = yield* Effect.tryPromise({
        try: () => db.query(Filter.type(Markdown.Document)).run(),
        catch: (cause) =>
          new Contract.ProcessorError({
            message: 'Could not find the cited document.',
            cause,
            context: { contract: Responder.Responder.key, method: 'respond' },
          }),
      });
      const draft = db.add(
        DraftMessage.make({
          created: message.created,
          sender: { role: 'assistant', name: 'Support' },
          parentMessage: message.id,
          threadId: message.threadId ?? message.id,
          blocks: [{ _tag: 'text', text: replyBody(message.sender.name, citation) }],
          properties: {
            mailbox,
            to: message.sender.email,
            subject: replySubject(message.subject),
            question,
          },
        }),
      );
      const cited = documents.find((document) => Obj.getURI(document) === citation.document);
      if (cited) {
        db.add(
          Cites.make({
            [Relation.Source]: draft,
            [Relation.Target]: cited,
            heading: citation.heading,
            quote: citation.quote,
          }),
        );
      }
      return { decision, draft: Obj.getURI(draft) };
    }),
});
