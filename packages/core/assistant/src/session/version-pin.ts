//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type ObjectVersion } from '@dxos/echo-db';
import { getVersion } from '@dxos/echo-db';
import { ObjectId, type BaseEchoObject } from '@dxos/echo-schema';
import { type ContentBlock } from '@dxos/schema';

// TODO(dmaretskyi): Extract.
const ObjectVersionSchema = Schema.Unknown as Schema.Schema<ObjectVersion>;

const VersionPinSchema = Schema.Struct({
  // TODO(dmaretskyi): Use Ref when those support encoding.
  objectId: ObjectId,
  // TODO(dmaretskyi): Could be opaque
  version: ObjectVersionSchema,
});

/**
 * Used to pin a specific version of an object during the course of a conversation.
 * This allows us to detect when the object changes during the course of the conversation.
 */
export interface VersionPin extends Schema.Schema.Type<typeof VersionPinSchema> {}

export const VersionPin: typeof VersionPinSchema & {
  DISPOSITION: 'version-pin';
  fromObject: (object: BaseEchoObject) => VersionPin;
  createBlock: (pin: VersionPin) => ContentBlock.Any;
} = class extends VersionPinSchema {
  static readonly DISPOSITION = 'version-pin';
  static fromObject(object: BaseEchoObject): VersionPin {
    return VersionPin.make({
      objectId: object.id,
      version: getVersion(object),
    });
  }

  static createBlock(pin: VersionPin): ContentBlock.Any {
    return {
      _tag: 'json',
      disposition: VersionPin.DISPOSITION,
      data: JSON.stringify(pin),
    };
  }
};
