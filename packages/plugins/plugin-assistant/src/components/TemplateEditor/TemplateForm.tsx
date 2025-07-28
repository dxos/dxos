//
// Copyright 2023 DXOS.org
//

import { type Schema } from 'effect';
import React, { Fragment, useEffect } from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { attentionSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { TemplateEditor } from './TemplateEditor';
import { meta } from '../../meta';
import { type TemplateInput, TemplateInputType, type TemplateType } from '../../types';

export type TemplateFormProps = {
  template: TemplateType;
  schema?: Schema.Schema<any, any, any>;
  commandEditable?: boolean;
};

export const TemplateForm = ({ template, commandEditable = true }: TemplateFormProps) => {
  const { t } = useTranslation(meta.id);
  usePromptInputs(template);

  return (
    <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
      {commandEditable && (
        <div className='flex items-center pl-4'>
          <span className='text-neutral-500'>/</span>
          <Input.Root>
            <Input.TextInput
              placeholder={t('command placeholder')}
              classNames='is-full bg-transparent m-2'
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
        <div className='grid grid-cols-[10rem_10rem_1fr] gap-1 items-center'>
          {template.inputs?.filter(isNonNullable).map((input) => (
            <Fragment key={input.name}>
              <div className='pis-3 text-blueText'>{input.name}</div>

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

              <div>
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
                          classNames='is-full bg-transparent'
                          value={input.value ?? ''}
                          onChange={(event) => {
                            input.value = event.target.value;
                          }}
                        />
                      </Input.Root>
                    </div>
                  )}
              </div>
            </Fragment>
          ))}
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
