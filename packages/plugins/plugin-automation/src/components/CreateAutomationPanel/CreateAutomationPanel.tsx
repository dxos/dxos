//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Button, Column, Icon, Input, useTranslation } from '@dxos/react-ui';
import { type SpaceCapabilities } from '@dxos/plugin-space';

import { meta } from '#meta';
import { AutomationCapabilities } from '#types';

export type CreateAutomationPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to AutomationCapabilities.Template. */
  templates?: AutomationCapabilities.Template[];
};

/**
 * Create panel for automations: a name field plus a list of contributed templates. Selecting a template
 * submits `{ name, templateId }`; plugin-automation's CreateObjectEntry.createObject resolves the templateId
 * and runs the template's `scaffold`.
 */
export const CreateAutomationPanel = ({ onCreateObject, templates: templatesProp }: CreateAutomationPanelProps) => {
  const { t } = useTranslation(meta.id);
  const capabilityTemplates = useCapabilities(AutomationCapabilities.Template);
  const templates = templatesProp ?? capabilityTemplates;
  const [name, setName] = useState('');
  const sorted = useMemo(() => [...templates].sort((a, b) => a.label.localeCompare(b.label)), [templates]);

  const handleSelect = useCallback(
    (templateId: string) => {
      void onCreateObject({ name: name.trim() ? name.trim() : undefined, templateId });
    },
    [name, onCreateObject],
  );

  return (
    <Column.Center>
      <Input.Root>
        <Input.TextInput
          autoFocus
          classNames='mb-form-gap'
          data-testid='create-automation-panel.name-input'
          placeholder={t('automation-name.placeholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Input.Root>
      <div role='list' className='flex flex-col gap-1'>
        {sorted.map((template) => (
          <Button
            key={template.id}
            variant='ghost'
            classNames='justify-start gap-2'
            data-testid={`create-automation-panel.template.${template.id}`}
            onClick={() => handleSelect(template.id)}
          >
            <Icon icon={template.icon ?? 'ph--lightning--regular'} size={5} />
            <span>{template.label}</span>
          </Button>
        ))}
      </div>
    </Column.Center>
  );
};
