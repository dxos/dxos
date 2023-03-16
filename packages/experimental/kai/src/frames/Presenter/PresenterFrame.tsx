//
// Copyright 2022 DXOS.org
//

import { Layout } from '@phosphor-icons/react';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Text } from '@dxos/echo-schema';
import { Document as DocumentType, DocumentStack } from '@dxos/kai-types';
import { useQuery, observer, useSubscription, Space } from '@dxos/react-client';

import { Deck } from '../../components';
import { createPath, useAppReducer, useAppRouter, useAppState } from '../../hooks';
import { Stack } from '../Stack';

// TODO(burdon): Fullscreen frames (Fullscreen page).
// TODO(burdon): Load/save Deck to IPFS.
// TODO(burdon): IPFS images.
// TODO(burdon): Layout.
// TODO(burdon): MDX components (runtime build).

export const PresenterFrame = observer(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const { fullscreen } = useAppState();

  const stacks = useQuery(space, DocumentStack.filter());
  const stack = objectId ? (space!.db.getObjectById(objectId) as DocumentStack) : undefined;
  useEffect(() => {
    if (space && frame && !stack) {
      setTimeout(async () => {
        // TODO(burdon): Hack.
        let stack = stacks.find((stack) => {
          return stack.sections[0]?.object.type === DocumentType.Type.MARKDOWN;
        });

        if (!stack) {
          const content = [
            '# DXOS\n- HALO: Decentralized identity\n- ECHO: Decentralized data\n- MESH: Decentralized networks',
            '# Why Decentralization Matters\n- Privacy\n- Performance\n- User experience\n- Cost',
            '# Get Involved\nhello@dxos.org'
          ];

          stack = await space.db.add(new DocumentStack({ title: 'New Deck' }));
          content.forEach((content) => {
            // TODO(burdon): Hack.
            const text = new Text();
            text.doc!.getText('utf8').insert(0, content);
            stack!.sections.push(
              new DocumentStack.Section({
                object: new DocumentType({ type: DocumentType.Type.MARKDOWN, content: text })
              })
            );
          });
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: stack.id }));
      });
    }
  }, [space, frame, stacks, stack]);

  if (!space || !stack) {
    return null;
  }

  if (fullscreen) {
    return (
      <div className='flex flex-1 shrink-0 overflow-hidden'>
        <DeckContainer space={space} stack={stack} />
      </div>
    );
  }

  const Editor = () => (
    <div className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
        <Stack
          slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' } }}
          showTitle={false}
          space={space}
          stack={stack}
          items={[
            {
              type: DocumentType.type.name,
              label: 'Slide',
              Icon: Layout,
              onCreate: async (space: Space) => space!.db.add(new DocumentType({ type: DocumentType.Type.MARKDOWN }))
            }
          ]}
        />
        <div className='pb-4' />
      </div>
    </div>
  );

  // TODO(burdon): Split screen mode.
  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex flex-1 shrink-0 overflow-hidden'>
        <Editor />
      </div>

      <div className='flex flex-1 shrink-0 overflow-hidden'>
        <DeckContainer space={space} stack={stack} />
      </div>
    </div>
  );
});

const DeckContainer: FC<{ space: Space; stack: DocumentStack }> = ({ space, stack }) => {
  const { fullscreen } = useAppState();
  const { setFullscreen } = useAppReducer();
  const [content, setContent] = useState<string[]>([]);

  // TODO(burdon): Hack to listen for document section updates.
  const texts = useMemo(() => {
    return stack.sections
      .map((section) => section.object)
      .map((doc) => {
        return doc.type === DocumentType.Type.MARKDOWN && doc.content ? doc.content : undefined;
      })
      .filter(Boolean) as Text[];
  }, [space, stack, stack.sections.length]);

  useSubscription(() => {
    setContent(texts.map((text) => text.doc!.getText('utf8').toString()) ?? []);
  }, [texts]);

  return <Deck slides={content} fullscreen={fullscreen} onToggleFullscreen={setFullscreen} />;
};

export default PresenterFrame;
