//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import './print.css';

import React, {
  type KeyboardEvent,
  type MutableRefObject,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal, flushSync } from 'react-dom';

import { createContext, useComposedRefs } from '@dxos/react-hooks';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { type SlideSource } from '#deck';
import { useDeckTheme, useSlideClicks } from '#hooks';
import { type SlideTheme, SlideViewState } from '#types';

import { PresenterNamespace } from '../../namespace.ts';
import { ExitButton, PageNumber as PageNumberComponent, Pager as PagerComponent } from '../Pager/index.ts';
import { PresentationShell } from '../PresentationShell/index.ts';
import { Slide } from '../Slide/index.ts';
import { SlideGrid, type SlideGridProps } from '../SlideGrid/index.ts';
import { SlideThemeProvider } from '../SlideTheme/index.ts';

// TODO(burdon): Factor the Deck and Slide families out to a react-ui-presenter package.

/** Set on `<html>` while a deck prints; every print rule is keyed on it so other prints are unaffected. */
const PRINTING_ATTRIBUTE = 'data-printing-deck';

/** Time without pointer movement before the fullscreen pager hides (ms). */
const OVERLAY_IDLE_DURATION = 2000;

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

//
// Root
//

type DeckContextValue = {
  slides: SlideSource[];
  count: number;
  /** The current slide, clamped to the deck. */
  index: number;
  slide: SlideSource | undefined;
  /** Click steps revealed on the current slide. */
  step: number;
  setIndex: (index: number) => void;
  fullscreen: boolean;
  setFullscreen: (fullscreen: boolean) => void;
  themeSettings: SlideTheme.Settings | undefined;
  attendableId?: string;
  /** The element that takes focus when the deck mounts (opted in) or toggles fullscreen: the viewport or the grid. */
  focusRef: MutableRefObject<HTMLDivElement | null>;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

const DECK_NAME = 'Deck';

const [DeckProvider, useDeckContext] = createContext<DeckContextValue>(DECK_NAME);

type DeckRootProps = PropsWithChildren<{
  slides: SlideSource[];
  /** Controlled slide index; clamped to the slide range. */
  index: number;
  onIndexChange: (index: number) => void;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** Deck theme; without a base theme, the first slide's `theme:` headmatter applies. */
  theme?: SlideTheme.Settings;
  attendableId?: string;
  /** Focus the deck on mount, so keys work without a click; it is refocused after every fullscreen toggle regardless. */
  autoFocus?: boolean;
}>;

/**
 * A paged slide deck's state: the slides, the current slide and its click step, fullscreen, and the navigation keys.
 * Headless: the parts it holds render the deck (`Deck.Content` around `Deck.Viewport` or `Deck.Grid`, with a pager).
 */
const DeckRoot = ({
  children,
  slides,
  index: indexProp,
  onIndexChange,
  fullscreen = false,
  onFullscreenChange,
  theme,
  attendableId,
  autoFocus = false,
}: DeckRootProps) => {
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

  const setFullscreen = useCallback((next: boolean) => onFullscreenChange?.(next), [onFullscreenChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
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
          setFullscreen(!fullscreen);
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
    [index, count, step, clicks, onIndexChange, fullscreen, setFullscreen],
  );

  const focusRef = useRef<HTMLDivElement | null>(null);
  // Read once, on mount: a later change of `autoFocus` must not pull focus from elsewhere in the app.
  const autoFocusRef = useRef(autoFocus);
  const lastFullscreen = useRef<boolean>(undefined);
  // The focused part remounts on toggle, so focus is restored after an explicit toggle as well as on (opted-in) mount.
  useEffect(() => {
    const mounting = lastFullscreen.current === undefined;
    if (lastFullscreen.current === fullscreen) {
      return;
    }
    lastFullscreen.current = fullscreen;
    if (!mounting || autoFocusRef.current) {
      focusRef.current?.focus({ preventScroll: true });
    }
  }, [fullscreen]);

  const context = useMemo(
    () => ({
      slides,
      count,
      index,
      slide,
      step,
      setIndex: onIndexChange,
      fullscreen,
      setFullscreen,
      themeSettings,
      attendableId,
      focusRef,
      handleKeyDown,
    }),
    [
      slides,
      count,
      index,
      slide,
      step,
      onIndexChange,
      fullscreen,
      setFullscreen,
      themeSettings,
      attendableId,
      handleKeyDown,
    ],
  );

  return <DeckProvider {...context}>{children}</DeckProvider>;
};

DeckRoot.displayName = 'Deck.Root';

//
// Content
//

/**
 * The deck's focus scope: keys are handled on the whole of it, so a toolbar or pager click keeps them working, and
 * printing while it holds focus (or is fullscreen) prints every slide.
 */
const DeckContent = Util.composable<HTMLDivElement>(({ children, onKeyDown, ...props }, forwardedRef) => {
  const { slides, fullscreen, themeSettings, attendableId, handleKeyDown } = useDeckContext('Deck.Content');
  const contentRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs<HTMLDivElement>(forwardedRef, contentRef);

  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    let owner = false;
    const handleBeforePrint = () => {
      if (fullscreen || contentRef.current?.contains(document.activeElement)) {
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

  return (
    <div
      {...Util.composableProps(props)}
      ref={ref}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        handleKeyDown(event);
      }}
    >
      {children}
      {printing &&
        createPortal(
          <SlideThemeProvider settings={themeSettings}>
            <div data-print-deck=''>
              {slides.map((source, slideIndex) => (
                // An object linked twice yields two slides with one id.
                <div key={`${source.id}:${slideIndex}`} data-print-slide=''>
                  <Slide.Root source={source} attendableId={attendableId} step={Number.POSITIVE_INFINITY}>
                    <Slide.Frame scaled={false}>
                      <Slide.Content />
                    </Slide.Frame>
                  </Slide.Root>
                </div>
              ))}
            </div>
          </SlideThemeProvider>,
          document.body,
        )}
    </div>
  );
});

DeckContent.displayName = 'Deck.Content';

//
// Viewport
//

/**
 * The current slide: inset in a void inline, full-bleed with an auto-hiding pager in fullscreen, where Escape exits.
 * Children draw over the slide (speaker notes, another plugin's overlay).
 */
const DeckViewport = Util.composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { slide, step, fullscreen, setFullscreen, themeSettings, attendableId, focusRef } =
    useDeckContext('Deck.Viewport');
  const ref = useComposedRefs<HTMLDivElement>(forwardedRef, focusRef);
  const handleExit = useCallback(() => setFullscreen(false), [setFullscreen]);

  return (
    <PresentationShell
      {...props}
      // Remount on toggle because the shell's exiting state must reset after an ESC exit.
      key={fullscreen ? 'fullscreen' : 'inline'}
      ref={ref}
      data-testid='presenter.deck'
      fullscreen={fullscreen}
      onExit={handleExit}
    >
      <div className='dx-cover flex flex-col'>
        <SlideThemeProvider settings={themeSettings}>
          {slide && (
            <Slide.Root key={slide.id} source={slide} attendableId={attendableId} step={step}>
              <Slide.Frame inset={!fullscreen}>
                <Slide.Content />
              </Slide.Frame>
            </Slide.Root>
          )}
        </SlideThemeProvider>
      </div>
      {fullscreen && <Overlay />}
      {children}
    </PresentationShell>
  );
});

DeckViewport.displayName = 'Deck.Viewport';

/** Bottom pager that fades out after the pointer rests, and returns on movement; it stays while the pointer is on it. */
const Overlay = () => {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hovered = useRef(false);

  // Window-level so movement over the slide (not just the overlay) wakes it; each move restarts the idle timer.
  useEffect(() => {
    const schedule = () => {
      clearTimeout(timer.current);
      if (!hovered.current) {
        timer.current = setTimeout(() => setVisible(false), OVERLAY_IDLE_DURATION);
      }
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
      onPointerEnter={() => {
        hovered.current = true;
        clearTimeout(timer.current);
        setVisible(true);
      }}
      onPointerLeave={() => {
        hovered.current = false;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setVisible(false), OVERLAY_IDLE_DURATION);
      }}
      className='absolute bottom-4 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-4 rounded-md border border-separator bg-modal-surface px-4 py-1 shadow-sm transition-opacity duration-500 data-[visible=false]:opacity-0 data-[visible=false]:pointer-events-none'
    >
      <DeckPager />
      <DeckPageNumber />
      <DeckExit />
    </div>
  );
};

/** Ends the fullscreen pager row: leaves fullscreen. */
const DeckExit = () => {
  const { setFullscreen } = useDeckContext('Deck.Viewport');
  const handleExit = useCallback(() => setFullscreen(false), [setFullscreen]);
  return <ExitButton onExit={handleExit} />;
};

//
// Grid
//

type DeckGridProps = {
  /** Thumbnail size (default `small`). */
  size?: SlideGridProps['size'];
  /** Moves a slide; without it the thumbnails cannot be dragged. */
  onMove?: (from: number, to: number) => void;
  /** Opens a slide on double-click; without it a double-click presents from that slide. */
  onOpen?: (index: number) => void;
  /** Adds a slide from a ghost tile after the last one; without it there is no ghost. */
  onAddSlide?: () => void;
  /** The graph node a tile shows, so right-clicking it opens that node's actions. */
  contextMenuId?: (source: SlideSource) => string | undefined;
};

/**
 * Every slide as a thumbnail; the current one is selected, and a double-click opens it (or presents from it).
 */
const DeckGrid = Util.composable<HTMLDivElement, DeckGridProps>(
  ({ size, onMove, onOpen, onAddSlide, contextMenuId, ...props }, forwardedRef) => {
    const { slides, index, setIndex, setFullscreen, themeSettings, focusRef } = useDeckContext('Deck.Grid');
    const ref = useComposedRefs<HTMLDivElement>(forwardedRef, focusRef);
    return (
      <div
        {...Util.composableProps(props, { classNames: 'flex grow outline-none' })}
        ref={ref}
        tabIndex={-1}
        data-testid='presenter.deck'
      >
        <SlideThemeProvider settings={themeSettings}>
          <SlideGrid
            slides={slides}
            index={index}
            size={size}
            onIndexChange={setIndex}
            onMove={onMove}
            onAdd={onAddSlide}
            contextMenuId={contextMenuId}
            onPresent={(slideIndex) => {
              setIndex(slideIndex);
              if (onOpen) {
                onOpen(slideIndex);
              } else {
                setFullscreen(true);
              }
            }}
          />
        </SlideThemeProvider>
      </div>
    );
  },
);

DeckGrid.displayName = 'Deck.Grid';

//
// Pager
//

/** First, previous, next and last slide buttons. */
const DeckPager = () => {
  const { index, count, setIndex } = useDeckContext('Deck.Pager');
  return <PagerComponent index={index} count={count} onChange={setIndex} />;
};

DeckPager.displayName = 'Deck.Pager';

//
// PageNumber
//

/** The current slide and the slide count, `3 / 12`. */
const DeckPageNumber = () => {
  const { index, count } = useDeckContext('Deck.PageNumber');
  return <PageNumberComponent index={index} count={count} />;
};

DeckPageNumber.displayName = 'Deck.PageNumber';

//
// PlayButton
//

/** Presents the deck from the current slide. */
const DeckPlayButton = () => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  const { setFullscreen } = useDeckContext('Deck.PlayButton');
  return (
    <Button.Root
      data-testid='presenter.play'
      icon='ph--presentation--regular'
      iconOnly
      variant='ghost'
      label={t('toggle-presentation.label')}
      onClick={() => setFullscreen(true)}
    />
  );
};

DeckPlayButton.displayName = 'Deck.PlayButton';

//
// Exports
//

export {
  DeckContent as Content,
  DeckGrid as Grid,
  DeckPageNumber as PageNumber,
  DeckPager as Pager,
  DeckPlayButton as PlayButton,
  DeckRoot as Root,
  DeckViewport as Viewport,
  useDeckContext,
};

export type { DeckGridProps as GridProps, DeckRootProps as RootProps };
