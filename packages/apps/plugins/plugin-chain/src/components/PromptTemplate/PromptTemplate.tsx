//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useRef } from 'react';

import { type Chain as ChainType } from '@braneframe/types';
import { DensityProvider, Input, Select, useTranslation } from '@dxos/react-ui';
import { TextEditor, type TextEditorRef, useTextModel } from '@dxos/react-ui-editor';
import { groupBorder, mx } from '@dxos/react-ui-theme';

import { promptLanguage } from './language';
import { CHAIN_PLUGIN } from '../../meta';

// TODO(burdon): Chess example.
//  - Path to access context.
//  - Literal.
//  - Query/schema.
//  - Retriever.
//  - Command token (e.g., /foo).

const types = [
  {
    value: '1',
    label: 'Selector',
  },
  {
    value: '2',
    label: 'Function',
  },
  {
    value: '3',
    label: 'Value',
  },
  {
    value: '4',
    label: 'Retriever',
  },
];

type PromptTemplateProps = {
  prompt: ChainType.Prompt;
};

export const PromptTemplate = ({ prompt }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: prompt.source });
  const editorRef = useRef<TextEditorRef>(null);

  const regex = /\{([a-zA-Z_]+)}/g;
  const text = prompt.source?.text ?? '';
  const variables = new Set<string>([...text.matchAll(regex)].map((m) => m[1]));

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
        <Section title='Prompt'>
          <Input.Root>
            <Input.TextInput
              placeholder={t('command placeholder')}
              classNames={mx('is-full bg-transparent m-2')}
              value={prompt.command ?? ''}
              onChange={(event) => {
                prompt!.command = event.target.value;
              }}
            />
          </Input.Root>
        </Section>

        <Section title='Template'>
          <TextEditor
            ref={editorRef}
            model={model}
            extensions={[promptLanguage]}
            slots={{
              root: {
                className: 'w-full p-2',
              },
              editor: {
                placeholder: t('template placeholder'),
              },
            }}
          />
        </Section>

        {variables.size > 0 && (
          <Section title='Inputs'>
            <div className='flex flex-col divide-y'>
              <table className='table-fixed border-collapse'>
                <tbody>
                  {Array.from(variables.values()).map((variable) => (
                    <tr key={variable}>
                      <td className='p-2 w-[200px] font-mono text-sm'>{'{' + variable + '}'}</td>
                      <td className='p-2 w-[160px]'>
                        <Input.Root>
                          <Select.Root value={types[0].value} onValueChange={() => {}}>
                            <Select.TriggerButton placeholder='Type' classNames='is-full' />
                            <Select.Portal>
                              <Select.Content>
                                <Select.Viewport>
                                  {types.map(({ value, label }) => (
                                    <Select.Option key={value} value={value}>
                                      {label}
                                    </Select.Option>
                                  ))}
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </Input.Root>
                      </td>
                      <td className='p-2'>
                        <Input.Root>
                          <Input.TextInput placeholder='Enter value...' classNames={mx('is-full bg-transparent')} />
                        </Input.Root>
                      </td>
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
      <div className='flex h-[32px] items-center bg-neutral-50 rounded-t border-b'>
        <h2 className='px-2 text-xs'>{title}</h2>
        <div className='grow' />
        {actions}
      </div>
      {children}
    </div>
  );
};
