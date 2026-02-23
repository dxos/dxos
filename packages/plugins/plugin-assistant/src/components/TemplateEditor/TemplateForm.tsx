//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { Fragment, useCallback, useEffect } from 'react';

import { type Template } from '@dxos/blueprints';
import { type Obj } from '@dxos/echo';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { attentionSurface, groupBorder, mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

import { TemplateEditor } from './TemplateEditor';

/**
 * Callback type for mutating template within a parent object's Obj.change context.
 */
export type TemplateChangeCallback = (mutate: (template: Obj.Mutable<Template.Template>) => void) => void;

export type TemplateFormProps = {
  id: string;
  template: Template.Template;
  schema?: Schema.Schema<any, any, any>;
  commandEditable?: boolean;
  /**
   * Callback to mutate the template. Should wrap mutations in parent's Obj.change.
   * If not provided, the component is read-only.
   */
  onChange?: TemplateChangeCallback;
};

export const TemplateForm = ({ id, template, commandEditable = true, onChange }: TemplateFormProps) => {
  const { t } = useTranslation(meta.id);
  usePromptInputs(template, onChange);

  const handleInputKindChange = useCallback(
    (inputName: string, kind: Template.InputKind) => {
      onChange?.((t) => {
        const input = t.inputs?.find((i) => i?.name === inputName);
        if (input) {
          input.kind = kind;
        }
      });
    },
    [onChange],
  );

  const handleInputDefaultChange = useCallback(
    (inputName: string, value: string) => {
      onChange?.((t) => {
        const input = t.inputs?.find((i) => i?.name === inputName);
        if (input) {
          input.default = value;
        }
      });
    },
    [onChange],
  );

  return (
    <div className={mx('flex flex-col inline-full overflow-hidden gap-4', groupBorder)}>
      {/* {commandEditable && (
        <div className='flex items-center pl-4'>
          <span className='text-neutral-500'>/</span>
          <Input.Root>
            <Input.TextInput
              placeholder={t('command placeholder')}
              classNames='inline-full bg-transparent m-2'
              value={template.command ?? ''}
              onChange={(event) => {
                onChange?.((t) => {
                  t.command = event.target.value.replace(/\w/g, '');
                });
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
              <div className='pl-3 text-blue-text'>{input.name}</div>

              <Input.Root>
                <Select.Root
                  value={input.kind}
                  onValueChange={(kind) => handleInputKindChange(input.name, kind as Template.InputKind)}
                >
                  <Select.TriggerButton placeholder='Type' classNames='inline-full' />
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
                        classNames='inline-full bg-transparent'
                        value={input.default ?? ''}
                        onChange={(event) => handleInputDefaultChange(input.name, event.target.value)}
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

const usePromptInputs = (template: Template.Template, onChange?: TemplateChangeCallback) => {
  useEffect(() => {
    if (!onChange) {
      return;
    }

    const text = template.source ?? '';

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
    onChange((t) => {
      if (!t.inputs) {
        t.inputs = [];
      }

      missing.forEach((name) => {
        const next = values.next().value;
        if (next) {
          // Find the input in the mutable draft and update it.
          const inputIndex = t.inputs!.findIndex((i) => i?.name === next.name);
          if (inputIndex !== -1) {
            t.inputs![inputIndex].name = name;
          }
        } else {
          t.inputs!.push({ name });
        }
      });

      // Remove unclaimed (deleted) inputs.
      // TODO(burdon): If user types incorrect name value, it will be deleted. Garbage collect?
      for (const input of values) {
        const inputIndex = t.inputs!.findIndex((i) => i?.name === input.name);
        if (inputIndex !== -1) {
          t.inputs!.splice(inputIndex, 1);
        }
      }
    });
  }, [template.source, onChange]);
};
