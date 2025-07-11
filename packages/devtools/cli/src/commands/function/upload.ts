//
// Copyright 2024 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import fs from 'node:fs';
import { basename } from 'node:path';
import path from 'path';

import { asyncTimeout } from '@dxos/async';
import { type PublicKey, type Client } from '@dxos/client';
import { type AnyLiveObject, getMeta, makeRef } from '@dxos/client/echo';
import { type Space } from '@dxos/client-protocol';
import { Obj } from '@dxos/echo';
import { FunctionType, ScriptType, makeFunctionUrl, setUserFunctionUrlInMetadata } from '@dxos/functions';
import { incrementSemverPatch, uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';
import { type UploadFunctionResponseBody } from '@dxos/protocols';
import { DataType } from '@dxos/schema';

import { BaseCommand } from '../../base';
import { bundleScript, findFunctionByDeploymentId } from '../../util';

// TODO: move to cli-composer

export default class Upload extends BaseCommand<typeof Upload> {
  static override enableJsonFlag = true;
  static override description = 'Upload user function.';

  static override flags = {
    ...BaseCommand.flags,
    name: Flags.string({ description: 'Function name.' }),
    version: Flags.string({ description: 'Function version.' }),
    composerScript: Flags.boolean({ description: 'Loads the script into composer.' }),
    functionId: Flags.string({ description: 'Existing UserFunction ID to update.' }),
    spaceKey: Flags.string({ description: 'Space key to create/update Script source in.' }),
    noSpace: Flags.boolean({ description: 'Only uploads a function, without creating a FunctionObject in ECHO.' }),
  };

  static override args = {
    file: Args.string({ required: true }),
  };

  async run(): Promise<any> {
    const { scriptFileContent, bundledScript } = await this._loadScript();

    if (this.flags.noSpace) {
      return this.execWithClient(async ({ client }) => {
        const identity = client.halo.identity.get();
        invariant(identity, 'Identity not available');

        const uploadResult = await this._upload(client, identity.identityKey, undefined, bundledScript);

        this.log(`Upload complete: ${uploadResult.functionId}, version ${uploadResult.version}`);
      });
    }

    return this.execWithSpace(
      async ({ client, space }) => {
        client.addTypes([FunctionType]);

        const identity = client.halo.identity.get();
        invariant(identity, 'Identity not available');

        const existingFunctionObject = await this._loadFunctionObject(space);

        const uploadResult = await this._upload(client, identity.identityKey, existingFunctionObject, bundledScript);

        const functionObject = this._updateFunctionObject(space, existingFunctionObject, uploadResult);

        if (this.flags.composerScript) {
          await this._updateComposerScript(client, space, functionObject, basename(this.args.file), scriptFileContent);
        }
        return uploadResult;
      },
      { spaceKeys: this.flags.spaceKey ? [this.flags.spaceKey] : undefined },
    );
  }

  private async _loadScript() {
    let scriptFileContent: string | undefined;
    try {
      scriptFileContent = fs.readFileSync(this.args.file, 'utf8');
    } catch (err: any) {
      this.error(`Error reading file ${this.args.file}: ${err.message}`);
    }

    const bundleResult = await bundleScript(scriptFileContent);
    if (bundleResult.error || !bundleResult.bundle) {
      this.error(`Error bundling script ${this.args.file}: ${bundleResult.error?.message ?? 'empty output'}`);
    }

    return { scriptFileContent, bundledScript: bundleResult.bundle! };
  }

  private async _loadFunctionObject(space: Space) {
    const matchingFunction = await findFunctionByDeploymentId(space, this.flags.functionId);

    if (this.flags.functionId && !matchingFunction) {
      this.warn(`Function ECHO object not found for ${this.flags.functionId}`);
    }

    if (this.flags.verbose && matchingFunction) {
      this.log(`Function ECHO object found, ID: ${matchingFunction.id}`);
    }

    return matchingFunction;
  }

  private async _upload(
    client: Client,
    ownerPublicKey: PublicKey,
    functionObject: FunctionType | undefined,
    bundledSource: string,
  ): Promise<UploadFunctionResponseBody> {
    let result: UploadFunctionResponseBody;
    try {
      result = await asyncTimeout(
        uploadWorkerFunction({
          client,
          ownerPublicKey,
          version: await this._getNextVersion(functionObject),
          functionId: this.flags.functionId,
          name: this.flags.name,
          source: bundledSource,
        }),
        10_000,
      );
      invariant(result.functionId, 'Upload failed.');
      this.log(`Uploaded function ${result.functionId}, version ${result.version}`);
      return result;
    } catch (err: any) {
      this.error(err.message);
    }
  }

  private _updateFunctionObject(
    space: Space,
    existingObject: FunctionType | undefined,
    uploadResult: UploadFunctionResponseBody,
  ): FunctionType {
    let functionObject = existingObject;
    if (!functionObject) {
      const name = path.basename(this.args.file, path.extname(this.args.file));
      functionObject = space.db.add(Obj.make(FunctionType, { name, version: uploadResult.version }));
    }
    functionObject.name = this.flags.name ?? functionObject.name;
    functionObject.version = uploadResult.version;
    setUserFunctionUrlInMetadata(getMeta(functionObject), makeFunctionUrl(uploadResult));
    return functionObject;
  }

  private async _updateComposerScript(
    client: Client,
    space: Space,
    functionObject: FunctionType,
    scriptFileName: string,
    scriptFileContent: string,
  ): Promise<void> {
    client.addTypes([ScriptType, DataType.Text]);

    if (functionObject.source) {
      const script = await functionObject.source.load();
      const source = await script.source.load();
      source.content = scriptFileContent;
      if (this.flags.verbose) {
        this.log(`Updated source of ${script.id}`);
      }
    } else {
      const sourceObj = space.db.add(Obj.make(DataType.Text, { content: scriptFileContent }));
      const obj = space.db.add(
        Obj.make(ScriptType, { name: this.flags.name ?? scriptFileName, source: makeRef(sourceObj) }),
      );
      functionObject.source = makeRef(obj);
      await makeObjectNavigableInComposer(client, space, obj);
      if (this.flags.verbose) {
        this.log(`Created object, ID: ${obj.id}`);
      }
    }
  }

  private async _getNextVersion(functionObject: FunctionType | undefined): Promise<string> {
    if (this.flags.version) {
      return this.flags.version;
    }

    if (functionObject) {
      return incrementSemverPatch(functionObject?.version ?? '0.0.0');
    }

    return '0.0.1';
  }
}

const makeObjectNavigableInComposer = async (client: Client, space: Space, obj: AnyLiveObject<any>) => {
  const collection = space.properties['dxos.org/type/Collection'];
  if (collection) {
    client.addTypes([DataType.Collection]);
    const composerCollection = await collection.load();
    if (composerCollection) {
      composerCollection.objects.push(makeRef(obj));
    }
  }
};
