//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useEffect } from 'react';

import { Chain as ChainType } from '@braneframe/types';
import { getTextContent } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useDocAccessor,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { attentionSurface, groupBorder, mx } from '@dxos/react-ui-theme';

import { nameRegex, promptExtension } from './prompt-extension';
import { CHAIN_PLUGIN } from '../../meta';

const inputTypes = [
  {
    value: ChainType.Input.Type.VALUE,
    label: 'Value',
  },
  {
    value: ChainType.Input.Type.PASS_THROUGH,
    label: 'Pass through',
  },
  {
    value: ChainType.Input.Type.RETRIEVER,
    label: 'Retriever',
  },
  // {
  //   value: ChainType.Input.Type.FUNCTION,
  //   label: 'Function',
  // },
  // {
  //   value: ChainType.Input.Type.QUERY,
  //   label: 'Query',
  // },
  {
    value: ChainType.Input.Type.RESOLVER,
    label: 'Resolver',
  },
  {
    value: ChainType.Input.Type.CONTEXT,
    label: 'Context',
  },
  {
    value: ChainType.Input.Type.SCHEMA,
    label: 'Schema',
  },
];

const getInputType = (type: string) => inputTypes.find(({ value }) => String(value) === type)?.value;

const usePromptInputs = (prompt: ChainType.Prompt) => {
  const text = getTextContent(prompt.source) ?? '';
  useEffect(() => {
    if (!prompt.inputs) {
      prompt.inputs = []; // TODO(burdon): Required?
    }

    const regex = new RegExp(nameRegex, 'g');
    const variables = new Set<string>([...text.matchAll(regex)].map((m) => m[1]));

    // Create map of unclaimed inputs.
    const unclaimed = new Map<string, ChainType.Input>(prompt.inputs?.map((input) => [input.name, input]));
    const missing: string[] = [];
    Array.from(variables.values()).forEach((name) => {
      if (unclaimed.has(name)) {
        unclaimed.delete(name);
      } else {
        missing.push(name);
      }
    });

    // Match or create new inputs.
    const values = unclaimed.values();
    missing.forEach((name) => {
      const next = values.next().value;
      if (next) {
        next.name = name;
      } else {
        prompt.inputs.push(new ChainType.Input({ name }));
      }
    });

    // Remove unclaimed (deleted) inputs.
    // TODO(burdon): If user types incorrect name value, it will be deleted. Garbage collect?
    for (const input of values) {
      prompt.inputs.splice(prompt.inputs.indexOf(input), 1);
    }
  }, [text]);
};

type PromptTemplateProps = {
  prompt: ChainType.Prompt;
};

export const PromptTemplate = ({ prompt }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const { themeMode } = useThemeContext();

  const { doc, accessor } = useDocAccessor(prompt.source);

  const { parentRef } = useTextEditor(
    () => ({
      doc,
      extensions: [
        createDataExtensions({ id: prompt.id, text: accessor }),
        createBasicExtensions({
          bracketMatching: false,
          lineWrapping: true,
          placeholder: t('template placeholder'),
        }),
        createThemeExtensions({
          themeMode,
          slots: {
            content: { className: '!p-3' },
          },
        }),
        promptExtension,
      ],
    }),
    [themeMode, accessor, prompt.id],
  );
  usePromptInputs(prompt);

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
        <Section title='Prompt'>
          <div className='flex items-center pl-4'>
            <span className='text-neutral-500'>/</span>
            <Input.Root>
              <Input.TextInput
                placeholder={t('command placeholder')}
                classNames={mx('is-full bg-transparent m-2')}
                value={prompt.command ?? ''}
                onChange={(event) => {
                  prompt.command = event.target.value.replace(/\W/g, '');
                }}
              />
            </Input.Root>
          </div>
        </Section>

        <Section title='Template'>
          <div ref={parentRef} className={attentionSurface} />
        </Section>

        {prompt.inputs?.length > 0 && (
          <Section title='Inputs'>
            <div className='flex flex-col divide-y'>
              <table className='table-fixed border-collapse'>
                <tbody>
                  {prompt.inputs.map((input) => (
                    <tr key={input.name}>
                      <td className='px-3 py-1.5 w-[200px] font-mono text-sm'>{input.name}</td>
                      <td className='px-3 py-1.5 w-[160px]'>
                        <Input.Root>
                          <Select.Root
                            value={String(input.type)}
                            onValueChange={(type) => {
                              input.type = getInputType(type) ?? ChainType.Input.Type.VALUE;
                            }}
                          >
                            <Select.TriggerButton placeholder='Type' classNames='is-full' />
                            <Select.Portal>
                              <Select.Content>
                                <Select.Viewport>
                                  {inputTypes.map(({ value, label }) => (
                                    <Select.Option key={value} value={String(value)}>
                                      {label}
                                    </Select.Option>
                                  ))}
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </Input.Root>
                      </td>
                      <td className='px-3'>
                        {[
                          ChainType.Input.Type.VALUE,
                          ChainType.Input.Type.CONTEXT,
                          ChainType.Input.Type.RESOLVER,
                          ChainType.Input.Type.SCHEMA,
                        ].includes(input.type) && (
                          <Input.Root>
                            <Input.TextInput
                              placeholder={t('command placeholder')}
                              classNames={mx('is-full bg-transparent m-2')}
                              value={input.value ?? ''}
                              onChange={(event) => {
                                input.value = event.target.value;
                              }}
                            />
                          </Input.Root>
                        )}
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

export const Section = ({ title, actions, children }: PropsWithChildren<{ title: string; actions?: JSX.Element }>) => {
  return (
    <div className={mx('border rounded-md', groupBorder)}>
      <div
        className={mx('flex h-[32px] items-center bg-neutral-50 dark:bg-neutral-800 rounded-t border-b', groupBorder)}
      >
        <h2 className='px-2 text-xs'>{title}</h2>
        <div className='grow' />
        {actions}
      </div>
      {children}
    </div>
  );
};
