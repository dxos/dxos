//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { Deck, PopupWindow, SpeakerNotes } from '#components';
import { type SlideSource } from '#deck';
import { useElapsed, useSlideLabel, useSpeakerLines } from '#hooks';
import { meta } from '#meta';
import { type Presentation, PresenterCapabilities, PresenterSurface } from '#types';

const slideOf = (source: SlideSource | undefined) => (source && 'slide' in source ? source.slide : undefined);

/** Keys a speaker presses in the notes window that move the deck. */
const DECK_KEYS = new Set([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

export type PresentedOverlayProps = {
  presentation: Presentation.Presentation;
};

/**
 * What draws over a presented deck: the speaker notes (subtitles, or the notes window, per the presenter setting),
 * other plugins' overlays, and the events other plugins follow the presentation by.
 */
export const PresentedOverlay = ({ presentation }: PresentedOverlayProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { slides, index, slide, step, focusRef } = Deck.useDeckContext(PresentedOverlay.displayName);
  const settings = AppHooks.useOptionalAtomCapability(PresenterCapabilities.Settings);
  const notes = settings?.notes ?? 'off';

  const lines = useSpeakerLines(slide);
  const title = useSlideLabel(slide);
  usePresentationEvents(presentation, slide, title, index, step);
  const next = slides[index + 1];
  const nextLines = useSpeakerLines(next);
  const nextTitle = useSlideLabel(next);
  const [duration] = useObject(slideOf(slide), 'duration');
  const elapsed = useElapsed(slide?.id);

  // A popup opened without user activation is refused; the button opens it from a click instead.
  const [blocked, setBlocked] = useState(false);
  const [closed, setClosed] = useState(false);
  const handleOpen = useCallback(() => {
    setBlocked(false);
    setClosed(false);
  }, []);
  // The deck's keys are handled on its focus scope in this window, so a key pressed in the notes window is replayed there.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (DECK_KEYS.has(event.key)) {
        event.preventDefault();
        focusRef.current?.dispatchEvent(
          new KeyboardEvent('keydown', { key: event.key, shiftKey: event.shiftKey, bubbles: true }),
        );
      }
    },
    [focusRef],
  );

  return (
    <>
      {notes === 'subtitles' && <SpeakerNotes.Subtitles lines={lines} />}
      {notes === 'window' && !blocked && !closed && (
        <PopupWindow
          name={`presenter-notes-${presentation.id}`}
          title={t('speaker-notes-window.title', { name: presentation.name ?? '' })}
          onBlocked={() => setBlocked(true)}
          onClose={() => setClosed(true)}
          onKeyDown={handleKeyDown}
        >
          <SpeakerNotes.Prompter
            title={title}
            lines={lines}
            next={next ? { title: nextTitle, lines: nextLines } : undefined}
            index={index}
            count={slides.length}
            elapsed={elapsed}
            duration={duration}
          />
        </PopupWindow>
      )}
      {notes === 'window' && (blocked || closed) && (
        <div className='absolute top-4 right-4 z-[300]'>
          <Button.Root data-testid='presenter.open-notes' icon='ph--note--regular' onClick={handleOpen}>
            {t('open-speaker-notes.label')}
          </Button.Root>
        </div>
      )}
      <Surface.Surface type={PresenterSurface.Overlay} data={{ subject: presentation }} />
    </>
  );
};

PresentedOverlay.displayName = 'PresentedOverlay';

/** Tells the `PresentationEventHandler` contributors when the presentation starts and stops, and every slide/step change. */
const usePresentationEvents = (
  presentation: Presentation.Presentation,
  slide: SlideSource | undefined,
  title: string | undefined,
  index: number,
  step: number,
) => {
  const handlers = AppHooks.useOptionalCapabilities(PresenterCapabilities.PresentationEventHandler);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Mounted only while presenting, so mount and unmount are the start and stop. The stop is deferred a task so a
  // remount at once (StrictMode's double mount) cancels it, rather than ending a recording the moment it starts.
  const pendingStop = useRef<{ id: string; timer: ReturnType<typeof setTimeout> }>(undefined);
  useEffect(() => {
    if (pendingStop.current?.id === presentation.id) {
      clearTimeout(pendingStop.current.timer);
      pendingStop.current = undefined;
    } else {
      handlersRef.current.forEach((handler) => handler.onStart?.(presentation));
    }
    return () => {
      pendingStop.current = {
        id: presentation.id,
        timer: setTimeout(() => {
          pendingStop.current = undefined;
          handlersRef.current.forEach((handler) => handler.onStop?.(presentation));
        }),
      };
    };
  }, [presentation]);

  useEffect(() => {
    if (!slide) {
      return;
    }
    const event: PresenterCapabilities.SlideEvent = {
      presentation,
      slide: slideOf(slide),
      id: slide.id,
      title,
      index,
      step,
    };
    handlersRef.current.forEach((handler) => handler.onSlide?.(event));
  }, [presentation, slide?.id, title, index, step]);
};
