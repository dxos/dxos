//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useState } from 'react';

import { AppAnnotation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Skill, Instructions } from '@dxos/compute';
import { type Database, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { RoutineForm, MasterDetail } from '#components';
import { meta } from '#meta';
import { Routine } from '#types';

/** An in-memory draft routine (with its owned instructions) not yet added to the database. */
type Draft = {
  routine: Routine.Routine;
  instructions: Instructions.Instructions;
};

export type RoutineCompanionProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

/**
 * Per-object companion: a master-detail list of the automations anchored to the object via the
 * {@link Routine.AppliesTo} relation. Selecting a row shows its {@link RoutineForm}; "Create"
 * scaffolds a draft pre-filled with the object (bound as instructions context) and the object type's
 * skills. Mirrors the Chat companion's skill/context binding.
 *
 * The draft automation + instructions are added to the database immediately (the instructions's Markdown
 * instructions editor needs a db-attached object), but the anchoring relation — what makes the
 * automation appear in this list — is created only on Save; Cancel removes the draft. So an
 * abandoned draft leaves no association behind.
 */
export const RoutineCompanion = ({ subject }: RoutineCompanionProps) => {
  // The automations list and draft editor require a db-attached subject; the companion is only shown for
  // persisted objects, so a missing database means there is nothing to render.
  const db = Obj.getDatabase(subject);
  if (!db) {
    return null;
  }

  return <RoutineCompanionImpl db={db} object={subject} />;
};

const RoutineCompanionImpl = ({ db, object }: { db: Database.Database; object: Obj.Unknown }) => {
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
    // Pre-fill: bind the object as instructions context and attach the object type's skills. The instructions
    // and automation are added to the db now (the instructions editor needs a db-attached object); the
    // anchoring relation is deferred to save.
    const instructions = db.add(Instructions.make({ skills: skillRefsForObject(object), objects: [Ref.make(object)] }));
    const routine = db.add(Routine.make({ triggers: [] }));
    Obj.setParent(instructions, routine);
    setSelectedId(undefined);
    setDraft({ routine, instructions });
  }, [db, object]);

  const handleCancel = useCallback(() => {
    if (draft) {
      // Remove the unsaved draft; its owned instructions cascade-deletes.
      db.remove(draft.routine);
    }

    setDraft(undefined);
  }, [draft, db]);

  const handleSave = useCallback(() => {
    if (!draft) {
      return;
    }

    // Anchor the automation to the object; this is what surfaces it in the list.
    db.add(Routine.makeAppliesTo({ [Relation.Source]: draft.routine, [Relation.Target]: object }));
    setSelectedId(draft.routine.id);
    setDraft(undefined);
  }, [draft, db, object]);

  const handleDelete = useCallback(
    (routine: Routine.Routine) => {
      // Remove the anchoring relation, then the routine (its owned instructions cascade-deletes).
      const relation = relations.find((candidate) => Relation.getSource(candidate)?.id === routine.id);
      if (relation) {
        db.remove(relation);
      }
      db.remove(routine);
      setSelectedId((current) => (current === routine.id ? undefined : current));
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
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content classNames='dx-document'>
        <MasterDetail<Routine.Routine>
          items={automations}
          selectedId={draft ? undefined : selectedId}
          detail={detail}
          onCreate={handleCreate}
          onSelect={handleSelect}
          onDelete={handleDelete}
          getIcon={() => 'ph--lightning--regular'}
          getLabel={(routine) =>
            Obj.getLabel(routine) ?? t('object-name.placeholder', { ns: Type.getTypename(Routine.Routine) })
          }
          createLabel={t('add-automation.label')}
          emptyLabel={t('no-automations.message')}
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
      <RoutineForm db={db} automation={draft.routine} instructions={draft.instructions} />
      <div role='none' className='flex justify-end gap-2 p-2 border-bs border-subdued-separator'>
        <Button onClick={onCancel}>{t('cancel.label')}</Button>
        <Button variant='primary' onClick={onSave}>
          {t('save.label')}
        </Button>
      </div>
    </div>
  );
};

/** Registry skill refs declared by the object type's {@link AppAnnotation.SkillsAnnotation}. */
const skillRefsForObject = (object: Obj.Unknown): Ref.Ref<Skill.Skill>[] => {
  const type = Obj.getType(object);
  if (!type) {
    return [];
  }
  const keys = Option.getOrElse(() => [] as string[])(AppAnnotation.SkillsAnnotation.get(Type.getSchema(type)));
  return keys.map((key) => Ref.fromURI(Skill.registryURI(key)));
};
