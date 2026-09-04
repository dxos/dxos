//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { ProjectCapabilities } from '#types';

export type CreateProjectPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to ProjectCapabilities.Template. */
  templates?: ProjectCapabilities.Template[];
};

/**
 * Create panel for projects: an optional name plus a SearchList picker over contributed templates.
 * Selecting a template submits `{ name, templateId }`; plugin-projects' CreateObjectEntry
 * `createObject` resolves the templateId and runs the template's `scaffold`.
 */
export const CreateProjectPanel = ({ onCreateObject, templates: templatesProp }: CreateProjectPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [name, setName] = useState('');
  const capabilityTemplates = useCapabilities(ProjectCapabilities.Template);

  const templates = templatesProp ?? capabilityTemplates;
  // The global create dialog has no subject, so subject-required templates (e.g. an inbox research
  // template needing a Mailbox) are excluded; they are offered from the relevant object instead.
  const sorted = useMemo(
    () =>
      [...templates]
        .filter((template) => template.appliesTo?.(undefined) ?? true)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [templates],
  );
  const { results, handleSearch } = useSearchListResults({ items: sorted, extract: (template) => template.label });

  const handleSelect = useCallback(
    (templateId: string) => {
      void onCreateObject({ name: name.trim() || undefined, templateId });
    },
    [onCreateObject, name],
  );

  return (
    <Form.Root>
      <Form.Viewport>
        {/* `Form.Content` pads its bottom only, so the top is matched here to sit off the dialog's
            chrome; the gap spaces the name field from the template picker, which are otherwise flush. */}
        <Form.Content classNames='pt-form-padding gap-form-gap'>
          <Input.Root>
            <Input.TextInput
              autoFocus
              data-testid='create-project-panel.name-input'
              placeholder={t('create-panel.name.placeholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Input.Root>
          <SearchList.Root onSearch={handleSearch}>
            <SearchList.Input
              data-testid='create-project-panel.template-input'
              placeholder={t('create-panel.template.placeholder')}
            />
            {/* Flush with the form's column: the viewport's default padding reserves a scroll strip,
                which insets the rows from the name input above them. */}
            <SearchList.Viewport padding={false}>
              {results.map((template) => (
                <SearchList.Item
                  key={template.id}
                  value={template.id}
                  label={template.label}
                  icon={template.icon ?? 'ph--stack--regular'}
                  onSelect={() => handleSelect(template.id)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Root>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
