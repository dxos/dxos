//
// Copyright 2026 DXOS.org
//

import { useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

const FALLBACK_SUGGESTION_KEYS = [
  'space-home.magazine-suggestion.label',
  'space-home.spreadsheet-suggestion.label',
  'space-home.kanban.label',
] as const;

/**
 * Returns starter prompts for the space Home page. Returns undefined while the request is in flight
 * so the section stays hidden until settled. On success yields generated prompts; on empty result or
 * error falls back to the hardcoded defaults.
 */
export const useHomeSuggestions = (space?: Space): readonly string[] | undefined => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const fallbacks = useMemo(() => FALLBACK_SUGGESTION_KEYS.map((key) => t(key, { year: new Date().getFullYear() })), [t]);
  const [suggestions, setSuggestions] = useState<readonly string[] | undefined>(undefined);

  useAsyncEffect(
    async (controller) => {
      setSuggestions(undefined);
      if (!space) {
        return;
      }
      const result = await invokePromise(
        AssistantOperation.GenerateHomeSuggestions,
        { db: space.db },
        { spaceId: space.db.spaceId },
      );
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
