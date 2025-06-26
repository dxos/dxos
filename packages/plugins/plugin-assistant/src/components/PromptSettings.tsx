//
// Copyright 2025 DXOS.org
//

import { Match, type Schema } from 'effect';
import React, { type ChangeEvent, useCallback } from 'react';

import { debounce } from '@dxos/async';
import { Input, Select, Toolbar, useTranslation } from '@dxos/react-ui';

import { ASSISTANT_PLUGIN } from '../meta';
import { TemplateKinds, type TemplateType, type TemplateKindSchema } from '../types';

export const PromptSettings = ({ template }: { template: TemplateType }) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);

  const handleKindChange = useCallback(
    (value: string) => {
      const kind = Match.type<string>().pipe(
        Match.withReturnType<Schema.Schema.Type<typeof TemplateKindSchema>>(),
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
    debounce((event: ChangeEvent<HTMLInputElement>) => {
      if (template.kind.include === 'schema-matching') {
        template.kind.typename = event.target.value;
      }
    }, 300),
    [template.kind.include],
  );

  const handleDescriptionChange = useCallback(
    debounce((event: ChangeEvent<HTMLInputElement>) => {
      if (template.kind.include === 'automatically') {
        template.kind.description = event.target.value;
      }
    }, 300),
    [template.kind.include],
  );

  return (
    <div className='flex flex-col gap-4'>
      <h2>{t('prompt rules label')}</h2>
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
              defaultValue={template.kind.typename}
              onChange={handleTypenameChange}
            />
          </Input.Root>
        )}
        {template.kind.include === 'automatically' && (
          <Input.Root>
            <Input.TextInput
              placeholder={t('description placeholder')}
              defaultValue={template.kind.description}
              onChange={handleDescriptionChange}
            />
          </Input.Root>
        )}
      </Toolbar.Root>
    </div>
  );
};
