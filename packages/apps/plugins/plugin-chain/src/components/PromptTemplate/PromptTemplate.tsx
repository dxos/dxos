//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { type PropsWithChildren, useRef } from 'react';

import { type Chain as ChainType } from '@braneframe/types';
import { Button, DensityProvider, useTranslation } from '@dxos/react-ui';
import { TextEditor, type TextEditorRef, useTextModel } from '@dxos/react-ui-editor';
import { groupBorder, mx } from '@dxos/react-ui-theme';

import { promptLanguage } from './language';
import { CHAIN_PLUGIN } from '../../meta';

type PromptTemplateProps = {
  prompt?: ChainType.Prompt;
};

export const PromptTemplate = ({ prompt }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: prompt?.source });
  const editorRef = useRef<TextEditorRef>(null);

  const regex = /\{([a-zA-Z_]+)\}/g;
  const text = prompt?.source?.text ?? '';
  const variables = [...text.matchAll(regex)].map((m) => m[1]);

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col gap-4 m-4', groupBorder)}>
        <Section title='Prompt'>
          <TextEditor
            ref={editorRef}
            model={model}
            extensions={[promptLanguage]}
            slots={{
              root: {
                className: 'w-full p-2',
              },
              editor: {
                placeholder: t('prompt placeholder'),
              },
            }}
          />
        </Section>

        {variables.length > 0 && (
          <Section
            title='Variables'
            actions={
              <Button variant='ghost'>
                <Plus />
              </Button>
            }
          >
            <div className='flex flex-col divide-y font-mono text-sm'>
              <table className='table-fixed border-collapse'>
                <tbody className='divide-y'>
                  {variables.map((variable) => (
                    <tr key={variable} className=''>
                      <td className='p-2 w-[200px] border-r'>{'{' + variable + '}'}</td>
                      <td className='p-2'>$context.object.pgn</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </DensityProvider>
  );
};

const Section = ({ title, actions, children }: PropsWithChildren<{ title: string; actions?: JSX.Element }>) => {
  return (
    <div className='border border-neutral-100 rounded-md'>
      <div className='flex h-[32px] items-center bg-neutral-50 rounded-t'>
        <h2 className='px-2 text-xs'>{title}</h2>
        <div className='grow' />
        {actions}
      </div>
      {children}
    </div>
  );
};
