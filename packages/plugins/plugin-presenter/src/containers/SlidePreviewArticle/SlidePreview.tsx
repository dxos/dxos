//
// Copyright 2026 DXOS.org
//

import { useAtom } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo } from 'react';

import { useObject } from '@dxos/echo-react';
import { type Text } from '@dxos/schema';

import { Slide } from '#components';
import { type SlideSource } from '#deck';
import { slideEditorSyncAtom } from '#hooks';
import { hasSlots, parseSlide, slotAtOffset, stepAtOffset } from '#markdown';

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
  const source = useMemo((): SlideSource => ({ kind: 'text', id: subject.id, text: subject }), [subject]);

  const handleSourceClick = useCallback(
    (range: [number, number]) =>
      setSync((state) => ({ ...state, select: { range, seq: (state.select?.seq ?? 0) + 1 } })),
    [setSync],
  );

  return (
    <div data-testid='presenter.slide-editor.preview' className='relative flex size-full'>
      {/* Outside a click group every step shows, so the slide reads as it will once fully revealed. */}
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
    </div>
  );
};
