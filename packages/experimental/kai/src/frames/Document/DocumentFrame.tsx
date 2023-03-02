//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, withReactor } from '@dxos/react-client';
import { Input } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { createPath, useAppRouter } from '../../hooks';
import { Document } from '../../proto';

export const DocumentFrame = withReactor(() => {
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
    <div className='flex flex-1 overflow-hidden justify-center'>
      <div className='flex flex-col w-full md:max-w-[800px]'>
        <div className='m-0 md:m-4 py-12 overflow-y-auto bg-paper-bg shadow-1'>
          <div className='mx-6 md:mx-16'>
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
                root: { className: 'grow' },
                editor: {
                  className: 'kai-composer z-0 text-black text-xl md:text-base',
                  spellCheck
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default DocumentFrame;
