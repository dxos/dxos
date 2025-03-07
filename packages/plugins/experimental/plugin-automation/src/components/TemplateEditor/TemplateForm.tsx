//
// Copyright 2023 DXOS.org
//

import { type Schema as S } from '@effect/schema';
import React, { useEffect } from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { attentionSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { TemplateEditor } from './TemplateEditor';
import { AUTOMATION_PLUGIN } from '../../meta';
import { type TemplateInput, TemplateInputType, type TemplateType } from '../../types';

export type TemplateFormProps = {
  template: TemplateType;
  schema?: S.Schema<any, any, any>;
  commandEditable?: boolean;
};

export const TemplateForm = ({ template, commandEditable = true }: TemplateFormProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  usePromptInputs(template);

  return (
    <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
      {commandEditable && (
        <div className='flex items-center pl-4'>
          <span className='text-neutral-500'>/</span>
          <Input.Root>
            <Input.TextInput
              placeholder={t('command placeholder')}
              classNames={mx('is-full bg-transparent m-2')}
              value={template.command ?? ''}
              onChange={(event) => {
                template.command = event.target.value.replace(/\w/g, '');
              }}
            />
          </Input.Root>
        </div>
      )}

      <TemplateEditor template={template} classNames={[attentionSurface, 'min-h-[120px]']} />

      {(template.inputs?.length ?? 0) > 0 && (
        <div className='flex flex-col'>
          {/* TODO(zan): Improve layout with grid */}
          <table className='w-full table-fixed border-collapse my-2'>
            <tbody>
              {template.inputs?.filter(isNonNullable).map((input) => (
                <tr key={input.name}>
                  <td className='w-[160px] p-1 font-mono text-sm whitespace-nowrap truncate'>
                    <code className='px-2'>{input.name}</code>
                  </td>
                  <td className='w-[120px] p-1'>
                    <Input.Root>
                      <Select.Root
                        value={String(input.type)}
                        onValueChange={(type) => {
                          input.type = getInputType(type) ?? TemplateInputType.VALUE;
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
                        TemplateInputType.VALUE,
                        TemplateInputType.CONTEXT,
                        TemplateInputType.RESOLVER,
                        TemplateInputType.SCHEMA,
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

const inputTypes = [
  {
    value: TemplateInputType.VALUE,
    label: 'Value',
  },
  {
    value: TemplateInputType.PASS_THROUGH,
    label: 'Pass through',
  },
  {
    value: TemplateInputType.RETRIEVER,
    label: 'Retriever',
  },
  // {
  //   value: TemplateInputType.FUNCTION,
  //   label: 'Function',
  // },
  // {
  //   value: TemplateInputType.QUERY,
  //   label: 'Query',
  // },
  {
    value: TemplateInputType.RESOLVER,
    label: 'Resolver',
  },
  {
    value: TemplateInputType.CONTEXT,
    label: 'Context',
  },
  {
    value: TemplateInputType.SCHEMA,
    label: 'Schema',
  },
];

export const nameRegex = /\{\{([\w-]+)\}\}/;

const getInputType = (type: string) => inputTypes.find(({ value }) => String(value) === type)?.value;

const usePromptInputs = (template: TemplateType) => {
  useEffect(() => {
    const text = template.source ?? '';
    if (!template.inputs) {
      template.inputs = []; // TODO(burdon): Required?
    }

    const regex = new RegExp(nameRegex, 'g');
    const variables = new Set<string>([...text.matchAll(regex)].map((m) => m[1]));

    // Create map of unclaimed inputs.
    const unclaimed = new Map<string, TemplateInput>(
      template.inputs?.filter(isNonNullable).map((input) => [input.name, input]),
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
        template.inputs?.push({ name });
      }
    });

    // Remove unclaimed (deleted) inputs.
    // TODO(burdon): If user types incorrect name value, it will be deleted. Garbage collect?
    for (const input of values) {
      template.inputs.splice(template.inputs.indexOf(input), 1);
    }
  }, [template.source]);
};
