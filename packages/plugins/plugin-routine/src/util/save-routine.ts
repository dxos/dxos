//
// Copyright 2026 DXOS.org
//

import { Instructions, Trigger } from '@dxos/compute';
import { type Database, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { deepMapValues } from '@dxos/util';

import { Routine } from '#types';

import { runInstructionsRef, runnableInstructions } from './run-instructions';

/** The routine's primary (first) owned trigger, resolved from its `triggers` refs. */
export const primaryTrigger = (routine: Routine.Routine): Trigger.Trigger | undefined => {
  for (const ref of routine.triggers) {
    const target = ref.target;
    if (Obj.instanceOf(Trigger.Trigger, target)) {
      return target;
    }
  }
  return undefined;
};

/**
 * Persist an in-memory routine draft graph (the routine plus its owned trigger and instructions).
 *
 * The draft is either freshly scaffolded (create) or a deep `'parent'`, id-retaining clone of a persisted
 * routine (edit). The action is read off `runnable`: an Instructions runnable is an instructions action (the
 * owned instructions is upserted and the trigger dispatches it through RunInstructions); anything else is an
 * operation action (the operation is bound directly). Switching an action from instructions to operation
 * deletes the now-orphaned instructions; switching to instructions creates a fresh one. An existing trigger
 * keeps its toolbar-owned `enabled` flag; a new routine's trigger starts enabled (committing a reviewed draft
 * turns it on), while a trigger newly added to an existing routine starts disabled.
 */
export const saveRoutine = async (db: Database.Database, draft: Routine.Routine): Promise<Routine.Routine> => {
  const draftTrigger = primaryTrigger(draft);
  const draftInstructions = runnableInstructions(draft.runnable);
  // The operation ref for an operation action (undefined when the runnable is the instructions).
  const draftRunnable = draft.runnable;

  // Resolve the persisted routine: the live object for an edit clone (same id), or the freshly-added draft.
  let routine = db.getObjectById<Routine.Routine>(draft.id);
  const isNewRoutine = routine == null;
  if (!routine) {
    // Detach the owned children before adding so they aren't auto-cascaded; the owned trigger and instructions
    // are (re)created/reused explicitly below, sourcing field values from the draft graph.
    Obj.update(draft, (draft) => {
      draft.triggers = [];
      draft.runnable = undefined;
    });
    routine = db.add(draft);
  }

  saveGeneralFields(routine, draft);
  const instructions = saveAction(db, routine, draftRunnable, draftInstructions);
  saveTrigger(db, routine, draftTrigger, instructions, isNewRoutine);
  await db.flush();
  return routine;
};

/** Write the general (name/description) fields back to the persisted routine. */
const saveGeneralFields = (routine: Routine.Routine, draft: Routine.Routine): void => {
  Obj.update(routine, (routine) => {
    routine.name = draft.name;
    routine.description = draft.description;
  });
};

/**
 * Save the routine's action and point `runnable` at it. An instructions action upserts the owned instructions
 * (reused on re-save, created when switching from an operation) and stores it as the runnable; an operation
 * action binds the operation directly and deletes any instructions the routine owned before the switch.
 * Returns the persisted instructions (for the trigger to bind), or undefined for an operation action.
 */
const saveAction = (
  db: Database.Database,
  routine: Routine.Routine,
  draftRunnable: Routine.Routine['runnable'],
  draftInstructions: Instructions.Instructions | undefined,
): Instructions.Instructions | undefined => {
  const existing = runnableInstructions(routine.runnable);
  if (draftInstructions) {
    const instructions = existing ?? createOwnedInstructions(db, routine, draftInstructions);
    if (existing) {
      updateInstructions(existing, draftInstructions);
    }
    Obj.update(routine, (routine) => {
      routine.runnable = Ref.make(instructions);
    });
    return instructions;
  }

  // Operation action (or unconfigured): drop the previously-owned instructions when switching away.
  if (existing) {
    db.remove(existing);
  }
  Obj.update(routine, (routine) => {
    routine.runnable = draftRunnable;
  });
  return undefined;
};

/** Promote a draft instructions into the database as a child of the routine. */
const createOwnedInstructions = (
  db: Database.Database,
  routine: Routine.Routine,
  draft: Instructions.Instructions,
): Instructions.Instructions => {
  const created = db.add(
    Instructions.make({
      name: draft.name,
      text: draft.text?.target?.content ?? '',
      skills: [...(draft.skills ?? [])],
      objects: draft.objects ? [...draft.objects] : undefined,
    }),
  );
  Obj.setParent(created, routine);
  return created;
};

/** Copy a draft instructions' fields onto the persisted one; the body is a minimal Automerge delta. */
const updateInstructions = (existing: Instructions.Instructions, draft: Instructions.Instructions): void => {
  Obj.update(existing, (existing) => {
    existing.name = draft.name;
    existing.skills = [...draft.skills];
    existing.objects = draft.objects ? [...draft.objects] : undefined;
  });
  const text = existing.text?.target;
  if (text) {
    Doc.updateText(text, ['content'], draft.text?.target?.content ?? '');
  }
};

/**
 * Persist the routine's primary trigger once a kind (spec) has been chosen. The trigger's `function` is
 * RunInstructions for an instructions action (with the instructions bound as input) or the operation for an
 * operation action (whose input carries operation-specific bindings such as `{ magazine: Ref }`). Reuses the
 * existing trigger if present.
 */
const saveTrigger = (
  db: Database.Database,
  routine: Routine.Routine,
  draftTrigger: Trigger.Trigger | undefined,
  instructions: Instructions.Instructions | undefined,
  enabledByDefault: boolean,
): void => {
  if (!draftTrigger?.spec) {
    return;
  }

  // The draft spec/input are reactive sub-objects of the draft trigger (and, for an edit, of a clone); ECHO
  // rejects assigning a foreign reactive object, so map them to plain trees, preserving any `Ref`.
  const toPlain = <T>(value: T): T =>
    deepMapValues(value, (value, recurse) => (Ref.isRef(value) ? value : recurse(value))) as T;
  const spec = toPlain(draftTrigger.spec) as Trigger.Spec;

  // For an instructions action the trigger dispatches RunInstructions with the instructions bound (preserving
  // any template-provided input fields like `input: '{{event.item}}'`); for an operation action the function is
  // the operation and the draft input passes through (minus any stale instructions binding).
  const fn = instructions ? runInstructionsRef() : routine.runnable;
  // Start from the draft input minus any (possibly stale/cloned) instructions binding, then add a fresh ref to
  // the persisted instructions for an instructions action.
  const baseInput = toPlain(withoutInstructions(draftTrigger.input));
  const input = instructions ? { input: {}, ...baseInput, instructions: Ref.make(instructions) } : baseInput;

  // `enabled` is owned by the routine-level toolbar toggle, not the edit session: an existing trigger keeps its
  // current flag; a new routine's trigger starts enabled (committing a reviewed draft turns it on), while a
  // trigger added to an existing routine starts disabled.
  const existing = primaryTrigger(routine);
  if (existing) {
    Obj.update(existing, (existing) => {
      // `spec`'s subscription QueryAST is deeply readonly while the live `spec` field is mutable; the
      // structures are identical at runtime, so a readonly->mutable boundary coercion is required here.
      existing.spec = spec as typeof existing.spec;
      existing.function = fn;
      existing.input = input;
    });
    return;
  }

  const created = db.add(Trigger.make({ spec, enabled: enabledByDefault, function: fn, input }));
  Obj.setParent(created, routine);
  Obj.update(routine, (routine) => {
    routine.triggers.push(Ref.make(created));
  });
};

/** Strip an `instructions` binding from a trigger input (an operation action carries no instructions). */
const withoutInstructions = (input: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!input || !('instructions' in input)) {
    return input;
  }
  const { instructions: _drop, ...rest } = input;
  return rest;
};
