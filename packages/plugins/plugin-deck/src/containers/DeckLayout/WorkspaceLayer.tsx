//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { type DeckStateHook, ShownDeckState } from '#hooks';

import { Deck, type DeckRootProps } from '../Deck/index.ts';

export type WorkspaceLayerProps = Pick<DeckRootProps, 'settings' | 'pluginManager'> & {
  shown: DeckStateHook;
  live: boolean;
};

/** One workspace's deck. The one being left keeps its last state and lies over the entered one, inert. */
export const WorkspaceLayer = forwardRef<HTMLDivElement, WorkspaceLayerProps>(
  ({ shown, live, settings, pluginManager }, forwardedRef) => (
    <ShownDeckState.Provider value={live ? undefined : shown}>
      <Deck.Root
        settings={settings}
        pluginManager={pluginManager}
        deck={shown.deck}
        state={shown.state}
        updateState={shown.updateState}
      >
        <div ref={forwardedRef} className='contents' inert={!live}>
          {/* Each deck keeps a compositing layer of its own, and the one leaving is never quite opaque: WebKit leaves a
              layer it cannot see unpainted, so the entered deck would show blank as the other fades. */}
          <Deck.Viewport classNames={['will-change-[opacity]', !live && 'z-1! pointer-events-none opacity-[0.99]']}>
            {shown.deck.active.length === 0 ? <Deck.ContentEmpty /> : <Deck.Planks />}
          </Deck.Viewport>
        </div>
      </Deck.Root>
    </ShownDeckState.Provider>
  ),
);

WorkspaceLayer.displayName = 'WorkspaceLayer';
