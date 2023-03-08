//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Document } from '@dxos/kai-types';
import { useQuery, observer, Text } from '@dxos/react-client';
import { Input } from '@dxos/react-components';
import { RichTextComposer, useEditor } from '@dxos/react-composer';

import { createPath, useAppRouter } from '../../hooks';

export const KaiComposer = ({ text, spellCheck = false }: { text: Text; spellCheck?: boolean }) => {
  const editor = useEditor({
    text,
    slots: { editor: { className: 'kai-composer', spellCheck } }
  });

  return <RichTextComposer editor={editor} />;
};

export const DocumentFrame = observer(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const documents = useQuery(space, Document.filter());

  // Default to first.
  // TODO(burdon): Factor out pattern.
  const document = objectId ? (space!.db.getObjectById(objectId) as Document) : undefined;
  useEffect(() => {
    if (frame && !document && documents.length) {
      navigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId: documents[0].id }));
    }
  }, [frame, document, documents]);

  if (!document || !document.content) {
    return null;
  }

  // TODO(burdon): Spellcheck false in dev mode.
  const spellCheck = false;

  return (
    <div className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
        <div className='px-6 md:px-20 py-12 bg-paper-bg shadow-1'>
          <Input
            variant='subdued'
            label='Title'
            labelVisuallyHidden
            placeholder='Title'
            slots={{
              root: {
                className: 'w-full pb-8'
              },
              input: {
                className: 'border-0 text-2xl text-black',
                spellCheck
              }
            }}
            value={document.title ?? ''}
            onChange={(event) => {
              document.title = event.target.value;
            }}
          />

          <KaiComposer text={document.content} spellCheck={spellCheck} />
        </div>

        <div className='pb-4' />
      </div>
    </div>
  );
});

export default DocumentFrame;
