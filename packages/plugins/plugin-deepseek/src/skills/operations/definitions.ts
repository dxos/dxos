//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Sandbox from '@dxos/plugin-sandbox/Sandbox';

const SandboxRef = Ref.Ref(Sandbox.Sandbox).annotate({
  description: 'The sandbox holding the DeepSeek harness, as returned by InstallHarness.',
});

export const InstallHarness = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deepseek.installHarness'),
    name: 'InstallDeepSeekHarness',
    description:
      'Creates a sandbox, binds the space’s DeepSeek API key to it, and installs the DeepSeek harness CLI in it.',
    icon: 'px--deepseek--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotate({
      description: 'Display name for the sandbox.',
    }),
    baseImage: Schema.optional(Schema.String).annotate({
      description: 'Base container image. Defaults to the sandbox service default.',
    }),
    harnessPackage: Schema.optional(Schema.String).annotate({
      description: 'npm package providing the harness CLI. Defaults to the plugin’s pinned package.',
    }),
  }),
  output: Schema.Struct({
    sandboxId: Schema.String.annotate({
      description: 'ECHO object URI of the sandbox; pass it as `sandbox` to RunHarness.',
    }),
    installOutput: Schema.String.annotate({
      description: 'Combined output of the install step, for diagnosing an unexpected harness version.',
    }),
  }),
  services: [Database.Service],
});

export const RunHarness = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deepseek.runHarness'),
    name: 'RunDeepSeekHarness',
    description:
      'Runs the DeepSeek harness on a prompt inside a sandbox the install operation prepared and returns its output.',
    icon: 'ph--terminal-window--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    prompt: Schema.String.annotate({
      description: 'The task handed to the harness, as the operator would type it.',
    }),
    model: Schema.optional(Schema.String).annotate({
      description: 'DeepSeek model id, e.g. "deepseek-chat". Passed as DEEPSEEK_MODEL.',
    }),
    args: Schema.optional(Schema.Array(Schema.String)).annotate({
      description: 'Extra CLI arguments, inserted before the prompt.',
    }),
    harnessBin: Schema.optional(Schema.String).annotate({
      description: 'Harness executable name. Defaults to the plugin’s pinned binary.',
    }),
    cwd: Schema.optional(Schema.String).annotate({
      description: 'Absolute working directory for the run.',
    }),
    timeout: Schema.optional(Schema.Number).annotate({
      description: 'Timeout in milliseconds.',
    }),
  }),
  output: Schema.Struct({
    stdout: Schema.String,
    stderr: Schema.String,
    exitCode: Schema.Number,
    success: Schema.Boolean,
  }),
});
