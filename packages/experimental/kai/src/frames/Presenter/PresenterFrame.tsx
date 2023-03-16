//
// Copyright 2022 DXOS.org
//

import { Eye, Layout, Pen, SquareSplitHorizontal } from '@phosphor-icons/react';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Text } from '@dxos/echo-schema';
import { Document as DocumentType, DocumentStack, Presentation } from '@dxos/kai-types';
import { useQuery, observer, Space, useSubscription } from '@dxos/react-client';
import { Button, getSize } from '@dxos/react-components';

import { Deck, DeckProps } from '../../components';
import { createPath, useAppReducer, useAppRouter, useAppState } from '../../hooks';
import { Stack } from '../Stack';

// TODO(burdon): Load/save Deck to IPFS.
// TODO(burdon): IPFS images.
// TODO(burdon): Layout.
// TODO(burdon): MDX components (runtime build).

const defaultSlides = [
  '# DXOS\n- HALO: Decentralized identity\n- ECHO: Decentralized data\n- MESH: Decentralized networks',
  '# Why Decentralization Matters\n- User experience\n- Privacy\n- Performance\n- Cost',
  '# Get Involved\nhello@dxos.org'
];

enum View {
  EDITOR = 1,
  MARKDOWN = 2,
  SPLIT = 3
}

export const PresenterFrame = observer(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const { fullscreen } = useAppState();
  const [view, setView] = useState<View>(View.EDITOR);
  const [slide, setSlide] = useState(1); // TODO(burdon): Reset when goes into full screen.

  const presentations = useQuery(space, Presentation.filter());
  const presentation = objectId ? (space!.db.getObjectById(objectId) as Presentation) : undefined;
  useEffect(() => {
    if (space && frame && !presentation) {
      setTimeout(async () => {
        let presentation = presentations[0];
        if (!presentation) {
          presentation = await space.db.add(new Presentation({ stack: new DocumentStack({ title: 'New Deck' }) }));
          defaultSlides.forEach((content) => {
            // TODO(burdon): Hack.
            const text = new Text();
            text.doc!.getText('utf8').insert(0, content);
            presentation!.stack.sections.push(
              new DocumentStack.Section({
                object: new DocumentType({ type: DocumentType.Type.MARKDOWN, content: text })
              })
            );
          });
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: presentation.id }));
      });
    }
  }, [space, frame, presentations, presentation]);

  if (!space || !presentation) {
    return null;
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex flex-1 overflow-hidden'>
        {view !== View.MARKDOWN && !fullscreen && (
          <div className='flex flex-1 shrink-0 overflow-hidden'>
            <Editor space={space} presentation={presentation} />
          </div>
        )}

        {(view !== View.EDITOR || fullscreen) && (
          <div className='flex flex-1 shrink-0 overflow-hidden'>
            <DeckContainer presentation={presentation} slide={slide} onSlideChange={setSlide} />
          </div>
        )}
      </div>

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
});

const Editor: FC<{ space: Space; presentation: Presentation }> = ({ space, presentation }) => (
  <div className='flex flex-1 justify-center overflow-y-auto'>
    <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
      <Stack
        slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' } }}
        showTitle={false}
        space={space}
        stack={presentation.stack}
        items={[
          {
            type: DocumentType.type.name,
            label: 'New slide',
            Icon: Layout,
            onCreate: async (space: Space) => space!.db.add(new DocumentType({ type: DocumentType.Type.MARKDOWN }))
          }
        ]}
      />
      <div className='pb-4' />
    </div>
  </div>
);

const DeckContainer: FC<{ presentation: Presentation } & Pick<DeckProps, 'slide' | 'onSlideChange'>> = ({
  presentation,
  ...rest
}) => {
  const { fullscreen } = useAppState();
  const { setFullscreen } = useAppReducer();
  const [content, setContent] = useState<string[]>([]);

  const handleUpdate = useCallback(() => {
    const texts = presentation.stack.sections
      .map((section) => section.object)
      .map((document) => {
        return document.type === DocumentType.Type.MARKDOWN && document.content ? document.content : undefined;
      })
      .filter(Boolean) as Text[];

    setContent(texts.map((text) => text.doc!.getText('utf8').toString()) ?? []);
  }, [presentation]);

  // First time.
  useEffect(handleUpdate, []);

  // Get update if stack sections updated.
  useSubscription(handleUpdate, [presentation.stack]);

  // Get update if any text content changed.
  // TODO(burdon): This seems unnecessary?
  useSubscription(handleUpdate, [presentation.stack.sections.map((section) => section.object.content)]);

  return <Deck slides={content} fullscreen={fullscreen} onToggleFullscreen={setFullscreen} {...rest} />;
};

export default PresenterFrame;
