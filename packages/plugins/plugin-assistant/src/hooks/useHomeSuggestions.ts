//
// Copyright 2026 DXOS.org
//

import { useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space } from '@dxos/react-client/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

const FALLBACK_SUGGESTION_KEYS = [
  'space-home.suggestion-magazine.label',
  'space-home.suggestion-kanban.label',
] as const;

/**
 * Returns starter prompts for the space Home page: the space's cached prompts at once, then the
 * operation's answer once it settles (generated prompts, or the hardcoded defaults on an empty result
 * or error). Undefined while nothing is cached and the request is in flight.
 */
export const useHomeSuggestions = (space?: Space): readonly string[] | undefined => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const cache = Hooks.useOptionalAtomCapability(AssistantCapabilities.HomeSuggestionsCache);
  const fallbacks = useMemo(() => FALLBACK_SUGGESTION_KEYS.map((key) => t(key)), [t]);
  const [settled, setSettled] = useState<{ spaceId: string; prompts: readonly string[] }>();

  UiHooks.useAsyncEffect(
    async (controller) => {
      if (!space) {
        return;
      }
      const spaceId = space.db.spaceId;
      const result = await invokePromise(AssistantOperation.GenerateHomeSuggestions, {}, { spaceId });
      if (controller.signal.aborted) {
        return;
      }
      const prompts = result.data?.prompts;
      setSettled({ spaceId, prompts: prompts && prompts.length > 0 ? prompts : fallbacks });
    },
    [space, invokePromise],
  );

  const spaceId = space?.db.spaceId;
  if (!spaceId) {
    return undefined;
  }
  return settled?.spaceId === spaceId ? settled.prompts : cache?.[spaceId]?.prompts;
};
