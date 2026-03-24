//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type { Script } from '@dxos/functions';

/**
 * Service providing Edge deployment and invocation capabilities for scripts.
 */
export class ScriptDeploymentService extends Context.Tag('plugin-script/ScriptDeploymentService')<
  ScriptDeploymentService,
  {
    /** Deploys a script to the Edge runtime. */
    readonly deploy: (script: Script.Script) => Effect.Effect<{ functionId: string; functionUrl?: string }>;

    /** Returns the invocation URL of a deployed script, or undefined if not deployed. */
    readonly getFunctionUrl: (script: Script.Script) => Effect.Effect<string | undefined>;
  }
>() {}
