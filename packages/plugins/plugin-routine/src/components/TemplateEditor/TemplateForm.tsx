//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { Fragment, useCallback, useEffect } from 'react';

import type * as Template from '@dxos/compute/Template';
import { type Obj } from '@dxos/echo';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

import { TemplateEditor } from './TemplateEditor.tsx';

/**
 * Callback type for mutating template within a parent object's Obj.update context.
 */
export type TemplateChangeCallback = (mutate: (template: Obj.Mutable<Template.Template>) => void) => void;

export type TemplateFormProps = {
  id: string;
  template: Template.Template;
  schema?: Schema.Codec<any, any, any>;
  /**
   * Callback to mutate the template. Should wrap mutations in parent's Obj.update.
   * If not provided, the component is read-only.
   */
  onChange?: TemplateChangeCallback;
};

export const TemplateForm = ({ id, template, onChange }: TemplateFormProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
      <TemplateEditor id={id} source={template.source} classNames='dx-base-surface min-h-[120px]' />

      {(template.inputs?.length ?? 0) > 0 && (
        <Layout.Grid cols={['10rem', '10rem', '1fr']} align='center' classNames='gap-1'>
          {template.inputs?.filter(isNonNullable).map((input) => (
            <Fragment key={input.name}>
              <div className='ps-3 text-blue-text'>{input.name}</div>

              <Field.Root>
                <Select.Root
                  value={[input.kind]}
                  onValueChange={({ value: [kind] }) => handleInputKindChange(input.name, kind as Template.InputKind)}
                  items={inputs.map(({ kind, label }) => ({ value: kind, label: label }))}
                >
                  <Select.Trigger placeholder='Type' classNames='w-full' />
                  <Select.Content>
                    {inputs.map(({ kind, label }) => (
                      <Select.Item key={kind} item={{ value: kind, label: label }} />
                    ))}
                  </Select.Content>
                </Select.Root>
              </Field.Root>

              <div>
                {input.kind === 'value' && (
                  <Field.Root>
                    <Input.Root
                      placeholder={t('command.placeholder')}
                      classNames='w-full bg-transparent'
                      value={input.default ?? ''}
                      onChange={(event) => handleInputDefaultChange(input.name, event.target.value)}
                    />
                  </Field.Root>
                )}
              </div>
            </Fragment>
          ))}
        </Layout.Grid>
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
