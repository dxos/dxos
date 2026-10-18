//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { type Thread } from '@dxos/types';

/**
 * The comment-thread agent config the markdown plugin's `commentAgentMode` setting (default `mention`) gives a thread on
 * `subject`: on in the setting's mode for a Markdown document, else none (a subject of another type never opts in).
 */
export const commentAgentConfig = Effect.fnUntraced(function* (subject: Obj.Unknown) {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const [settingsAtom] = yield* Capability.getAll(MarkdownCapabilities.Settings);
  const mode =
    settingsAtom && Obj.instanceOf(Markdown.Document, subject)
      ? // Unset (settings saved before the default) is the default, `mention`; only an explicit `off` opts out.
        (registry.get(settingsAtom).commentAgentMode ?? 'mention')
      : undefined;
  const agent: Thread.Thread['agent'] = mode && mode !== 'off' ? { enabled: true, mode } : undefined;
  return agent;
});
