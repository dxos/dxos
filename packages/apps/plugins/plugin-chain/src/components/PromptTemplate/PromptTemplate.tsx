//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Chain as ChainType } from '@braneframe/types';
import { invariant } from '@dxos/invariant';
import { TextObject } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select, useTranslation } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { groupBorder, mx } from '@dxos/react-ui-theme';

import { promptLanguage } from './language';
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
  {
    value: ChainType.Input.Type.FUNCTION,
    label: 'Function',
  },
  {
    value: ChainType.Input.Type.QUERY,
    label: 'Query',
  },
];

const getInputType = (type: string) => inputTypes.find(({ value }) => String(value) === type)?.value;

type PromptTemplateProps = {
  prompt: ChainType.Prompt;
};

export const PromptTemplate = ({ prompt }: PromptTemplateProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: prompt.source });
  const [inputs] = useState(new Map<string, ChainType.Input>());

  const text = prompt.source?.text ?? '';
  useEffect(() => {
    const regex = /\{([a-zA-Z_]+)}/g;
    const variables = new Set<string>([...text.matchAll(regex)].map((m) => m[1]));

    // Set initial values.
    if (!prompt.inputs.length) {
      prompt.inputs = Array.from(variables.values()).map(
        (name) => new ChainType.Input({ name, value: new TextObject() }),
      );
      return;
    }

    // Remove matches.
    const existing = new Map<string, ChainType.Input>(inputs);
    Array.from(variables.values()).forEach((name) => {
      existing.delete(name);
    });

    // Find missing.
    const name = Array.from(variables.values()).find((name) => !existing.has(name));
    if (name) {
      if (existing.size === 0) {
        inputs.set(name, new ChainType.Input({ name, value: new TextObject() }));
      } else {
        invariant(existing.size === 1);
        const previous = existing.keys().next().value;
        inputs.set(name, existing.get(previous.value)!);
      }
    }
  }, [text]);

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
                  prompt.command = event.target.value;
                }}
              />
            </Input.Root>
          </div>
        </Section>

        <Section title='Template'>
          <TextEditor
            model={model}
            extensions={[promptLanguage]}
            slots={{
              root: {
                className: 'w-full',
              },
              editor: {
                placeholder: t('template placeholder'),
              },
            }}
          />
        </Section>

        {prompt.inputs?.length && (
          <Section title='Inputs'>
            <div className='flex flex-col divide-y'>
              <table className='table-fixed border-collapse'>
                <tbody>
                  {prompt.inputs.map((input) => (
                    <tr key={input.name}>
                      <td className='p-2 w-[200px] font-mono text-sm'>{'{' + input.name + '}'}</td>
                      <td className='p-2 w-[160px]'>
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
                      <td className='p-2'>
                        <ValueEditor input={input} />
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

const ValueEditor = ({ input }: { input: ChainType.Input }) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: input.value });

  return (
    <TextEditor
      model={model}
      extensions={[promptLanguage]}
      slots={{
        root: {
          className: mx('w-full border-b', groupBorder),
        },
        editor: {
          placeholder: t('value placeholder'),
        },
      }}
    />
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
