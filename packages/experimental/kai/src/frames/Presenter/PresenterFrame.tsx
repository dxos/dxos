//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Document as DocumentType, DocumentStack } from '@dxos/kai-types';
import { useQuery, observer } from '@dxos/react-client';
import { Button } from '@dxos/react-components';

import { Deck } from '../../components';
import { createPath, useAppRouter } from '../../hooks';
import { Stack } from '../Stack';

export const PresenterFrame = observer(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();

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
          stack = await space.db.add(new DocumentStack({ title: 'New Deck' }));
          stack.sections.push(
            new DocumentStack.Section({ object: new DocumentType({ type: DocumentType.Type.MARKDOWN }) })
          );
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: stack.id }));
      });
    }
  }, [space, frame, stacks, stack]);

  const [content, setContent] = useState<string[]>(['# Hello DXOS']);
  const handleUpdate = () => {
    console.log(stack?.title);
    console.log(stack?.sections.length);
    const text = stack?.sections[0]?.object.content.doc.getText('utf8').toString();
    const text2 = stack?.sections[0]?.object.content.toString();
    console.log('::', text, text2);
    // setContent();
  };

  if (!space || !stack) {
    return null;
  }

  // TODO(burdon): Split/fullscreen mode.
  const Editor = () => (
    <div className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
        <Stack slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' } }} space={space} stack={stack} />
        <div className='pb-4' />
      </div>
    </div>
  );

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 shrink-0'>
        <Editor />
        <div className='m-4'>
          <Button onClick={handleUpdate}>Update</Button>
        </div>
      </div>

      <div className='flex flex-1 shrink-0'>
        <Deck slides={content} />
      </div>
    </div>
  );

  return <Editor />;
});

export default PresenterFrame;
