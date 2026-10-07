//
// Copyright 2026 DXOS.org
//

import { useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space } from '@dxos/react-client/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

const FALLBACK_SUGGESTION_KEYS = [
  'space-home.suggestion-magazine.label',
  'space-home.suggestion-kanban.label',
] as const;

/**
 * Returns starter prompts for the space Home page. Returns undefined while the request is in flight
 * so the section stays hidden until settled. On success yields generated prompts; on empty result or
 * error falls back to the hardcoded defaults.
 */
export const useHomeSuggestions = (space?: Space): readonly string[] | undefined => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const fallbacks = useMemo(() => FALLBACK_SUGGESTION_KEYS.map((key) => t(key)), [t]);
  const [suggestions, setSuggestions] = useState<readonly string[] | undefined>(undefined);

  UiHooks.useAsyncEffect(
    async (controller) => {
      setSuggestions(undefined);
      if (!space) {
        return;
      }
      const result = await invokePromise(AssistantOperation.GenerateHomeSuggestions, {}, { spaceId: space.db.spaceId });
      if (controller.signal.aborted) {
        return;
      }
      const prompts = result.data?.prompts;
      setSuggestions(prompts && prompts.length > 0 ? prompts : fallbacks);
    },
    [space, invokePromise],
  );

  return suggestions;
};
