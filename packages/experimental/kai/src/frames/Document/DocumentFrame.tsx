//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, withReactor } from '@dxos/react-client';
import { Input } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { createPath, useAppRouter } from '../../hooks';
import { TextDocument } from '../../proto';

export const DocumentFrame = withReactor(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const documents = useQuery(space, TextDocument.filter());

  // Default to first.
  // TODO(burdon): Factor out pattern.
  const document = objectId ? (space!.db.getObjectById(objectId) as TextDocument) : undefined;
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
                autoFocus: true,
                spellCheck
              }
            }}
            value={document.title}
            onChange={(event) => {
              document.title = event.target.value;
            }}
          />

          <Composer
            document={document.content}
            slots={{
              editor: {
                className: 'kai-composer',
                spellCheck
              }
            }}
          />
        </div>

        <div className='pb-4' />
      </div>
    </div>
  );
});

export default DocumentFrame;
