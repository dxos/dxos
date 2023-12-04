//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { type TextObject } from '@dxos/react-client/echo';
import { Button, DensityProvider, useTranslation } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { groupBorder, mx } from '@dxos/react-ui-theme';

import { CHAIN_PLUGIN } from '../../meta';

type PromptTemplateProps = {
  prompt: TextObject;
};

export const PromptTemplate = ({ prompt }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: prompt });

  const variables = ['history', 'question'];

  return (
    <DensityProvider density='fine'>
      <div className={mx('border divide-y gap-2 m-4', groupBorder)}>
        <div>
          <div className='flex h-[32px] items-center bg-neutral-50'>
            <h2 className='px-2 text-xs'>Prompt</h2>
          </div>
          <TextEditor
            model={model}
            slots={{
              root: {
                className: 'w-full p-2',
              },
              editor: {
                placeholder: t('prompt placeholder'),
              },
            }}
          />
        </div>

        <div>
          <div className='flex h-[32px] items-center bg-neutral-50'>
            <h2 className='px-2 text-xs'>Variables</h2>
            <div className='grow' />
            <Button variant='ghost'>
              <Plus />
            </Button>
          </div>
          <div className='flex flex-col py-2 gap-4'>
            {variables.map((variable) => (
              <div key={variable} className='px-4'>
                {variable}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DensityProvider>
  );
};
