//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

const FALLBACK_SUGGESTION_KEYS = [
  'space-home.suggestion-draft-doc.label',
  'space-home.suggestion-data-type.label',
  'space-home.suggestion-ideas.label',
] as const;

/**
 * Returns starter prompts for the space Home page. Returns undefined while the request is in flight
 * so the section stays hidden until settled. On success yields generated prompts; on empty result or
 * error falls back to the hardcoded defaults.
 */
export const useHomeSuggestions = (space?: Space): readonly string[] | undefined => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const fallbacks = useMemo(() => FALLBACK_SUGGESTION_KEYS.map((key) => t(key)), [t]);
  const [suggestions, setSuggestions] = useState<readonly string[] | undefined>(undefined);

  useEffect(() => {
    setSuggestions(undefined);
    if (!space) {
      return;
    }
    let cancelled = false;
    void invokePromise(
      AssistantOperation.GenerateHomeSuggestions,
      { db: space.db },
      { spaceId: space.db.spaceId },
    ).then((result) => {
      if (cancelled) {
        return;
      }
      const prompts = result.data?.prompts;
      setSuggestions(prompts && prompts.length > 0 ? prompts : fallbacks);
    });
    return () => {
      cancelled = true;
    };
  }, [space, invokePromise]);

  return suggestions;
};
