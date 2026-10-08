//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { DEFAULT_MODEL, type RDF } from '@dxos/pipeline-rdf';

import { FactEntry } from '#types';

import { RELAY_RULES } from '../skills/relay-rules.ts';

/** The prompt's first words, so a scripted model can tell compose calls apart. */
export const COMPOSE_PROMPT = 'Compose an update for';

export type ComposeUpdateProps = {
  agentName: string;
  recipientName: string;
  /** What the recipient asked for, in their words. */
  request: string;
  /** The facts that fired the watch. */
  facts: readonly RDF.Fact[];
  /** The conversation the facts came from, oldest first. */
  transcript?: string;
  /** The templated message, sent instead when composing fails. */
  hint: string;
};

const factLine = (fact: RDF.Fact): string => {
  const quote = fact.assertion.quote ? ` — "${fact.assertion.quote}"` : '';
  const speaker = fact.attribution.agentLabel ? ` (said by ${fact.attribution.agentLabel})` : '';
  return `- ${FactEntry.factText(fact)}${quote}${speaker}`;
};

/** The prompt for one update; exported so tests can assert what the model is told. */
export const composePrompt = ({ agentName, recipientName, request, facts, transcript, hint }: ComposeUpdateProps) =>
  [
    `${COMPOSE_PROMPT} ${recipientName}. You are ${agentName}, passing on something said in a conversation ${recipientName} was not part of.`,
    '',
    'Rules:',
    RELAY_RULES,
    '',
    `${recipientName} asked: ${request}`,
    ...(transcript ? ['', 'The conversation where it was said (oldest first):', transcript] : []),
    '',
    'What changed:',
    ...facts.map(factLine),
    '',
    `A draft that only repeats the words (rewrite it so it stands alone): ${hint}`,
    '',
    `Write the message to ${recipientName}. Reply with the message only.`,
  ].join('\n');

/**
 * Writes a watch's update with the model, so it answers the recipient's request in words that stand
 * alone; any failure, or an empty reply, sends the templated hint instead.
 */
export const composeUpdate = (props: ComposeUpdateProps): Effect.Effect<string, never, AiService.AiService> =>
  LanguageModel.generateText({ prompt: composePrompt(props) }).pipe(
    Effect.map((response) => response.text.trim()),
    Effect.map((text) => (text.length > 0 ? text : props.hint)),
    Effect.provide(AiService.languageModel(DEFAULT_MODEL).pipe(Layer.orDie)),
    Effect.catchCause(() => Effect.succeed(props.hint)),
  );
