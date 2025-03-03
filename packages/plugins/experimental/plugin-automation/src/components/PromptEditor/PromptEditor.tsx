//
// Copyright 2023 DXOS.org
//

import { type Schema as S } from '@effect/schema';
import React, { useEffect } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { Input, Select, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { attentionSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { nameRegex, promptExtension } from './prompt-extension';
import { AUTOMATION_PLUGIN } from '../../meta';
import { type ChainInput, ChainInputType, type ChainPromptType } from '../../types';

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
      prompt.inputs?.filter(isNonNullable).map((input) => [input.name, input]),
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

export type PromptEditorProps = {
  prompt: ChainPromptType;
  commandEditable?: boolean;
  schema?: S.Schema<any, any, any>;
};

export const PromptEditor = ({ prompt, commandEditable = true }: PromptEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const { themeMode } = useThemeContext();

  const { parentRef } = useTextEditor(
    () => ({
      initialValue: prompt.template,
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
    <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
      {commandEditable && (
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
      )}

      <div ref={parentRef} className={mx(attentionSurface, 'rounded', 'min-h-[120px]')} />

      {(prompt.inputs?.length ?? 0) > 0 && (
        <div className='flex flex-col'>
          {/* TODO(zan): Improve layout with grid */}
          <table className='w-full table-fixed border-collapse my-2'>
            <tbody>
              {prompt.inputs?.filter(isNonNullable).map((input) => (
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
      )}
    </div>
  );
};
