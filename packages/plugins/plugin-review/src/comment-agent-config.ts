//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type Thread } from '@dxos/types';

import { CommentCapabilities } from '#types';

/**
 * The comment-thread agent config the `commentAgentMode` setting (default `mention`) gives a new thread on any subject.
 */
export const commentAgentConfig = Effect.fnUntraced(function* () {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const [settingsAtom] = yield* Capability.getAll(CommentCapabilities.Settings);
  // Unset (settings saved before the default) is the default, `mention`; only an explicit `off` opts out.
  const mode = (settingsAtom && registry.get(settingsAtom).commentAgentMode) ?? 'mention';
  const agent: Thread.Thread['agent'] = mode !== 'off' ? { enabled: true, mode } : undefined;
  return agent;
});
