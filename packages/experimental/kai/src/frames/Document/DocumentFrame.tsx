//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { id, useQuery, withReactor } from '@dxos/react-client';
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
      navigate(createSpacePath(space!.key, frame?.module.id, objects[0][id]));
    }
  }, [frame, object, objects]);

  // TODO(burdon): Handle error.
  if (!object || !object.content) {
    return null;
  }

  // TODO(burdon): Factor out container with fragment and scrolling.
  const fragment = object.content.doc!.getXmlFragment('content');

  return (
    <div className='flex flex-1 overflow-hidden justify-center'>
      <div className='flex flex-col w-full lg:w-[800px]'>
        <div className='my-4 bg-white shadow-lg overflow-y-auto '>
          <Composer
            fragment={fragment}
            slots={{
              root: { className: 'grow' },
              editor: {
                className: 'z-0 bg-white text-black h-full w-full p-8 pb-16 min-bs-[12em] text-xl md:text-base'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default DocumentFrame;
