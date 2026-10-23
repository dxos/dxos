//
// Copyright 2026 DXOS.org
//

import './print.css';

import React, { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Util from '@dxos/react-ui/Util';

import { type SlideSource } from '#deck';
import { useDeckTheme, useSlideClicks } from '#hooks';
import { meta } from '#meta';
import { type SlideTheme, SlideViewState } from '#types';

import { PageNumber, Pager } from '../Pager/index.ts';
import { PresentationShell } from '../PresentationShell/index.ts';
import { SlideGrid } from '../SlideGrid/index.ts';
import { SlideRenderer } from '../SlideRenderer/index.ts';
import { SlideThemeProvider } from '../SlideTheme/index.ts';

/** Set on `<html>` while a deck prints; every print rule is keyed on it so other prints are unaffected. */
const PRINTING_ATTRIBUTE = 'data-printing-deck';

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
  /** Moves a slide in the grid view; without it the thumbnails cannot be dragged. */
  onMoveSlide?: (from: number, to: number) => void;
  /** Extra toolbar content, shown at the start of the toolbar. */
  toolbar?: ReactNode;
  attendableId?: string;
  /** Deck theme; without a name, the first slide's `theme:` headmatter applies. */
  theme?: SlideTheme.Settings;
  /** Inline, show one slide at a time or a grid of every slide; fullscreen always shows one. */
  view?: 'slide' | 'grid';
  /** Focus the deck on mount, so keys work without a click; it is refocused after every fullscreen toggle regardless. */
  autoFocus?: boolean;
};

/** Controls inside a slide that own the navigation keys: text entry, and widgets that use arrows themselves. */
const KEY_OWNERS = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  ...['slider', 'spinbutton', 'listbox', 'combobox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'grid'].map(
    (role) => `[role="${role}"]`,
  ),
].join(', ');

/** Controls that Space activates natively. */
const ACTIVATABLE =
  'button, a[href], summary, [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="tab"], [role="option"]';

/** Keys typed into slide content (inputs, editors, arrow-driven widgets) must not turn the page. */
const isEditable = (target: EventTarget) => target instanceof Element && target.closest(KEY_OWNERS) !== null;

/**
 * Paged slide deck: a centered status-bar pager, or in fullscreen an auto-hiding overlay pager. Keys are scoped
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
      onMoveSlide,
      toolbar,
      attendableId,
      autoFocus = false,
      theme,
      view = 'slide',
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const count = slides.length;
    const index = SlideViewState.clamp(indexProp, count);
    const slide = slides[index];

    // Click state is tied to the slide it belongs to, so any index change (pager, jump, controlled) resets it.
    const [stepState, setStepState] = useState({ index: 0, step: 0 });
    // Document slide ids are positional, so an edit that replaces the current slide is detected by its content.
    const slideKey = slide?.kind === 'markdown' ? slide.content : slide?.id;
    // A pager, navtree or controlled index change bypasses the key handler, so stale steps are dropped on any move.
    const [previous, setPrevious] = useState({ index, slideKey });
    if (previous.index !== index || previous.slideKey !== slideKey) {
      setPrevious({ index, slideKey });
      if (previous.index === index || stepState.index !== index) {
        setStepState({ index, step: 0 });
      }
    }
    const clicks = useSlideClicks(slide);
    const themeSettings = useDeckTheme(slides, theme);
    const step = stepState.index === index ? Math.min(stepState.step, clicks) : 0;

    // Only the deck holding focus (or the fullscreen one) prints; the print container holds every slide.
    const rootRef = useRef<HTMLDivElement>(null);
    const [printing, setPrinting] = useState(false);
    useEffect(() => {
      let owner = false;
      const handleBeforePrint = () => {
        if (fullscreen || rootRef.current?.contains(document.activeElement)) {
          owner = true;
          // Print layout is taken straight after this event, so the container must be in the DOM synchronously.
          flushSync(() => setPrinting(true));
          document.documentElement.setAttribute(PRINTING_ATTRIBUTE, '');
        }
      };
      const handleAfterPrint = () => {
        if (owner) {
          owner = false;
          document.documentElement.removeAttribute(PRINTING_ATTRIBUTE);
          setPrinting(false);
        }
      };
      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
        if (owner) {
          document.documentElement.removeAttribute(PRINTING_ATTRIBUTE);
          // A fullscreen toggle mid-print re-runs this effect, which must not leave the print container mounted.
          setPrinting(false);
        }
      };
    }, [fullscreen]);

    const printContainer =
      printing &&
      createPortal(
        <SlideThemeProvider settings={themeSettings}>
          <div data-print-deck=''>
            {slides.map((source, slideIndex) => (
              // An object linked twice yields two slides with one id.
              <div key={`${source.id}:${slideIndex}`} data-print-slide=''>
                <SlideRenderer
                  source={source}
                  attendableId={attendableId}
                  step={Number.POSITIVE_INFINITY}
                  framed={false}
                />
              </div>
            ))}
          </div>
        </SlideThemeProvider>,
        document.body,
      );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (isEditable(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }
        // Arrow keys inside a toolbar move between its buttons (roving focus), so only `f` applies there.
        const inToolbar = event.target instanceof Element && event.target.closest('[role="toolbar"]') !== null;
        if (inToolbar && event.key !== 'f' && event.key !== 'F') {
          return;
        }

        const go = (next: number) => {
          event.preventDefault();
          const clamped = SlideViewState.clamp(next, count);
          setStepState({ index: clamped, step: 0 });
          onIndexChange(clamped);
        };
        const forward = () => {
          if (step < clicks) {
            event.preventDefault();
            setStepState({ index, step: step + 1 });
          } else if (index < count - 1) {
            go(index + 1);
          } else {
            // Past the last slide there is nowhere to go, and its revealed steps must stay revealed.
            event.preventDefault();
          }
        };
        switch (event.key) {
          case ' ':
            // Space activates a focused control, so it only advances from non-interactive targets.
            if (event.target instanceof Element && event.target.closest(ACTIVATABLE)) {
              return;
            }
            return forward();
          case 'f':
          case 'F':
            event.preventDefault();
            onFullscreenChange?.(!fullscreen);
            return;
          case 'ArrowLeft':
            if (event.shiftKey) {
              return go(0);
            }
            if (step > 0) {
              event.preventDefault();
              setStepState({ index, step: step - 1 });
              return;
            }
            event.preventDefault();
            if (index > 0) {
              setStepState({ index: index - 1, step: Number.POSITIVE_INFINITY });
              onIndexChange(index - 1);
            }
            return;
          case 'ArrowRight':
            return event.shiftKey ? go(count - 1) : forward();
          case 'Home':
          case 'ArrowUp':
            return go(0);
          case 'End':
          case 'ArrowDown':
            return go(count - 1);
        }
      },
      [index, count, step, clicks, onIndexChange, fullscreen, onFullscreenChange],
    );

    const shellRef = useRef<HTMLDivElement>(null);
    // Read once, on mount: a later change of `autoFocus` must not pull focus from elsewhere in the app.
    const autoFocusRef = useRef(autoFocus);
    const lastFullscreen = useRef<boolean>(undefined);
    // The shell remounts on toggle, so focus is restored after an explicit toggle as well as on (opted-in) mount.
    useEffect(() => {
      const mounting = lastFullscreen.current === undefined;
      if (lastFullscreen.current === fullscreen) {
        return;
      }
      lastFullscreen.current = fullscreen;
      if (!mounting || autoFocusRef.current) {
        shellRef.current?.focus({ preventScroll: true });
      }
    }, [fullscreen]);

    const handleExit = useCallback(() => onFullscreenChange?.(false), [onFullscreenChange]);

    const body =
      count === 0 ? (
        <div className='flex grow items-center justify-center'>
          {onAddSlide && <Button.Root label={t('add-slide.label')} onClick={onAddSlide} />}
        </div>
      ) : (
        slide && <SlideRenderer key={slide.id} source={slide} attendableId={attendableId} step={step} />
      );

    const shell = (
      <PresentationShell
        // Remount on toggle because the shell's exiting state must reset after an ESC exit.
        key={fullscreen ? 'fullscreen' : 'inline'}
        ref={shellRef}
        data-testid='presenter.deck'
        fullscreen={fullscreen}
        onExit={handleExit}
      >
        <div className='dx-cover flex flex-col'>
          <SlideThemeProvider settings={themeSettings}>{body}</SlideThemeProvider>
        </div>
        {fullscreen && <OverlayPager index={index} count={count} onChange={onIndexChange} />}
      </PresentationShell>
    );

    if (fullscreen) {
      return (
        <Panel.Root {...props} asChild ref={forwardedRef}>
          <div ref={rootRef} onKeyDown={handleKeyDown}>
            <Panel.Body asChild>{shell}</Panel.Body>
            {printContainer}
          </div>
        </Panel.Root>
      );
    }

    return (
      // Keys are handled on the whole panel so the toolbar and status bar keep them working after a click.
      <Panel.Root {...props} asChild ref={forwardedRef}>
        <div ref={rootRef} onKeyDown={handleKeyDown}>
          {printContainer}
          <Panel.Header>
            <Toolbar.Root>
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
          <Panel.Body asChild>
            {view === 'grid' && count > 0 ? (
              <div ref={shellRef} tabIndex={-1} data-testid='presenter.deck' className='flex grow outline-none'>
                <SlideThemeProvider settings={themeSettings}>
                  <SlideGrid
                    slides={slides}
                    index={index}
                    onIndexChange={onIndexChange}
                    onMove={onMoveSlide}
                    onPresent={(slideIndex) => {
                      onIndexChange(slideIndex);
                      onFullscreenChange?.(true);
                    }}
                  />
                </SlideThemeProvider>
              </div>
            ) : (
              shell
            )}
          </Panel.Body>
          {/* The grid shows every slide, so it has no pager. */}
          {view === 'slide' && (
            <Panel.Footer>
              <div className='flex items-center justify-center gap-4'>
                <Pager index={index} count={count} onChange={onIndexChange} />
                <PageNumber index={index} count={count} />
              </div>
            </Panel.Footer>
          )}
        </div>
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
