//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, withReactor } from '@dxos/react-client';
import { Input, mx } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { createSpacePath, useFrameState } from '../../hooks';
import { Document } from '../../proto';

export const DocumentFrame = withReactor(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useFrameState();
  const objects = useQuery(space, Document.filter());

  // Default to first.
  const object = objectId ? (space!.experimental.db.getObjectById(objectId) as Document) : undefined;
  useEffect(() => {
    if (frame && !object && objects.length) {
      navigate(createSpacePath(space!.key, frame?.module.id, objects[0].id));
    }
  }, [frame, object, objects]);

  // TODO(burdon): Handle error.
  if (!object || !object.content) {
    return null;
  }

  // TODO(burdon): Factor out container with fragment and scrolling.
  const fragment = object.content.doc!.getXmlFragment('content');

  // TODO(burdon): Spellcheck false in dev mode.
  const spellCheck = false;

  return (
    <div className='flex flex-1 overflow-hidden justify-center'>
      <div className='flex flex-col w-full md:max-w-[800px]'>
        <div className='m-0 md:m-4 overflow-y-auto shadow-1'>
          {/* TODO(burdon): Why is label required? */}
          {/* TODO(burdon): Throttle input. */}
          <Input
            variant='subdued'
            value={object.title}
            onChange={(event) => {
              object.title = event.target.value;
            }}
            label=''
            placeholder='Title'
            slots={{
              root: {
                className: 'm-0 px-6 py-6 bg-paper-bg'
              },
              input: {
                className: 'p-2 border-0 text-xl',
                spellCheck
              }
            }}
          />

          <Composer
            fragment={fragment}
            slots={{
              root: { className: 'grow' },
              editor: {
                className: mx(
                  'z-0 bg-paper-bg text-black h-full w-full px-8 pb-16 min-bs-[12em]',
                  'text-xl md:text-base bg-paper-bg'
                ),
                spellCheck
              }
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default DocumentFrame;
