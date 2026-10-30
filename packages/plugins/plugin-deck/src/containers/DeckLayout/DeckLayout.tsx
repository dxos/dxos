//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, useEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { Dnd } from '@dxos/react-ui-dnd';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { type DeckStateHook, ShownDeckState, useDeckState } from '#hooks';
import { DeckCapabilities, DeckSchema } from '#types';

import { Deck, type DeckRootProps } from '../Deck/index.ts';
import { Dialog, PopoverContent, PopoverRoot, Toaster, type ToasterProps } from '../Overlays/index.ts';
import { ActiveNode } from './ActiveNode.tsx';

/** The entered workspace counts as rendered once its deck has gone this long without a DOM change, */
const QUIET_MS = 80;

/** or after this, whatever is still loading. */
const MAX_HOLD_MS = 700;

const CROSSFADE_MS = 200;

const CROSSFADE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

const crossfades = (): boolean =>
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !UiHooks.animationsDisabled();

const ignore = () => {};

type WorkspaceLayerProps = Pick<DeckRootProps, 'settings' | 'pluginManager'> & {
  shown: DeckStateHook;
  live: boolean;
};

/** One workspace's deck. The one being left keeps its last state and lies over the entered one, inert. */
const WorkspaceLayer = forwardRef<HTMLDivElement, WorkspaceLayerProps>(
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

/**
 * The workspaces to render: the live one, and during a switch the one being left, which stays mounted over the entered
 * one until that has rendered and then fades out over it. Both are live DOM: WebKit's view transitions paint nothing but
 * their snapshots while they run, and its entering snapshot is a still taken before the switch renders.
 */
const useWorkspaceCrossfade = (live: DeckStateHook) => {
  const current = live.state.activeDeck;
  const shown = useRef(new Map<string, DeckStateHook>());
  const layers = useRef(new Map<string, HTMLDivElement>());
  const [previous, setPrevious] = useState(current);
  const [leaving, setLeaving] = useState<string>();
  if (previous !== current) {
    setPrevious(current);
    setLeaving(previous !== DeckSchema.DEFAULT_DECK_ID && crossfades() ? previous : undefined);
  }
  // Kept for when this workspace is the one left, which only shows its state: a write from it would land in the next.
  shown.current.set(current, { ...live, updateState: ignore, updateEphemeral: ignore });

  useEffect(() => {
    for (const map of [shown.current, layers.current]) {
      for (const id of map.keys()) {
        if (id !== current && id !== leaving) {
          map.delete(id);
        }
      }
    }
    const element = leaving && layers.current.get(leaving)?.firstElementChild;
    const entering = layers.current.get(current);
    if (!leaving) {
      return;
    }
    if (!(element instanceof HTMLElement) || !entering) {
      setLeaving(undefined);
      return;
    }

    let quiet: ReturnType<typeof setTimeout> | undefined;
    let cap: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let animation: Animation | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(reveal, QUIET_MS);
    });
    // Started on a frame, so the compositor runs it however busy the main thread gets.
    const reveal = () => {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(cap);
      frame = requestAnimationFrame(() => {
        animation = element.animate([{ opacity: 0.99 }, { opacity: 0 }], {
          duration: CROSSFADE_MS,
          easing: CROSSFADE_EASING,
          fill: 'forwards',
        });
        animation.finished.then(
          () => setLeaving((id) => (id === leaving ? undefined : id)),
          () => {},
        );
      });
    };
    observer.observe(entering, { childList: true, subtree: true, characterData: true });
    cap = setTimeout(reveal, MAX_HOLD_MS);
    return () => {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(cap);
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      animation?.cancel();
    };
  }, [leaving, current]);

  const ids = leaving && leaving !== current ? [leaving, current] : [current];
  return ids.map((id) => ({
    id,
    shown: id === current ? live : (shown.current.get(id) ?? live),
    live: id === current,
    ref: (element: HTMLDivElement | null) => {
      if (element) {
        layers.current.set(id, element);
      }
    },
  }));
};

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const settings = Hooks.useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = PluginManagerProvider.usePluginManager();
  const live = useDeckState();
  const { deck, state, updateState } = live;
  const { toasts } = state;
  const layers = useWorkspaceCrossfade(live);

  return (
    <Dnd.Root>
      <PopoverRoot>
        <ActiveNode />
        <Deck.Root
          settings={settings}
          pluginManager={pluginManager}
          deck={deck}
          state={state}
          updateState={updateState}
        >
          <Deck.Content>
            {layers.map(({ id, shown, live, ref }) => (
              <WorkspaceLayer
                key={id}
                ref={ref}
                shown={shown}
                live={live}
                settings={settings}
                pluginManager={pluginManager}
              />
            ))}
          </Deck.Content>
        </Deck.Root>
        <PopoverContent />
        <Dialog />
        <Toaster toasts={toasts} onDismissToast={onDismissToast} />
      </PopoverRoot>
    </Dnd.Root>
  );
};

DeckLayout.displayName = 'DeckLayout';
