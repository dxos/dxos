//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useState } from 'react';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Blueprint, Instructions } from '@dxos/compute';
import { type Database, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Panel, useTranslation } from '@dxos/react-ui';

import { RoutineForm, MasterDetail } from '#components';
import { meta } from '#meta';
import { Routine } from '#types';

/** An in-memory draft automation (with its owned routine) not yet added to the database. */
type Draft = { automation: Routine.Routine; routine: Instructions.Instructions };

export type RoutineCompanionProps = {
  db: Database.Database;
  object: Obj.Unknown;
};

/**
 * Per-object companion: a master-detail list of the automations anchored to the object via the
 * {@link Routine.AppliesTo} relation. Selecting a row shows its {@link RoutineForm}; "Create"
 * scaffolds a draft pre-filled with the object (bound as routine context) and the object type's
 * blueprints. Mirrors the Chat companion's blueprint/context binding.
 *
 * The draft automation + routine are added to the database immediately (the routine's Markdown
 * instructions editor needs a db-attached object), but the anchoring relation — what makes the
 * automation appear in this list — is created only on Save; Cancel removes the draft. So an
 * abandoned draft leaves no association behind.
 */
export const RoutineCompanion = ({ db, object }: RoutineCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);

  // Relations anchoring automations to this object; the master list is their sources.
  const relations = useQuery(db, Query.select(Filter.id(object.id)).targetOf(Routine.AppliesTo));
  const automations = useMemo(
    () =>
      relations
        .map((relation) => Relation.getSource(relation))
        .filter((source): source is Routine.Routine => Routine.instanceOf(source)),
    [relations],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState<Draft | undefined>();
  const selected = useMemo(
    () => automations.find((automation) => automation.id === selectedId),
    [automations, selectedId],
  );

  const handleSelect = useCallback((id: string | undefined) => {
    setDraft(undefined);
    setSelectedId(id);
  }, []);

  const handleCreate = useCallback(() => {
    // Pre-fill: bind the object as routine context and attach the object type's blueprints. The routine
    // and automation are added to the db now (the instructions editor needs a db-attached object); the
    // anchoring relation is deferred to save.
    const routine = db.add(Instructions.make({ blueprints: blueprintRefsForObject(object), objects: [Ref.make(object)] }));
    const automation = db.add(Routine.make({ triggers: [] }));
    Obj.setParent(routine, automation);
    setSelectedId(undefined);
    setDraft({ automation, routine });
  }, [db, object]);

  const handleCancel = useCallback(() => {
    if (draft) {
      // Remove the unsaved draft; its owned routine cascade-deletes.
      db.remove(draft.automation);
    }
    setDraft(undefined);
  }, [draft, db]);

  const handleSave = useCallback(() => {
    if (!draft) {
      return;
    }
    // Anchor the automation to the object; this is what surfaces it in the list.
    db.add(Routine.makeAppliesTo({ [Relation.Source]: draft.automation, [Relation.Target]: object }));
    setSelectedId(draft.automation.id);
    setDraft(undefined);
  }, [draft, db, object]);

  const handleDelete = useCallback(
    (automation: Routine.Routine) => {
      // Remove the anchoring relation, then the automation (its owned routine cascade-deletes).
      const relation = relations.find((candidate) => Relation.getSource(candidate)?.id === automation.id);
      if (relation) {
        db.remove(relation);
      }
      db.remove(automation);
      setSelectedId((current) => (current === automation.id ? undefined : current));
    },
    [relations, db],
  );

  const detail = draft ? (
    <DraftEditor db={db} draft={draft} onSave={handleSave} onCancel={handleCancel} />
  ) : selected ? (
    <RoutineForm db={db} automation={selected} />
  ) : null;

  return (
    <Panel.Root>
      <Panel.Content classNames='dx-document'>
        <MasterDetail<Routine.Routine>
          items={automations}
          selectedId={draft ? undefined : selectedId}
          onSelect={handleSelect}
          onDelete={handleDelete}
          getLabel={(automation) =>
            Obj.getLabel(automation) ?? t('object-name.placeholder', { ns: Type.getTypename(Routine.Routine) })
          }
          getIcon={() => 'ph--lightning--regular'}
          onCreate={handleCreate}
          createLabel={t('add-automation.label')}
          emptyLabel={t('no-automations.message')}
          detail={detail}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

/** Draft automation editor: the pre-filled form plus Save/Cancel; persists nothing until Save. */
const DraftEditor = ({
  db,
  draft,
  onSave,
  onCancel,
}: {
  db: Database.Database;
  draft: Draft;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div role='none' className='flex flex-col min-bs-0'>
      <RoutineForm db={db} automation={draft.automation} routine={draft.routine} />
      <div role='none' className='flex justify-end gap-2 p-2 border-bs border-subdued-separator'>
        <Button onClick={onCancel}>{t('cancel.label')}</Button>
        <Button variant='primary' onClick={onSave}>
          {t('save.label')}
        </Button>
      </div>
    </div>
  );
};

/** Registry blueprint refs declared by the object type's {@link AppAnnotation.BlueprintsAnnotation}. */
const blueprintRefsForObject = (object: Obj.Unknown): Ref.Ref<Blueprint.Blueprint>[] => {
  const type = Obj.getType(object);
  if (!type) {
    return [];
  }
  const keys = Option.getOrElse(() => [] as string[])(AppAnnotation.BlueprintsAnnotation.get(Type.getSchema(type)));
  return keys.map((key) => Ref.fromURI(Blueprint.registryURI(key)));
};
