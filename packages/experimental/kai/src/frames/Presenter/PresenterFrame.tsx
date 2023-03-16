//
// Copyright 2022 DXOS.org
//

import { Layout } from '@phosphor-icons/react';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Text } from '@dxos/echo-schema';
import { Document as DocumentType, DocumentStack, Presentation } from '@dxos/kai-types';
import { useQuery, observer, useSubscription, Space } from '@dxos/react-client';

import { Deck } from '../../components';
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

export const PresenterFrame = observer(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const { fullscreen } = useAppState();

  const presentations = useQuery(space, Presentation.filter());
  const presentation = objectId ? (space!.db.getObjectById(objectId) as Presentation) : undefined;
  useEffect(() => {
    if (space && frame && !presentation) {
      setTimeout(async () => {
        let presentation = presentations.find((presentation) => presentation.id === objectId);
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
    <div className='flex flex-1 overflow-hidden'>
      {!fullscreen && (
        <div className='flex flex-1 shrink-0 overflow-hidden'>
          <Editor space={space} presentation={presentation} />
        </div>
      )}

      {/* TODO(burdon): Toggle split screen mode. */}
      <div className='flex flex-1 shrink-0 overflow-hidden'>
        <DeckContainer space={space} presentation={presentation} />
      </div>
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

const DeckContainer: FC<{ space: Space; presentation: Presentation }> = observer(({ space, presentation }) => {
  const { fullscreen } = useAppState();
  const { setFullscreen } = useAppReducer();
  const [content, setContent] = useState<string[]>([]);

  // TODO(burdon): Hack to listen for document section updates.
  const texts = useMemo(() => {
    return presentation.stack.sections
      .map((section) => section.object)
      .map((doc) => {
        return doc.type === DocumentType.Type.MARKDOWN && doc.content ? doc.content : undefined;
      })
      .filter(Boolean) as Text[];
  }, [space, presentation, presentation.stack.sections.length]);

  useSubscription(() => {
    setContent(texts.map((text) => text.doc!.getText('utf8').toString()) ?? []);
  }, [texts]);

  return <Deck slides={content} fullscreen={fullscreen} onToggleFullscreen={setFullscreen} />;
});

export default PresenterFrame;
