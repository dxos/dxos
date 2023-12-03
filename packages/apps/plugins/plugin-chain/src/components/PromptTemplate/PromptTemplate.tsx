//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { type PropsWithChildren } from 'react';

import { type TextObject } from '@dxos/react-client/echo';
import { Button, DensityProvider, useTranslation } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { groupBorder, mx } from '@dxos/react-ui-theme';

import { CHAIN_PLUGIN } from '../../meta';

type PromptTemplateProps = {
  source?: TextObject;
};

export const PromptTemplate = ({ source }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: source });

  const variables = ['history', 'question'];

  // TODO(burdon): Basic syntax highlighting for variables.
  //  https://codemirror.net/examples/zebra
  //  https://codemirror.net/docs/ref/#view.MatchDecorator
  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col w-full gap-4 m-4', groupBorder)}>
        <Section title='Prompt'>
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
        </Section>

        <Section
          title='Variables'
          actions={
            <Button variant='ghost'>
              <Plus />
            </Button>
          }
        >
          <div className='flex flex-col divide-y'>
            <table className='table-fixed border-collapse'>
              <tbody className='divide-y'>
                {variables.map((variable) => (
                  <tr key={variable} className=''>
                    <td className='p-2 w-[200px] border-r font-mono text-sm'>{'{' + variable + '}'}</td>
                    <td className='p-2'>x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div>{model?.content.length}</div>
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
