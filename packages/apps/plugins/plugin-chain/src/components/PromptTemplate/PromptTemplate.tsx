//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useEffect } from 'react';

import { type ChainInput, ChainInputType, type ChainPromptType } from '@braneframe/types';
import { type S } from '@dxos/echo-schema';
import { createDocAccessor } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { attentionSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { nameRegex, promptExtension } from './prompt-extension';
import { CHAIN_PLUGIN } from '../../meta';

const inputTypes = [
  {
    value: ChainInputType.VALUE,
    label: 'Value',
  },
  {
    value: ChainInputType.PASS_THROUGH,
    label: 'Pass through',
  },
  {
    value: ChainInputType.RETRIEVER,
    label: 'Retriever',
  },
  // {
  //   value: ChainInputType.FUNCTION,
  //   label: 'Function',
  // },
  // {
  //   value: ChainInputType.QUERY,
  //   label: 'Query',
  // },
  {
    value: ChainInputType.RESOLVER,
    label: 'Resolver',
  },
  {
    value: ChainInputType.CONTEXT,
    label: 'Context',
  },
  {
    value: ChainInputType.SCHEMA,
    label: 'Schema',
  },
];

const getInputType = (type: string) => inputTypes.find(({ value }) => String(value) === type)?.value;

const usePromptInputs = (prompt: ChainPromptType) => {
  useEffect(() => {
    const text = prompt.template ?? '';
    if (!prompt.inputs) {
      prompt.inputs = []; // TODO(burdon): Required?
    }

    const regex = new RegExp(nameRegex, 'g');
    const variables = new Set<string>([...text.matchAll(regex)].map((m) => m[1]));

    // Create map of unclaimed inputs.
    const unclaimed = new Map<string, ChainInput>(
      prompt.inputs?.filter(nonNullable).map((input) => [input.name, input]),
    );
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
        prompt.inputs?.push({ name });
      }
    });

    // Remove unclaimed (deleted) inputs.
    // TODO(burdon): If user types incorrect name value, it will be deleted. Garbage collect?
    for (const input of values) {
      prompt.inputs.splice(prompt.inputs.indexOf(input), 1);
    }
  }, [prompt.template]);
};

type PromptTemplateProps = { prompt: ChainPromptType; commandEditable?: boolean; schema?: S.Schema<any, any, any> };

export const PromptTemplate = ({ prompt, commandEditable = true }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const { themeMode } = useThemeContext();

  const { parentRef } = useTextEditor(
    () => ({
      doc: prompt.template,
      extensions: [
        createDataExtensions({
          id: prompt.id,
          text: prompt.template !== undefined ? createDocAccessor(prompt, ['template']) : undefined,
        }),
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
    [themeMode, prompt],
  );

  usePromptInputs(prompt);

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
        {commandEditable && (
          <Section title='Command'>
            <div className='flex items-center pl-4'>
              <span className='text-neutral-500'>/</span>
              <Input.Root>
                <Input.TextInput
                  placeholder={t('command placeholder')}
                  classNames={mx('is-full bg-transparent m-2')}
                  value={prompt.command ?? ''}
                  onChange={(event) => {
                    prompt.command = event.target.value.replace(/\w/g, '');
                  }}
                />
              </Input.Root>
            </div>
          </Section>
        )}

        <Section title='Template'>
          <div ref={parentRef} className={mx(attentionSurface, 'rounded', 'min-h-[120px]')} />
        </Section>

        {(prompt.inputs?.length ?? 0) > 0 && (
          <Section title='Inputs'>
            <div className='flex flex-col'>
              {/* TODO(zan): Improve layout with grid */}
              <table className='w-full table-fixed border-collapse my-2'>
                <tbody>
                  {prompt.inputs?.filter(nonNullable).map((input) => (
                    <tr key={input.name}>
                      <td className='w-[160px] p-1 font-mono text-sm whitespace-nowrap truncate'>
                        <code className='px-2'>{input.name}</code>
                      </td>
                      <td className='w-[120px] p-1'>
                        <Input.Root>
                          <Select.Root
                            value={String(input.type)}
                            onValueChange={(type) => {
                              input.type = getInputType(type) ?? ChainInputType.VALUE;
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
                      <td className='p-1 pr-2'>
                        {input.type !== undefined &&
                          [
                            ChainInputType.VALUE,
                            ChainInputType.CONTEXT,
                            ChainInputType.RESOLVER,
                            ChainInputType.SCHEMA,
                          ].includes(input.type) && (
                            <div>
                              <Input.Root>
                                <Input.TextInput
                                  placeholder={t('command placeholder')}
                                  classNames={mx('is-full bg-transparent')}
                                  value={input.value ?? ''}
                                  onChange={(event) => {
                                    input.value = event.target.value;
                                  }}
                                />
                              </Input.Root>
                            </div>
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
