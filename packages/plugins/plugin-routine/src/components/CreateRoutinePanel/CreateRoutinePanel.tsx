//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useActivationSignal, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Routine from '@dxos/compute/Routine';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { RoutineCapabilities, RoutineEvents } from '#types';

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
 * the chosen template's scaffolded in-memory draft (the same edit surface as the article). Save submits
 * `{ templateId, draft }`; plugin-routine's CreateObjectEntry.createObject persists the draft (a single
 * `Database.add` cascades the owned trigger/instructions). Cancel returns to the picker.
 *
 * A template with an `inputSchema` takes one step more: its form is collected first and the values reach
 * the scaffold as `input` (e.g. the mailbox an Analyze Mailbox routine watches).
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
  // Demand signal: every template but the built-in blank is contributed by another plugin and parked
  // until this event; the picker reads them reactively, so they pop in as their chunks arrive.
  useActivationSignal(RoutineEvents.Start);
  const capabilityTemplates = useCapabilities(RoutineCapabilities.Template);
  const { invokePromise } = useOperationInvoker();
  const templates = templatesProp ?? capabilityTemplates;
  const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
  const [draft, setDraft] = useState<Draft | undefined>();
  // Template awaiting its `inputSchema` values before it can scaffold.
  const [pending, setPending] = useState<RoutineCapabilities.Template | undefined>();
  const seededTemplateId: string | undefined = initialFormValues?.templateId;
  const subject: Obj.Unknown | undefined = initialFormValues?.subject;

  const sorted = useMemo(
    () => templates.filter((template) => !template.hidden).sort((a, b) => a.label.localeCompare(b.label)),
    [templates],
  );
  const { results, handleSearch } = useSearchListResults({ items: sorted, extract: (template) => template.label });

  const scaffold = useCallback(
    async (template: RoutineCapabilities.Template, input?: unknown) => {
      if (!db) {
        return;
      }

      try {
        // The scaffold returns a fully-wired in-memory routine draft graph (its owned trigger/instructions
        // bound and parented); nothing is persisted until Save.
        const scaffolded = await EffectEx.runPromise(
          template.scaffold({ subject, input }).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
        );
        setPending(undefined);
        setDraft({ templateId: template.id, routine: scaffolded });
      } catch (error) {
        // A scaffold that requires context its input lacks (e.g. a sync binding) fails typed; keep the
        // picker up and toast the reason, or the click looks ignored.
        log.catch(error);
        void invokePromise?.(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.scaffold-failed`,
          icon: 'ph--warning--regular',
          title: ['create-panel.scaffold-error.label', { ns: meta.profile.key }],
        });
      }
    },
    [db, subject, invokePromise],
  );

  const handleSelect = useCallback(
    async (templateId: string) => {
      const template = templates.find((template) => template.id === templateId);
      if (!template) {
        return;
      }
      if (template.inputSchema) {
        setPending(template);
        return;
      }

      await scaffold(template);
    },
    [templates, scaffold],
  );

  // Seeded flow: skip the picker and scaffold the named template. Latched on the template arriving
  // rather than on mount — a seeded template is contributed by another plugin and lands a tick or
  // more after the panel opens, and a one-shot mount effect would find nothing and never retry.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededTemplateId || seededRef.current || !templates.some(({ id }) => id === seededTemplateId)) {
      return;
    }
    seededRef.current = true;
    void handleSelect(seededTemplateId);
  }, [seededTemplateId, templates, handleSelect]);

  // Returns the promise so the form's `saving` guard disables Save until creation settles — a
  // discarded promise would let a double-click create (and sync) the routine twice.
  const handleSave = useCallback(async () => {
    if (draft) {
      await onCreateObject({ templateId: draft.templateId, draft: draft.routine });
    }
  }, [draft, onCreateObject]);

  const handleCancel = useCallback(() => setDraft(undefined), []);

  if (draft && db) {
    return <RoutineForm db={db} routine={draft.routine} onSave={handleSave} onCancel={handleCancel} />;
  }

  if (pending?.inputSchema) {
    return (
      <Form.Root
        key={pending.id}
        db={db}
        schema={pending.inputSchema}
        // Returned, not discarded: the form holds its `saving` guard until the scaffold settles.
        onSave={(input) => scaffold(pending, input)}
        onCancel={() => setPending(undefined)}
      >
        <Form.Content>
          <Form.FieldSet />
          {/* Continue, not Save: the routine form is the next step and the commit. */}
          <Form.Actions submitLabel={t('continue.label')} submitIcon='ph--arrow-right--regular' />
        </Form.Content>
      </Form.Root>
    );
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
