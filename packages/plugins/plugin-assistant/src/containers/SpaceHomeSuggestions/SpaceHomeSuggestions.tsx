//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { RoutineOperation } from '@dxos/plugin-routine/types';
import { type Space } from '@dxos/react-client/echo';
import { Card, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

/** Starter prompts shown on the Home page. Always rendered — they surface quick actions alongside
 * the recent-objects masonry rather than only as an empty-state fallback. */
const SUGGESTION_KEYS = [
  'space-home.suggestion-draft-doc.label',
  'space-home.suggestion-data-type.label',
  'space-home.suggestion-ideas.label',
] as const;

type SpaceScopedProps = {
  space?: Space;
};

/**
 * Home content contributor: starter-prompt cards. Each card runs its prompt in a new chat via the
 * assistant operation. Always renders (below the recent-objects masonry) so the Home page offers
 * quick entry points regardless of whether recent objects exist.
 */
export const SpaceHomeSuggestions = ({ space }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const handleRunPrompt = useCallback(
    (prompt: string) => {
      if (!space) {
        return;
      }
      void invokePromise(RoutineOperation.RunPromptInNewChat, { db: space.db, instructions: prompt });
    },
    [invokePromise, space],
  );

  return (
    <>
      <h2 className='text-sm font-medium text-description'>{t('space-home.suggestions.heading')}</h2>
      {SUGGESTION_KEYS.map((key) => {
        const prompt = t(key);
        return (
          <Card.Root
            key={key}
            fullWidth
            role='button'
            classNames='cursor-pointer'
            onClick={() => handleRunPrompt(prompt)}
          >
            <Card.Header>
              <Card.Block>
                <IconButton variant='ghost' label={prompt} icon='ph--sparkle--regular' iconOnly />
              </Card.Block>
              <Card.Title>{prompt}</Card.Title>
            </Card.Header>
          </Card.Root>
        );
      })}
    </>
  );
};
