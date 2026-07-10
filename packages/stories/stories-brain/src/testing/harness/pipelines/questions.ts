//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText, parseJsonArray } from '../llm';
import { type ModelVariant } from '../models';

/** How the sender's utterance addresses the recipient — mapped to a pipeline-rdf {@link Illocution}. */
export type SpeechActKind = 'question' | 'request' | 'notification';

export type SpeechAct = {
  readonly text: string;
  readonly kind: SpeechActKind;
  readonly force: RDF.IllocutionaryForce;
  readonly mood: NonNullable<RDF.Illocution['mood']>;
};

export type QuestionResult = {
  readonly messageId: string;
  readonly subject: string;
  readonly items: SpeechAct[];
};

// A question asks for information, a request asks for an action, a notification just informs —
// the three map onto illocutionary force × mood (see pipeline-rdf `Illocution`).
const ILLOCUTION: Record<SpeechActKind, Pick<SpeechAct, 'force' | 'mood'>> = {
  question: { force: 'directive', mood: 'interrogative' },
  request: { force: 'directive', mood: 'imperative' },
  notification: { force: 'assertive', mood: 'declarative' },
};

const isKind = (value: unknown): value is SpeechActKind =>
  value === 'question' || value === 'request' || value === 'notification';

const PROMPT = trim`
  Classify each thing the sender is communicating TO THE RECIPIENT in the email below as one of:
  - "question": asks the recipient for information (expects an answer).
  - "request": asks the recipient to do something (expects an action).
  - "notification": informs the recipient of something (no response expected).
  Rephrase each as a short standalone sentence. Ignore rhetorical questions, pleasantries, and
  automated/marketing calls-to-action. If there is nothing substantive, return an empty array.
  Respond with ONLY a JSON array of objects: [{ "text": string, "kind": "question"|"request"|"notification" }].
`;

/**
 * Classifies the sender's communicative acts in a single message into questions / requests /
 * notifications, tagging each with the corresponding illocutionary force + mood so the result maps
 * directly onto a pipeline-rdf {@link Illocution}. Grouped by message.
 */
export const extractQuestions = (
  message: Message.Message,
  variant: ModelVariant,
): Effect.Effect<QuestionResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const raw = yield* generateText(variant.model, variant.provider, `${PROMPT}\n\n${Message.extractText(message)}`);
    const items = parseJsonArray<Record<string, unknown>>(raw)
      .map((entry): SpeechAct | undefined => {
        const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
        const kind = entry?.kind;
        if (text.length === 0 || !isKind(kind)) {
          return undefined;
        }
        return { text, kind, ...ILLOCUTION[kind] };
      })
      .filter((item): item is SpeechAct => item !== undefined);
    return {
      messageId: String(message.properties?.messageId ?? message.id),
      subject: String(message.properties?.subject ?? ''),
      items,
    };
  });
