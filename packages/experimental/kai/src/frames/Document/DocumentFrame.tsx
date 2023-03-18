//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Document } from '@dxos/kai-types';
import { observer, useIdentity } from '@dxos/react-client';
import { Input } from '@dxos/react-components';
import { RichTextComposer, useTextModel } from '@dxos/react-composer';

import { useAppRouter } from '../../hooks';

export const DocumentFrame = observer(() => {
  const { space, objectId } = useAppRouter();
  const identity = useIdentity();
  const document = objectId ? space!.db.getObjectById<Document>(objectId) : undefined;
  const model = useTextModel({ identity, space, text: document?.content });
  if (!model) {
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
            value={document?.title ?? ''}
            onChange={(event) => {
              if (!document) {
                return;
              }

              document.title = event.target.value;
            }}
          />

          <RichTextComposer
            model={model}
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
