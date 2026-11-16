//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Obj } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

export {
  type Init,
  type InitProps,
  type DecoratorsInput as Input,
  type Options,
  type View,
  type Views,
  decorators,
} from './internal/harness.tsx';
export { addToRootCollection } from './internal/objects.ts';
export { resolveStorySpace as resolveSpace } from './internal/story-space.ts';

/**
 * Access tokens from `VITE_`-prefixed environment values, keyed by token source; empty values are skipped.
 * @example accessTokensFromEnv({ 'exa.ai': import.meta.env.VITE_EXA_API_KEY })
 */
export const accessTokensFromEnv = (tokens: Record<string, string | undefined>) =>
  Object.entries(tokens).flatMap(([source, token]) =>
    token ? [Obj.make(AccessToken.AccessToken, { source, token })] : [],
  );
