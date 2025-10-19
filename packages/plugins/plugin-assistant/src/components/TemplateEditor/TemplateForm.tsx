//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { Fragment, useEffect } from 'react';

import { type Template } from '@dxos/blueprints';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { attentionSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

import { TemplateEditor } from './TemplateEditor';

export type TemplateFormProps = {
  id: string;
  template: Template.Template;
  schema?: Schema.Schema<any, any, any>;
  commandEditable?: boolean;
};

export const TemplateForm = ({ id, template, commandEditable = true }: TemplateFormProps) => {
  const { t } = useTranslation(meta.id);
  usePromptInputs(template);

  return (
    <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
      {/* {commandEditable && (
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
      )} */}

      <TemplateEditor id={id} template={template} classNames={[attentionSurface, 'min-h-[120px]']} />

      {(template.inputs?.length ?? 0) > 0 && (
        <div className='grid grid-cols-[10rem_10rem_1fr] gap-1 items-center'>
          {template.inputs?.filter(isNonNullable).map((input) => (
            <Fragment key={input.name}>
              <div className='pis-3 text-blueText'>{input.name}</div>

              <Input.Root>
                <Select.Root
                  value={input.kind}
                  onValueChange={(kind) => {
                    input.kind = kind as Template.InputKind;
                  }}
                >
                  <Select.TriggerButton placeholder='Type' classNames='is-full' />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {inputs.map(({ kind, label }) => (
                          <Select.Option key={kind} value={kind}>
                            {label}
                          </Select.Option>
                        ))}
                      </Select.Viewport>
                      <Select.Arrow />
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Input.Root>

              <div>
                {input.kind !== undefined && ['value', 'context', 'resolver', 'schema'].includes(input.kind) && (
                  <div>
                    <Input.Root>
                      <Input.TextInput
                        placeholder={t('command placeholder')}
                        classNames='is-full bg-transparent'
                        value={input.default ?? ''}
                        onChange={(event) => {
                          input.default = event.target.value;
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

// TODO(burdon): Translations.
const inputs: { kind: Template.InputKind; label: string }[] = [
  {
    kind: 'value',
    label: 'Value',
  },
  {
    kind: 'pass-through',
    label: 'Pass through',
  },
  {
    kind: 'retriever',
    label: 'Retriever',
  },
  {
    kind: 'function',
    label: 'Function',
  },
  {
    kind: 'query',
    label: 'Query',
  },
  {
    kind: 'resolver',
    label: 'Resolver',
  },
  {
    kind: 'context',
    label: 'Context',
  },
  {
    kind: 'schema',
    label: 'Schema',
  },
];

export const NAME_REGEXP = /\{\{([\w-]+)\}\}/;

const usePromptInputs = (template: Template.Template) => {
  useEffect(() => {
    const text = template.source ?? '';
    if (!template.inputs) {
      template.inputs = []; // TODO(burdon): Required?
    }

    const regex = new RegExp(NAME_REGEXP, 'g');
    const variables = new Set<string>([...(text.target?.content.matchAll(regex) ?? [])].map((m) => m[1]));

    // Create map of unclaimed inputs.
    const unclaimed = new Map<string, Template.Input>(
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
