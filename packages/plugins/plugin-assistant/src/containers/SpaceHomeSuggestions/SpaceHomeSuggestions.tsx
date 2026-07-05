//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { HomeSection, useOperationInvoker } from '@dxos/app-framework/ui';
import { RoutineOperation } from '@dxos/plugin-routine/types';
import { type Space } from '@dxos/react-client/echo';
import { Card, IconButton, useTranslation } from '@dxos/react-ui';

import { useHomeSuggestions } from '#hooks';
import { meta } from '#meta';

type SpaceScopedProps = {
  space?: Space;
  onClose?: () => void;
};

/**
 * Home content contributor: starter-prompt cards. Each card runs its prompt in a new chat via the
 * assistant operation. Always renders (below the recent-objects masonry) so the Home page offers
 * quick entry points regardless of whether recent objects exist.
 */
export const SpaceHomeSuggestions = ({ space, onClose }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const suggestions = useHomeSuggestions(space);

  const handleRunPrompt = useCallback(
    (prompt: string) => {
      if (!space) {
        return;
      }
      void invokePromise(RoutineOperation.RunPromptInNewChat, { db: space.db, instructions: prompt });
    },
    [invokePromise, space],
  );

  if (!suggestions) {
    return null;
  }

  return (
    <HomeSection.Root>
      <HomeSection.Header title={t('space-home.suggestions.heading')} onClose={onClose} />
      <div className='flex flex-col gap-3'>
        {suggestions.map((prompt, index) => (
          <div
            key={`${index}:${prompt}`}
            role='button'
            tabIndex={0}
            className='cursor-pointer w-full'
            onClick={() => handleRunPrompt(prompt)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRunPrompt(prompt);
              }
            }}
          >
            <Card.Root fullWidth>
              <Card.Header>
                <Card.Block>
                  <IconButton
                    variant='ghost'
                    label={prompt}
                    icon='ph--sparkle--regular'
                    iconOnly
                    tabIndex={-1}
                    aria-hidden
                  />
                </Card.Block>
                <Card.Title>{prompt}</Card.Title>
              </Card.Header>
            </Card.Root>
          </div>
        ))}
      </div>
    </HomeSection.Root>
  );
};
