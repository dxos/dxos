//
// Copyright 2024 DXOS.org
//

import fs from 'fs';

import { Args, Flags } from '@oclif/core';

import { Trigger, debounce } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Function } from '@dxos/functions';
import { Script } from '@dxos/functions';
import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { Text } from '@dxos/schema';

import { BaseCommand } from '../../base';
import { findFunctionByDeploymentId } from '../../util/function/lookup';

const LOCAL_FUNCTIONS_RUNTIME_URL = 'http://127.0.0.1:3123';

export default class Watch extends BaseCommand<typeof Watch> {
  static override enableJsonFlag = true;
  static override description = 'Hot reload script on file changes.';

  static override flags = {
    ...BaseCommand.flags,
    functionId: Flags.string({ description: 'Existing UserFunction ID to update.', required: true }),
    spaceKey: Flags.string({ description: 'Space key to create/update Script source in.' }),
  };

  static override args = {
    file: Args.string({ required: true }),
  };

  async run(): Promise<any> {
    return this.execWithSpace(async ({ client, space }) => {
      client.addTypes([Text.Text, Function.Function, Script.Script]);

      const { scriptContent } = await this._loadFunctionObject(space);

      this._logWithTime(`Watching for changes in ${this.args.file}`);

      const updateSource = debounce(async () => {
        const readinessCheckResult = await this._isRuntimeReady();

        if (!readinessCheckResult.ready) {
          this._logWithTime(`Functions runtime readiness check failed: ${readinessCheckResult.reason}`);
          return;
        }

        const source = fs.readFileSync(this.args.file, 'utf-8');
        const bundleResult = await bundleFunction({
          source,
        });
        if ('error' in bundleResult) {
          this._logWithTime('Source bundling failed, waiting for new changes...');
          return;
        }

        const updateResult = await this._uploadSource(bundleResult.bundle);
        if (updateResult.success) {
          if (scriptContent) {
            scriptContent.content = source;
          }
          this._logWithTime('Worker source updated');
        } else {
          this._logWithTime(`Failed to update worker source, reason: ${updateResult.reason}`);
        }
      }, 2000);

      const trigger = new Trigger();

      fs.watch(this.args.file, (event) => {
        if (event === 'rename') {
          trigger.wake();
        } else {
          void updateSource();
        }
      });

      await trigger.wait();
    });
  }

  private async _loadFunctionObject(space: Space) {
    const matchingFunction = await findFunctionByDeploymentId(space, this.flags.functionId);

    if (!matchingFunction) {
      this.log(`Function with id ${this.flags.functionId} not found in space ${space.id}.`);
      this._printUploadInstruction();
      this.exit();
    }

    if (!matchingFunction.source) {
      return { functionObject: matchingFunction };
    }

    const script = await matchingFunction.source.load();
    const content = await script.source.load();
    return { functionObject: matchingFunction, scriptContent: content };
  }

  private async _isRuntimeReady(): Promise<{ ready: true } | { ready: false; reason: string }> {
    try {
      const result = await fetch(`${LOCAL_FUNCTIONS_RUNTIME_URL}/sanity`);
      if (result.status !== 200) {
        this.log(`Function runtime sanity check failed: ${result.statusText}`);
      }
    } catch (err) {
      return { ready: false, reason: `Functions runtime not running, expected on ${LOCAL_FUNCTIONS_RUNTIME_URL}` };
    }

    try {
      const functionId = this.flags.functionId;

      const result = await fetch(`${LOCAL_FUNCTIONS_RUNTIME_URL}/workers/${functionId}/versions`);
      if (result.status !== 200) {
        return { ready: false, reason: `Deployment status check failed: ${result.statusText}` };
      }

      const bodyJson = await result.json();
      if (!bodyJson.versions?.length) {
        return { ready: false, reason: `Function with id ${functionId} is not deployed.` };
      }

      return { ready: true };
    } catch (err: any) {
      return { ready: false, reason: `Deployment status check failed, reason: ${err.message ?? 'unknown'}` };
    }
  }

  private async _uploadSource(bundledScript: string) {
    try {
      const result = await fetch(`${LOCAL_FUNCTIONS_RUNTIME_URL}/workers/${this.flags.functionId}/source`, {
        method: 'PUT',
        body: Buffer.from(bundledScript),
      });
      if (result.status !== 200) {
        return { success: false, reason: result.statusText };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, reason: err.message ?? 'unknown' };
    }
  }

  private _logWithTime(message: string): void {
    this.log(`[${new Date().toTimeString().split(' ')[0]}] ${message}`);
  }

  private _printUploadInstruction(): void {
    const message = ['Try running:', '', 'dx function upload scriptFilePath'].join('\n');
    this.log(message);
  }
}
