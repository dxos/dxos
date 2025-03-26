//
// Copyright 2025 DXOS.org
//

import { Match, type Schema as S } from 'effect';
import React, { type ChangeEvent, useCallback } from 'react';

import { Input, Select, Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';
import { ASSISTANT_PLUGIN } from '../meta';
import { TemplateKinds, type TemplateKindSchema, type TemplateType } from '../types';

export const TemplateContainer = ({ template, role }: { template: TemplateType; role: string }) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);

  const handleKindChange = useCallback(
    (value: string) => {
      const kind = Match.type<string>().pipe(
        Match.withReturnType<S.Schema.Type<typeof TemplateKindSchema>>(),
        Match.when('always', () => ({ include: 'always' })),
        Match.when('schema-matching', () => ({ include: 'schema-matching', typename: '' })),
        Match.when('automatically', () => ({ include: 'automatically', description: '' })),
        Match.orElse(() => ({ include: 'manual' })),
      )(value);

      template.kind = kind;
    },
    [template],
  );

  const handleTypenameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (template.kind.include === 'schema-matching') {
        template.kind.typename = event.target.value;
      }
    },
    [template],
  );

  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (template.kind.include === 'automatically') {
        template.kind.description = event.target.value;
      }
    },
    [template],
  );

  return (
    <StackItem.Content toolbar role={role} classNames='mli-auto w-full max-w-[50rem]'>
      <Toolbar.Root>
        <Select.Root value={template.kind.include} onValueChange={handleKindChange}>
          <Toolbar.Button asChild>
            <Select.TriggerButton />
          </Toolbar.Button>
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {TemplateKinds.map((kind) => (
                  <Select.Option key={kind} value={kind}>
                    {kind}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {template.kind.include === 'schema-matching' && (
          <Input.Root>
            <Input.TextInput
              placeholder={t('typename placeholder')}
              value={template.kind.typename}
              onChange={handleTypenameChange}
            />
          </Input.Root>
        )}
        {template.kind.include === 'automatically' && (
          <Input.Root>
            <Input.TextInput
              placeholder={t('description placeholder')}
              value={template.kind.description}
              onChange={handleDescriptionChange}
            />
          </Input.Root>
        )}
      </Toolbar.Root>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
