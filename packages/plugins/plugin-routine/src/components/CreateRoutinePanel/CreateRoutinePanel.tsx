//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import type * as Routine from '@dxos/compute/Routine';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { RoutineCapabilities } from '#types';

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
 *
 * A caller can seed the panel via `initialFormValues`: `templateId` skips the picker and scaffolds that
 * template immediately, and `subject` is passed to the scaffold (e.g. the connector flow seeds its sync
 * template with the just-bound target so the user sees — and can edit — the routine being created).
 */
export const CreateRoutinePanel = ({
  target,
  initialFormValues,
  onCreateObject,
  templates: templatesProp,
}: CreateRoutinePanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const capabilityTemplates = useCapabilities(RoutineCapabilities.Template);
  const templates = templatesProp ?? capabilityTemplates;
  const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
  const [draft, setDraft] = useState<Draft | undefined>();
  const seededTemplateId: string | undefined = initialFormValues?.templateId;
  const subject: Obj.Unknown | undefined = initialFormValues?.subject;

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

      try {
        // The scaffold returns a fully-wired in-memory routine draft graph (its owned trigger/instructions
        // bound and parented); nothing is persisted until Save.
        const scaffolded = await EffectEx.runPromise(
          template.scaffold({ subject }).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
        );
        setDraft({ templateId, routine: scaffolded });
      } catch (error) {
        // A scaffold that requires context the subject lacks (e.g. a sync binding) fails typed; keep the
        // picker up rather than crashing the dialog.
        log.catch(error);
      }
    },
    [templates, db, subject],
  );

  // Seeded flow: skip the picker and scaffold the named template immediately (once per mount).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededTemplateId && !seededRef.current) {
      seededRef.current = true;
      void handleSelect(seededTemplateId);
    }
  }, [seededTemplateId, handleSelect]);

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
