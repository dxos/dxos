//
// Copyright 2026 DXOS.org
//

import { Instructions, Trigger } from '@dxos/compute';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { deepMapValues } from '@dxos/util';

import { Routine } from '#types';

import { isRunInstructions, runInstructionsRef } from './run-instructions';

/** In-memory edit session: the detached clones the routine article edits before they are saved. */
export type RoutineDraft = {
  routine: Routine.Routine;
  instructions?: Instructions.Instructions;
  trigger?: Trigger.Trigger;
};

/**
 * Merges an edit session's draft clones back into the persisted routine aggregate: general fields, the action,
 * and the primary trigger. Instructions/triggers are created on first save and reused thereafter, so repeated
 * saves never duplicate them.
 */
export const saveRoutine = async (
  db: Database.Database,
  routine: Routine.Routine,
  draft: RoutineDraft,
): Promise<void> => {
  saveGeneralFields(routine, draft);
  const instructions = await saveAction(db, routine, draft);
  saveTrigger(db, routine, draft, instructions);
  await db.flush();
};

/** Write the general (name/description) fields back to the persisted routine. */
const saveGeneralFields = (routine: Routine.Routine, draft: RoutineDraft): void => {
  Obj.update(routine, (routine) => {
    routine.name = draft.routine.name;
    routine.description = draft.routine.description;
  });
};

/**
 * Save the routine's action and point `runnable` at it. An operation action binds the chosen operation
 * directly; otherwise the action runs the routine's owned instructions through the registry RunInstructions
 * operation. Returns the persisted instructions (for the trigger to bind), or undefined for an operation action.
 */
const saveAction = async (
  db: Database.Database,
  routine: Routine.Routine,
  draft: RoutineDraft,
): Promise<Instructions.Instructions | undefined> => {
  // The only runnables are operations, so any non-RunInstructions runnable is an operation action.
  const isOperationAction = draft.routine.runnable != null && !isRunInstructions(draft.routine.runnable);
  if (isOperationAction) {
    Obj.update(routine, (routine) => {
      routine.runnable = draft.routine.runnable;
    });
    return undefined;
  }

  if (!draft.instructions) {
    return undefined;
  }

  const instructions = await upsertInstructions(db, routine, draft.instructions);
  Obj.update(routine, (routine) => {
    routine.runnable = runInstructionsRef();
  });
  return instructions;
};

/**
 * Reuse the routine's owned instructions if present (so repeat saves never duplicate it), else promote the
 * draft into the database. The body is written as a minimal Automerge delta via {@link Doc.updateText}.
 */
const upsertInstructions = async (
  db: Database.Database,
  routine: Routine.Routine,
  draft: Instructions.Instructions,
): Promise<Instructions.Instructions> => {
  const body = draft.text?.target?.content ?? '';
  const owned = await db.query(Filter.type(Instructions.Instructions)).run();
  const existing = owned.find((candidate) => Obj.getParent(candidate)?.id === routine.id);
  if (existing) {
    Obj.update(existing, (existing) => {
      existing.name = draft.name;
      existing.skills = [...draft.skills];
      existing.objects = draft.objects ? [...draft.objects] : undefined;
    });
    const text = existing.text?.target;
    if (text) {
      Doc.updateText(text, ['content'], body);
    }
    return existing;
  }

  const created = db.add(
    Instructions.make({
      name: draft.name,
      text: body,
      skills: [...(draft.skills ?? [])],
      objects: draft.objects ? [...draft.objects] : undefined,
    }),
  );
  Obj.setParent(created, routine);
  return created;
};

/**
 * Persist the routine's primary trigger once a kind (spec) has been chosen, wiring its `function` to the
 * routine's runnable and binding `instructions` as input for an instructions action. Reuses the existing
 * trigger if present.
 */
const saveTrigger = (
  db: Database.Database,
  routine: Routine.Routine,
  draft: RoutineDraft,
  instructions: Instructions.Instructions | undefined,
): void => {
  if (!draft.trigger?.spec) {
    return;
  }

  // The draft spec is a reactive sub-object of the draft trigger; ECHO rejects assigning a foreign reactive
  // object, so map it to a plain tree, preserving any `Ref` (e.g. a feed spec's feed).
  const spec = deepMapValues(draft.trigger.spec, (value, recurse) =>
    Ref.isRef(value) ? value : recurse(value),
  ) as Trigger.Spec;
  const runnable = routine.runnable;
  const input = instructions ? { instructions: Ref.make(instructions), input: {} } : undefined;

  // `enabled` is owned by the routine-level toolbar toggle, not the edit session: an existing trigger keeps its
  // current flag; a newly created trigger starts disabled until enabled from the toolbar.
  const existing = primaryTrigger(routine);
  if (existing) {
    Obj.update(existing, (existing) => {
      // `spec`'s subscription QueryAST is deeply readonly while the live `spec` field is mutable; the
      // structures are identical at runtime, so a readonly->mutable boundary coercion is required here.
      existing.spec = spec as typeof existing.spec;
      existing.runnable = runnable;
      existing.input = input;
    });
    return;
  }

  const created = db.add(Trigger.make({ spec, enabled: false, runnable, input }));
  Obj.setParent(created, routine);
  Obj.update(routine, (routine) => {
    routine.triggers = [...routine.triggers, Ref.make(created)];
  });
};

/** The routine's primary (first) trigger, resolved from its `triggers` refs. */
const primaryTrigger = (routine: Routine.Routine): Trigger.Trigger | undefined => {
  for (const ref of routine.triggers) {
    const target = ref.target;
    if (Obj.instanceOf(Trigger.Trigger, target)) {
      return target;
    }
  }
  return undefined;
};
