//
// Copyright 2022 DXOS.org
//

import { Eye, Pen, SquareSplitHorizontal } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { type Presentation } from '@dxos/kai-types';

import { DeckContainer } from './DeckContainer';
import { DeckEditor } from './DeckEditor';
import { useFrameContext } from '../../hooks';

// TODO(burdon): Load/save Deck to IPFS.
// TODO(burdon): IPFS images.
// TODO(burdon): Layout.
// TODO(burdon): MDX components (runtime build).

enum View {
  EDITOR = 1,
  MARKDOWN = 2,
  SPLIT = 3,
}

export const PresenterFrame = () => {
  const { space, objectId, fullscreen } = useFrameContext();
  const [view, setView] = useState<View>(View.EDITOR);
  const [slide, setSlide] = useState(1); // TODO(burdon): Reset when goes into full screen.
  const presentation = objectId ? space!.db.getObjectById<Presentation>(objectId) : undefined;
  if (!space || !presentation) {
    return null;
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex flex-1 overflow-hidden'>
        {view !== View.MARKDOWN && !fullscreen && (
          <div className='flex flex-1 shrink-0 overflow-hidden'>
            <DeckEditor presentation={presentation} />
          </div>
        )}

        {(view !== View.EDITOR || fullscreen) && (
          <div className='flex flex-1 shrink-0 overflow-hidden'>
            <DeckContainer presentation={presentation} slide={slide} onSlideChange={setSlide} />
          </div>
        )}
      </div>

      {/* View selector. */}
      {!fullscreen && (
        <div className='flex shrink-0 justify-center m-2 space-x-2'>
          <Button onClick={() => setView(View.EDITOR)} variant={view === View.EDITOR ? 'ghost' : 'default'}>
            <Pen className={getSize(6)} />
          </Button>
          <Button onClick={() => setView(View.SPLIT)} variant={view === View.SPLIT ? 'ghost' : 'default'}>
            <SquareSplitHorizontal className={getSize(6)} />
          </Button>
          <Button onClick={() => setView(View.MARKDOWN)} variant={view === View.MARKDOWN ? 'ghost' : 'default'}>
            <Eye className={getSize(6)} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PresenterFrame;
