//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import type * as Routine from '@dxos/compute/Routine';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';

import * as RoutineCapabilities from '../../types/RoutineCapabilities';
import { RoutineForm } from '../RoutineForm';

export type CreateRoutinePanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to RoutineCapabilities.Template. */
  templates?: RoutineCapabilities.Template[];
};

/** In-progress creation: the chosen template and its scaffolded (unpersisted) routine graph. */
type Draft = {
  templateId: string;
  routine: Routine.Routine;
};

/**
 * Create panel for routines: a SearchList picker over contributed templates, then {@link RoutineForm} over
 * the chosen template's scaffolded in-memory draft (the same edit surface as the article and companion).
 * Save submits `{ templateId, draft }`; plugin-routine's CreateObjectEntry.createObject persists the draft
 * (a single `Database.add` cascades the owned trigger/instructions). Cancel returns to the picker.
 */
export const CreateRoutinePanel = ({ target, onCreateObject, templates: templatesProp }: CreateRoutinePanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const capabilityTemplates = useCapabilities(RoutineCapabilities.Template);
  const templates = templatesProp ?? capabilityTemplates;
  const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
  const [draft, setDraft] = useState<Draft | undefined>();

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
    async (templateId: string) => {
      const template = templates.find((template) => template.id === templateId);
      if (!template || !db) {
        return;
      }

      // The scaffold returns a fully-wired in-memory routine draft graph (its owned trigger/instructions
      // bound and parented); nothing is persisted until Save.
      const scaffolded = await EffectEx.runPromise(
        template.scaffold({}).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      );
      setDraft({ templateId, routine: scaffolded });
    },
    [templates, db],
  );

  const handleSave = useCallback(() => {
    if (draft) {
      void onCreateObject({ templateId: draft.templateId, draft: draft.routine });
    }
  }, [draft, onCreateObject]);

  const handleCancel = useCallback(() => setDraft(undefined), []);

  if (draft && db) {
    return <RoutineForm db={db} routine={draft.routine} onSave={handleSave} onCancel={handleCancel} />;
  }

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
            onSelect={() => void handleSelect(template.id)}
          />
        ))}
      </SearchList.Viewport>
    </SearchList.Root>
  );
};
