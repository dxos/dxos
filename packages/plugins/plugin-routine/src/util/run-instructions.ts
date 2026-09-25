//
// Copyright 2026 DXOS.org
//

import * as AgentOperation from '@dxos/assistant-toolkit/AgentOperation';
import { Ref } from '@dxos/echo';

/** A ref to the shared RunInstructions operation in the registry (resolved via the registry, not the database). */
export const runInstructionsRef = () => Ref.fromURI(AgentOperation.RunInstructions.meta.key);

/** Whether a trigger's `function` ref targets the registry RunInstructions operation (i.e. an instructions action). */
export const isRunInstructions = (fn: unknown): boolean =>
  Ref.isRef(fn) && fn.uri === AgentOperation.RunInstructions.meta.key;
