//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as HomeSection from '@dxos/app-toolkit/HomeSection';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';
import { type Space } from '@dxos/react-client/echo';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';

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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
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
      <Layout.Container gap='lg' gutter='none'>
        {suggestions.map((prompt, index) => (
          // A real button, not a `role='button'` div: WKWebView only reliably synthesizes a tap into
          // a click for natively interactive elements, and the iOS walkthrough could not launch a
          // chat from these cards at all. It also rules the nested `IconButton` out — interactive
          // content inside a button is invalid — so the sparkle is a plain icon.
          <button
            key={`${index}:${prompt}`}
            type='button'
            className='cursor-pointer w-full text-start'
            onClick={() => handleRunPrompt(prompt)}
          >
            <Card.Root>
              <Card.Header>
                <Layout.Block>
                  <Icon.Icon icon='ph--sparkle--regular' />
                </Layout.Block>
                <Card.Title>{prompt}</Card.Title>
              </Card.Header>
            </Card.Root>
          </button>
        ))}
      </Layout.Container>
    </HomeSection.Root>
  );
};

SpaceHomeSuggestions.displayName = 'SpaceHomeSuggestions';
