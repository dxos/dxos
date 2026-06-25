//
// Copyright 2026 DXOS.org
//

import { RunInstructions } from '@dxos/assistant-toolkit';
import { Instructions, Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';

/** A ref to the shared RunInstructions operation in the registry (resolved via the registry, not the database). */
export const runInstructionsRef = () => Ref.fromURI(RunInstructions.meta.key);

/** Whether a runnable/function ref targets the registry RunInstructions operation (i.e. an instructions action). */
export const isRunInstructions = (runnable: unknown): boolean =>
  Ref.isRef(runnable) && runnable.uri === RunInstructions.meta.key;

/**
 * The Instructions object a routine's `runnable` points at, or undefined for an operation action. An
 * instructions action stores its owned Instructions directly as the runnable (the executing operation is the
 * implicit static RunInstructions); this resolves it so callers don't reach through the trigger.
 *
 * The owned instructions is always resolvable in place (a local in-memory target or, once persisted, an
 * attached resolver), so `.target` short-circuits; an unhydrated registry ref (e.g. an operation runnable on
 * an in-memory draft) has neither and is treated as "not instructions" rather than dereferenced.
 */
export const runnableInstructions = (runnable: unknown): Instructions.Instructions | undefined => {
  const target = Ref.isRef(runnable) && runnable.isAvailable ? runnable.target : undefined;
  return Obj.instanceOf(Instructions.Instructions, target) ? target : undefined;
};

/** The Operation a routine's `runnable` points at (an operation action), or undefined for an instructions action. */
export const runnableOperation = (runnable: unknown): Ref.Ref<Operation.PersistentOperation> | undefined => {
  // An instructions action stores the instructions object as the runnable; any other runnable ref is an
  // operation action. Its target may be an unhydrated registry operation (not resolvable on an in-memory
  // draft), so it is not dereferenced here — the ref itself is the operation reference.
  if (!Ref.isRef(runnable) || runnableInstructions(runnable)) {
    return undefined;
  }
  return runnable as Ref.Ref<Operation.PersistentOperation>;
};
