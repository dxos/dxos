//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';

import { Input, Selector } from '../components';
import { useSpace } from '../hooks';
import { Document } from '../proto';

const DocumentFrame: FC = withReactor(() => {
  const space = useSpace();
  const documents = useQuery(space, Document.filter());
  const [document, setDocument] = useState<Document>();
  useEffect(() => {
    setDocument(undefined);
  }, [space]);

  const fragment = document?.content.doc!.getXmlFragment('content');

  return (
    <div className='flex flex-1 overflow-hidden justify-center bg-gray-300'>
      <div className='flex flex-col overflow-hidden w-full lg:w-[800px] bg-white shadow-lg'>
        <div className='flex p-3'>
          <Selector
            placeholder='Document'
            options={documents.map((document) => ({ id: document[id], title: document.title }))}
            onSelect={(selected) => {
              setDocument(selected ? documents.find((document) => document[id] === selected) : undefined);
            }}
          />
        </div>

        {document && (
          <div className='flex flex-col flex-1 overflow-hidden'>
            <div className='flex p-4 border-b items-center'>
              <Input
                className='w-full p-1 text-lg outline-0'
                spellCheck={false}
                value={document.title}
                onChange={(value) => (document.title = value)}
              />
            </div>

            {document.content?.doc && (
              <div className='flex flex-1 m-2 overflow-y-auto'>
                <Composer
                  fragment={fragment}
                  slots={{
                    root: { className: 'grow' },
                    editor: {
                      className: 'z-0 bg-white text-black h-full w-full p-3 min-bs-[12em] text-xl md:text-base'
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default DocumentFrame;
