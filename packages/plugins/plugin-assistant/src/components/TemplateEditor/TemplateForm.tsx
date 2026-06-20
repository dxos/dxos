//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { Fragment, useCallback, useEffect } from 'react';

import { type Template } from '@dxos/compute';
import { type Obj } from '@dxos/echo';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

import { TemplateEditor } from './TemplateEditor';

/**
 * Callback type for mutating template within a parent object's Obj.update context.
 */
export type TemplateChangeCallback = (mutate: (template: Obj.Mutable<Template.Template>) => void) => void;

export type TemplateFormProps = {
  id: string;
  template: Template.Template;
  schema?: Schema.Schema<any, any, any>;
  /**
   * Callback to mutate the template. Should wrap mutations in parent's Obj.update.
   * If not provided, the component is read-only.
   */
  onChange?: TemplateChangeCallback;
};

export const TemplateForm = ({ id, template, onChange }: TemplateFormProps) => {
  const { t } = useTranslation(meta.profile.key);
  usePromptInputs(template, onChange);

  const handleInputKindChange = useCallback(
    (inputName: string, kind: Template.InputKind) => {
      onChange?.((draft) => {
        const input = draft.inputs?.find((i) => i?.name === inputName);
        if (input) {
          input.kind = kind;
        }
      });
    },
    [onChange],
  );

  const handleInputDefaultChange = useCallback(
    (inputName: string, value: string) => {
      onChange?.((draft) => {
        const input = draft.inputs?.find((i) => i?.name === inputName);
        if (input) {
          input.default = value;
        }
      });
    },
    [onChange],
  );

  return (
    <div className='flex flex-col w-full overflow-hidden gap-4'>
      <TemplateEditor id={id} source={template.source} classNames='bg-base-surface min-h-[120px]' />

      {(template.inputs?.length ?? 0) > 0 && (
        <div className='grid grid-cols-[10rem_10rem_1fr] gap-1 items-center'>
          {template.inputs?.filter(isNonNullable).map((input) => (
            <Fragment key={input.name}>
              <div className='ps-3 text-blue-text'>{input.name}</div>

              <Input.Root>
                <Select.Root
                  value={input.kind}
                  onValueChange={(kind) => handleInputKindChange(input.name, kind as Template.InputKind)}
                >
                  <Select.TriggerButton placeholder='Type' classNames='w-full' />
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
                {input.kind === 'value' && (
                  <Input.Root>
                    <Input.TextInput
                      placeholder={t('command.placeholder')}
                      classNames='w-full bg-transparent'
                      value={input.default ?? ''}
                      onChange={(event) => handleInputDefaultChange(input.name, event.target.value)}
                    />
                  </Input.Root>
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
    kind: 'operation',
    label: 'Operation',
  },
  // {
  //   kind: 'pass-through',
  //   label: 'Pass through',
  // },
  // {
  //   kind: 'retriever',
  //   label: 'Retriever',
  // },
  // {
  //   kind: 'query',
  //   label: 'Query',
  // },
  // {
  //   kind: 'resolver',
  //   label: 'Resolver',
  // },
  // {
  //   kind: 'context',
  //   label: 'Context',
  // },
  // {
  //   kind: 'schema',
  //   label: 'Schema',
  // },
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
    onChange((draft) => {
      if (!draft.inputs) {
        draft.inputs = [];
      }

      missing.forEach((name) => {
        const next = values.next().value;
        if (next) {
          // Find the input in the mutable draft and update it.
          const inputIndex = draft.inputs!.findIndex((i) => i?.name === next.name);
          if (inputIndex !== -1) {
            draft.inputs![inputIndex].name = name;
          }
        } else {
          draft.inputs!.push({ name, kind: 'value' });
        }
      });

      // Remove unclaimed (deleted) inputs.
      // TODO(burdon): If user types incorrect name value, it will be deleted. Garbage collect?
      for (const input of values) {
        const inputIndex = draft.inputs!.findIndex((i) => i?.name === input.name);
        if (inputIndex !== -1) {
          draft.inputs!.splice(inputIndex, 1);
        }
      }
    });
  }, [template.source, onChange]);
};
