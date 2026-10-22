//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Util from '@dxos/react-ui/Util';

import { type SlideSource } from '#deck';
import { meta } from '#meta';
import { SlideViewState } from '#types';

import { PageNumber, Pager } from '../Pager/index.ts';
import { PresentationShell } from '../PresentationShell/index.ts';
import { SlideRenderer } from '../SlideRenderer/index.ts';

/** Time without pointer movement before the fullscreen pager hides (ms). */
const OVERLAY_IDLE_DURATION = 2000;

export type DeckProps = {
  slides: SlideSource[];
  /** Controlled slide index; clamped to the slide range for display. */
  index: number;
  onIndexChange: (index: number) => void;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onAddSlide?: () => void;
  /** Extra toolbar content, shown after the page number. */
  toolbar?: ReactNode;
  attendableId?: string;
};

/** Keys typed into slide content (inputs, editors) must not turn the page. */
const isEditable = (target: EventTarget) =>
  target instanceof Element &&
  target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])') !== null;

/**
 * Paged slide deck: a toolbar pager, or in fullscreen an auto-hiding overlay pager. Keys are scoped
 * to the deck's own focus so they never leak to the surrounding app.
 */
export const Deck = Util.composable<HTMLDivElement, DeckProps>(
  (
    {
      slides,
      index: indexProp,
      onIndexChange,
      fullscreen = false,
      onFullscreenChange,
      onAddSlide,
      toolbar,
      attendableId,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const count = slides.length;
    const index = SlideViewState.clamp(indexProp, count);
    const slide = slides[index];

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (isEditable(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }

        const go = (next: number) => {
          event.preventDefault();
          onIndexChange(SlideViewState.clamp(next, count));
        };
        switch (event.key) {
          case 'f':
            event.preventDefault();
            onFullscreenChange?.(!fullscreen);
            return;
          case 'ArrowLeft':
            return go(event.shiftKey ? 0 : index - 1);
          case 'ArrowRight':
            return go(event.shiftKey ? count - 1 : index + 1);
          case 'Home':
          case 'ArrowUp':
            return go(0);
          case 'End':
          case 'ArrowDown':
            return go(count - 1);
        }
      },
      [index, count, onIndexChange, fullscreen, onFullscreenChange],
    );

    const handleExit = useCallback(() => onFullscreenChange?.(false), [onFullscreenChange]);

    const body =
      count === 0 ? (
        <div className='flex grow items-center justify-center'>
          <Button.Root label={t('add-slide.label')} onClick={onAddSlide} />
        </div>
      ) : (
        slide && <SlideRenderer source={slide} attendableId={attendableId} />
      );

    const shell = (
      <PresentationShell
        // Remount on toggle because the shell's exiting state must reset after an ESC exit.
        key={fullscreen ? 'fullscreen' : 'inline'}
        data-testid='presenter.deck'
        fullscreen={fullscreen}
        onExit={handleExit}
        onKeyDown={handleKeyDown}
      >
        <div className='dx-cover flex flex-col'>{body}</div>
        {fullscreen && <OverlayPager index={index} count={count} onChange={onIndexChange} />}
      </PresentationShell>
    );

    if (fullscreen) {
      return (
        <Panel.Root {...props} ref={forwardedRef}>
          <Panel.Body asChild>{shell}</Panel.Body>
        </Panel.Root>
      );
    }

    return (
      <Panel.Root {...props} ref={forwardedRef}>
        <Panel.Header>
          <Toolbar.Root>
            <Pager index={index} count={count} onChange={onIndexChange} />
            <PageNumber index={index} count={count} />
            {toolbar}
            <div className='grow' />
            <Button.Root
              data-testid='presenter.fullscreen'
              icon='ph--arrows-out--regular'
              iconOnly
              variant='ghost'
              label={t('fullscreen.label')}
              onClick={() => onFullscreenChange?.(true)}
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>{shell}</Panel.Body>
      </Panel.Root>
    );
  },
);

Deck.displayName = 'Deck';

type OverlayPagerProps = { index: number; count: number; onChange: (index: number) => void };

/** Bottom pager that fades out after the pointer rests, and returns on movement. */
const OverlayPager = ({ index, count, onChange }: OverlayPagerProps) => {
  const [visible, setVisible] = useState(true);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Window-level so movement over the slide (not just the overlay) wakes it; each move restarts the idle timer.
  useEffect(() => {
    const schedule = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), OVERLAY_IDLE_DURATION);
    };
    const show = () => {
      setVisible(true);
      schedule();
    };
    schedule();
    window.addEventListener('pointermove', show);
    return () => {
      window.removeEventListener('pointermove', show);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      data-testid='presenter.overlay'
      data-visible={visible}
      className='absolute bottom-4 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-4 rounded-md bg-black/50 px-4 py-1 text-white transition-opacity duration-500 data-[visible=false]:opacity-0 data-[visible=false]:pointer-events-none'
    >
      <Pager index={index} count={count} onChange={onChange} />
      <PageNumber index={index} count={count} />
    </div>
  );
};
