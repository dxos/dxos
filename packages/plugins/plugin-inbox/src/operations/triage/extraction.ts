//
// Copyright 2026 DXOS.org
//

import { ExtractionModel, Model } from '@dxos/ai';
import { type DXN } from '@dxos/keys';
import { type Message } from '@dxos/types';

/** The extraction model tasks are read with: Cloudflare's Clairic. */
export const EXTRACTION_MODEL: DXN.DXN = Model.cloudflareClairic.id;

/**
 * Confidence the first extracted task must reach. Clairic reports low confidence for a long span even
 * when the request is unambiguous, and only mail that asks for a reply is read at all.
 */
export const MIN_TASK_CONFIDENCE = 0.15;

/**
 * Confidence each further task must reach: later slots are where Clairic picks up what the sender will
 * do themselves ("get the paperwork signed"), so they need to be clear-cut.
 */
export const MIN_EXTRA_TASK_CONFIDENCE = 0.6;

/**
 * One text field per action item rather than a single list: a Clairic list answers with short spans
 * ("send", "the signed renewal"), while a text field answers with the whole request.
 */
export const TaskFields = {
  task_1: { type: 'text', instructions: 'The first thing the sender asks the recipient to do' },
  task_2: { type: 'text', instructions: 'The second, different thing the sender asks the recipient to do, if any' },
  task_3: { type: 'text', instructions: 'The third, different thing the sender asks the recipient to do, if any' },
  due: { type: 'date', instructions: 'When the first requested action is due' },
} as const satisfies ExtractionModel.Fields;

const TASK_SLOTS = ['task_1', 'task_2', 'task_3'] as const;

/** Body characters read; enough for any request an email makes, well inside Clairic's context. */
const BODY_LIMIT = 4_000;

/** What Clairic reads: the headers a person would, then the body. */
export const extractionState = (message: Message.Message): string => {
  const from = message.sender?.name ?? message.sender?.email ?? 'unknown';
  const subject = message.properties?.subject ?? '(no subject)';
  const body = message.blocks
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join('\n')
    .slice(0, BODY_LIMIT);
  return `From: ${from}\nSubject: ${subject}\n\n${body}`;
};

export type ExtractedTask = { readonly title: string; readonly due?: string };

/** A request span as a task title: first letter up, trailing punctuation off. */
export const toTitle = (span: string): string => {
  const trimmed = span.trim().replace(/[\s.,;:!?]+$/, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/** The confident, distinct action items in a set of answers, in the order the email asks them. */
export const toTasks = (answers: ExtractionModel.Answers<typeof TaskFields>): ExtractedTask[] => {
  const due = answers.due.value ?? undefined;
  const titles = new Set<string>();
  const tasks: ExtractedTask[] = [];
  for (const slot of TASK_SLOTS) {
    const answer = answers[slot];
    const value = answer.value;
    const threshold = slot === 'task_1' ? MIN_TASK_CONFIDENCE : MIN_EXTRA_TASK_CONFIDENCE;
    if (!value || (answer.confidence ?? 0) < threshold) {
      continue;
    }
    const title = toTitle(value);
    if (title.length === 0 || titles.has(title.toLowerCase())) {
      continue;
    }
    titles.add(title.toLowerCase());
    // The due date is the first request's, so only the first task carries it.
    tasks.push(tasks.length === 0 && due ? { title, due } : { title });
  }
  return tasks;
};
