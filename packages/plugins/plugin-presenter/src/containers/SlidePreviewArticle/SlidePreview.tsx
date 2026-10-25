//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useObject } from '@dxos/echo-react';
import { type Text } from '@dxos/schema';

import { Slide, SlideThemeProvider } from '#components';
import { type SlideSource, slideSourcesAtom } from '#deck';
import { slideEditorSyncAtom, useDeckTheme } from '#hooks';
import { hasSlots, parseSlide, slotAtOffset, stepAtOffset } from '#markdown';
import { Presentation } from '#types';

/** Stands in for the deck of a slide with no presentation. */
const NO_SLIDES = Atom.make<SlideSource[]>([]);

export type SlidePreviewProps = {
  subject: Text.Text;
};

/**
 * The rendered slide, following the slide editor's cursor: its click group's step is revealed and its slot is
 * outlined; clicking an element asks the editor to select that element's source.
 */
export const SlidePreview = ({ subject }: SlidePreviewProps) => {
  const [content] = useObject(subject, 'content');
  const [sync, setSync] = useAtom(slideEditorSyncAtom(subject.id));
  const parsed = useMemo(() => parseSlide(content ?? ''), [content]);
  const step = sync.cursor === undefined ? undefined : stepAtOffset(parsed, sync.cursor);
  const activeSlot =
    sync.cursor !== undefined && hasSlots(parsed.layout) ? slotAtOffset(parsed, sync.cursor) : undefined;
  // With its Slide, so the slide's own fields (its image) render too.
  const slide = Presentation.getSlide(subject);
  const source = useMemo((): SlideSource => ({ kind: 'text', id: subject.id, text: subject, slide }), [subject, slide]);
  // The slide is previewed in its deck's theme: the presentation's, else its first slide's headmatter.
  const presentation = Presentation.getPresentation(subject);
  const [theme] = useObject(presentation, 'theme');
  const deck = useAtomValue(useMemo(() => (presentation ? slideSourcesAtom(presentation) : NO_SLIDES), [presentation]));
  const themeSettings = useDeckTheme(deck.length > 0 ? deck : [source], theme);

  const handleSourceClick = useCallback(
    (range: [number, number]) =>
      setSync((state) => ({ ...state, select: { range, seq: (state.select?.seq ?? 0) + 1 } })),
    [setSync],
  );

  return (
    <div data-testid='presenter.slide-editor.preview' className='relative flex size-full'>
      {/* Outside a click group every step shows, so the slide reads as it will once fully revealed. */}
      <SlideThemeProvider settings={themeSettings}>
        <Slide.Root
          source={source}
          step={step === 0 ? undefined : step}
          activeSlot={activeSlot}
          onSourceClick={handleSourceClick}
        >
          <Slide.Frame inset>
            <Slide.Content />
          </Slide.Frame>
        </Slide.Root>
      </SlideThemeProvider>
    </div>
  );
};
