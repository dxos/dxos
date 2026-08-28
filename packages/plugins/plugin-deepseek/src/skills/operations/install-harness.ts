//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref, URI } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as Sandbox from '@dxos/plugin-sandbox/Sandbox';
import * as SandboxOperation from '@dxos/plugin-sandbox/SandboxOperation';

import {
  DEEPSEEK_API_KEY_ENV,
  DEEPSEEK_SOURCE,
  DEFAULT_HARNESS_PACKAGE,
  DEFAULT_RUN_TIMEOUT_MS,
  DEFAULT_SANDBOX_NAME,
} from '../../constants';
import { HarnessInstallError, MissingCredentialError } from '../../errors';
import { InstallHarness } from './definitions';
import { buildInstallCommand } from './harness-command';

export default InstallHarness.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, baseImage, harnessPackage }) {
      const accessTokens = yield* Database.query(Filter.type(AccessToken.AccessToken)).run;
      const accessToken = accessTokens.find(
        (accessToken) => accessToken.source === DEEPSEEK_SOURCE && accessToken.token.length > 0,
      );
      if (!accessToken) {
        return yield* Effect.fail(new MissingCredentialError());
      }

      const { sandboxId } = yield* Operation.invoke(SandboxOperation.CreateSandbox, {
        name: name ?? DEFAULT_SANDBOX_NAME,
        baseImage,
      });
      const sandbox = yield* Database.resolve(URI.make(sandboxId), Sandbox.Sandbox);

      // Bound by reference, never by value: exec resolves the token at call time, so the key
      // reaches the container's environment without passing through an operation result.
      Obj.update(sandbox, (sandbox) => {
        sandbox.credentials = [{ env: DEEPSEEK_API_KEY_ENV, token: Ref.make(accessToken) }];
      });

      const install = yield* Operation.invoke(SandboxOperation.Exec, {
        sandbox: Ref.make(sandbox),
        command: buildInstallCommand(harnessPackage ?? DEFAULT_HARNESS_PACKAGE),
        timeout: DEFAULT_RUN_TIMEOUT_MS,
      });
      if (!install.success) {
        return yield* Effect.fail(
          new HarnessInstallError({ context: { exitCode: install.exitCode, stderr: install.stderr } }),
        );
      }

      return { sandboxId, installOutput: [install.stdout, install.stderr].filter(Boolean).join('\n') };
    }),
  ),
);
