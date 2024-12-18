//
// Copyright 2024 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import fs from 'node:fs';

import { asyncTimeout } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type ReactiveEchoObject, Filter, loadObjectReferences, makeRef } from '@dxos/client/echo';
import { create, getMeta } from '@dxos/client/echo';
import { type Space } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { TextType } from '@dxos/plugin-markdown/types';
import {
  getUserFunctionUrlInMetadata,
  incrementSemverPatch,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
} from '@dxos/plugin-script/edge';
import { FunctionType, ScriptType } from '@dxos/plugin-script/types';
import { type UploadFunctionResponseBody } from '@dxos/protocols';

import { BaseCommand } from '../../base';

// TODO: move to cli-composer

export default class Upload extends BaseCommand<typeof Upload> {
  static override enableJsonFlag = true;
  static override description = 'Upload user function.';

  static override flags = {
    ...BaseCommand.flags,
    name: Flags.string({ description: 'Function name.' }),
    version: Flags.string({ description: 'Function version.' }),
    spaceKey: Flags.string({ description: 'Space key to create/update Script source in.' }),
    objectId: Flags.string({ description: 'Existing Script Object ID to update.' }),
    functionId: Flags.string({
      description: 'Existing UserFunction ID to update.',
      conflict: ['objectId', 'spaceKey'],
    }),
  };

  static override args = {
    file: Args.string({ required: true }),
  };

  async run(): Promise<any> {
    let scriptContent: string | undefined;
    try {
      scriptContent = fs.readFileSync(this.args.file, 'utf8');
    } catch (err: any) {
      this.error(`Error reading file ${this.args.file}: ${err.message}`);
    }

    const handleUpload = async ({ client, space }: { client: Client; space?: Space }) => {
      invariant(space, 'Has to provide a space');

      client.addTypes([ScriptType, TextType]);
      const identity = client.halo.identity.get();
      invariant(identity, 'Identity not available');

      let existingFunctionId: string | undefined;
      let existingObject: ReactiveEchoObject<ScriptType> | undefined;
      let functionUrlFromExistingObject: string | undefined;
      if (this.flags.functionId) {
        existingFunctionId = this.flags.functionId;
      }

      // Find existing object and functionId in metadata if it exists
      if (this.flags.objectId) {
        const qr = await space.db.query(Filter.schema(ScriptType)).run();
        existingObject = qr.objects.find((o) => o.id === this.flags.objectId);
        if (!existingObject) {
          this.error(`Object not found: ${this.flags.spaceKey}/${this.flags.objectId}`);
        }
        functionUrlFromExistingObject = await getUserFunctionUrlInMetadata(getMeta(existingObject));
        if (functionUrlFromExistingObject) {
          existingFunctionId = functionUrlFromExistingObject.split('/').at(-1);
          if (existingFunctionId !== this.flags.functionId) {
            this.warn(
              `provided functionId ${this.flags.functionId} does not match existing functionId ${existingFunctionId}, using existing functionId`,
            );
          }
        }

        if (this.flags.verbose) {
          this.log(
            `Uploading to existing FunctionId ${existingFunctionId} read from ${this.flags.spaceKey}/${this.flags.objectId}`,
          );
        }
      }

      let result: UploadFunctionResponseBody;
      try {
        result = await asyncTimeout(
          uploadWorkerFunction({
            client,
            spaceId: space.id,
            version: await this._getNextVersion(space, existingFunctionId),
            functionId: existingFunctionId,
            name: this.flags.name,
            source: scriptContent,
          }),
          5_000,
        );
        invariant(result.functionId, 'Upload failed.');
        this.log(`Uploaded function: ${result.functionId}`);
      } catch (err: any) {
        this.error(err.message);
      }

      // If we haven't been provided an ECHO space/object, we're done.
      if (!space) {
        return;
      }

      if (existingObject) {
        // Update existing object
        await loadObjectReferences(existingObject, (obj) => obj.source);
        if (!existingObject.source) {
          this.error('Object source not found');
        }
        existingObject.source.target!.content = scriptContent;

        if (this.flags.verbose) {
          this.log(
            `Updated source in ${this.flags.spaceKey}/${this.flags.objectId} (${existingObject.source.target!.id})`,
          );
        }
        if (!functionUrlFromExistingObject) {
          setUserFunctionUrlInMetadata(getMeta(existingObject), `/${space.id}/${result.functionId}`);
        } else {
          if (existingFunctionId !== result.functionId) {
            this.error('functionId mismatch');
          }
        }
      } else {
        // Create new object
        // TODO: make object navigable in Composer.
        const sourceObj = space.db.add(create(TextType, { content: scriptContent }));
        const obj = space.db.add(create(ScriptType, { name: this.flags.name, source: makeRef(sourceObj) }));
        setUserFunctionUrlInMetadata(getMeta(obj), result.functionId);
        if (this.flags.verbose) {
          this.log(`Created object: ${this.flags.spaceKey}/${obj.id}`);
        }
      }
    };

    if (this.flags.spaceKey) {
      return await this.execWithSpace(async ({ client, space }) => await handleUpload({ client, space }), {
        spaceKeys: [this.flags.spaceKey],
      });
    }

    return await this.execWithClient(async ({ client }) => await handleUpload({ client }));
  }

  private async _getNextVersion(space: Space, functionId: string | undefined): Promise<string> {
    if (this.flags.version) {
      return this.flags.version;
    }
    if (functionId) {
      const { objects } = await space.db.query(Filter.schema(FunctionType, { id: functionId })).run();
      return incrementSemverPatch(objects[0]?.version ?? '0.0.0');
    }
    return '0.0.1';
  }
}
