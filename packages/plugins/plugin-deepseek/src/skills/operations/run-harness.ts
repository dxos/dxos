//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as SandboxOperation from '@dxos/plugin-sandbox/SandboxOperation';

import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_BASE_URL_ENV,
  DEEPSEEK_MODEL_ENV,
  DEFAULT_HARNESS_BIN,
  DEFAULT_RUN_TIMEOUT_MS,
} from '../../constants.ts';
import { RunHarness } from './definitions.ts';
import { buildRunCommand } from './harness-command.ts';

export default RunHarness.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox, prompt, model, args, harnessBin, cwd, timeout }) {
      // The API key is not passed here: it is bound to the sandbox as a credential ref by
      // InstallHarness and merged into the exec environment on the sandbox side.
      const env: Record<string, string> = { [DEEPSEEK_BASE_URL_ENV]: DEEPSEEK_BASE_URL };
      if (model) {
        env[DEEPSEEK_MODEL_ENV] = model;
      }

      return yield* Operation.invoke(SandboxOperation.Exec, {
        sandbox,
        command: buildRunCommand({ bin: harnessBin ?? DEFAULT_HARNESS_BIN, prompt, args }),
        cwd,
        env,
        timeout: timeout ?? DEFAULT_RUN_TIMEOUT_MS,
      });
    }),
  ),
);
