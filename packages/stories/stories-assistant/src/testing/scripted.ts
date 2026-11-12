//
// Copyright 2026 DXOS.org
//

import { ScriptedLanguageModel, ScriptedScene } from '@dxos/ai/testing';

/** A line the runtime writes about other threads or an earlier tool call; never the request itself. */
const isRuntimeNote = (value: string) =>
  /^Thread \S+ .* is (running|done)/.test(value) || value.startsWith('[Result of the earlier');

/**
 * The prompt a thread answers: the last text of the last user message that is neither a runtime status line nor a
 * snapshot of another thread. A subagent's thread starts with its task alone, so its prompt is that task; a light
 * thread's is the prompt that opened it.
 */
export const threadPrompt = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): string => {
  for (let index = prompt.content.length - 1; index >= 0; index--) {
    const message = prompt.content[index];
    if (message.role !== 'user') {
      continue;
    }
    const parts =
      typeof message.content === 'string'
        ? [message.content]
        : message.content.flatMap((part) => (part.type === 'text' ? [part.text] : []));
    const request = parts.filter((part) => !isRuntimeNote(part) && !part.includes('<thread ')).at(-1);
    if (request !== undefined) {
      return request;
    }
  }
  return '';
};

/** The side calls Composer's harness makes outside any conversation, answered so a script need not list them. */
export const composerAsides: readonly ScriptedScene.Aside[] = [
  ScriptedScene.aside('plan-reminder', ScriptedLanguageModel.promptIncludes('Reply with exactly one word'), 'stop'),
  // Naming a chat is the one call that offers no tools.
  ScriptedScene.aside('chat-name', (request) => request.tools.length === 0, 'Scripted chat'),
];
