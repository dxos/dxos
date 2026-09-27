//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Field, useTranslation } from '@dxos/react-ui';
import { Form, useFormContext, useSubmitOnEnter } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { ProjectCapabilities } from '#types';

export type CreateProjectPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to ProjectCapabilities.Template. */
  templates?: ProjectCapabilities.Template[];
};

const CreateProjectValues = Schema.Struct({
  name: Schema.optional(Schema.String),
  templateId: Schema.String,
});

type CreateProjectValues = Schema.Schema.Type<typeof CreateProjectValues>;

/**
 * Create panel for projects: an optional name plus a SearchList picker over contributed templates.
 * Picking a template selects it (Default, else the first, initially); Save submits `{ name, templateId }`,
 * which plugin-projects' CreateObjectEntry `createObject` resolves to run the template's `scaffold`.
 */
export const CreateProjectPanel = ({ onCreateObject, onCancel, templates: templatesProp }: CreateProjectPanelProps) => {
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

  const [selectedId, setSelectedId] = useState<string>();
  // Preselected so Save is ready without a pick; kept among the visible results so a filter never
  // leaves Save acting on a row it hid.
  const templateId = results.some(({ id }) => id === selectedId)
    ? selectedId
    : (results.find(({ id }) => id === ProjectCapabilities.DefaultTemplateId) ?? results[0])?.id;
  const values = useMemo(() => ({ name, templateId }), [name, templateId]);

  // Returned so the form's `saving` guard keeps Save disabled until creation settles.
  const handleSave = useCallback(
    async ({ name, templateId }: CreateProjectValues) =>
      onCreateObject({ name: name?.trim() || undefined, templateId }),
    [onCreateObject],
  );

  return (
    <Form.Root schema={CreateProjectValues} values={values} onSave={handleSave} onCancel={onCancel}>
      <Form.Viewport>
        {/* `Form.Content` pads its bottom only, so the top is matched here to sit off the dialog's
            chrome; the gap spaces the name field from the template picker, which are otherwise flush. */}
        <CreateProjectContent>
          <Field.Root>
            <Field.Input
              autoFocus
              data-testid='create-project-panel.name-input'
              placeholder={t('create-panel.name.placeholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field.Root>
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
                  checked={template.id === templateId}
                  onSelect={() => setSelectedId(template.id)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Root>
          <Form.Actions />
        </CreateProjectContent>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Form body where a plain Enter in the name field saves (the picker spends Enter on picking). */
const CreateProjectContent = ({ children }: PropsWithChildren) => {
  const {
    form: { canSave, onSave },
  } = useFormContext(CreateProjectContent.displayName);
  const contentRef = useRef<HTMLDivElement>(null);
  useSubmitOnEnter(contentRef, () => canSave && onSave());

  return (
    <Form.Content classNames='pt-form-padding gap-form-gap' ref={contentRef}>
      {children}
    </Form.Content>
  );
};

CreateProjectContent.displayName = 'CreateProjectPanel.Content';
