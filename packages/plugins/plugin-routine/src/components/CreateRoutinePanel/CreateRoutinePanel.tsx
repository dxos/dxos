//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { RoutineCapabilities } from '#types';

export type CreateRoutinePanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to RoutineCapabilities.Template. */
  templates?: RoutineCapabilities.Template[];
};

/**
 * Create panel for routines: a SearchList picker over contributed templates. Selecting one submits
 * `{ templateId }`; plugin-routine's CreateObjectEntry.createObject resolves the templateId and runs the
 * template's `scaffold`.
 */
export const CreateRoutinePanel = ({ onCreateObject, templates: templatesProp }: CreateRoutinePanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const capabilityTemplates = useCapabilities(RoutineCapabilities.Template);
  const templates = templatesProp ?? capabilityTemplates;
  // The global create dialog has no subject, so subject-required templates (e.g. CRM, which needs a
  // Mailbox) are excluded; they are offered from the relevant object's Automation companion instead.
  const sorted = useMemo(
    () =>
      [...templates]
        .filter((template) => template.appliesTo?.(undefined) ?? true)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [templates],
  );
  const { results, handleSearch } = useSearchListResults({ items: sorted, extract: (template) => template.label });

  const handleSelect = useCallback(
    (templateId: string) => {
      void onCreateObject({ templateId });
    },
    [onCreateObject],
  );

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Input
        classNames='mb-form-gap'
        autoFocus
        data-testid='create-automation-panel.template-input'
        placeholder={t('create-panel.template.placeholder')}
      />
      <SearchList.Viewport>
        {results.map((template) => (
          <SearchList.Item
            key={template.id}
            value={template.id}
            label={template.label}
            icon={template.icon ?? 'ph--lightning--regular'}
            onSelect={() => handleSelect(template.id)}
          />
        ))}
      </SearchList.Viewport>
    </SearchList.Root>
  );
};
