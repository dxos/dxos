import type { MessageContentBlock } from '@dxos/artifact';
import type { ObjectVersion } from '@dxos/echo-db';
import { getVersion } from '@dxos/echo-db';
import type { BaseEchoObject } from '@dxos/echo-schema';
import { Schema } from 'effect';

// TODO(dmaretskyi): Extract.
const ObjectVersionSchema = Schema.Unknown as Schema.Schema<ObjectVersion>;

const VersionPinSchema = Schema.Struct({
  // TODO(dmaretskyi): Ref
  id: Schema.String,
  // TODO(dmaretskyi): Could be opaque
  version: ObjectVersionSchema,
});
export interface VersionPin extends Schema.Schema.Type<typeof VersionPinSchema> {}

export const VersionPin: typeof VersionPinSchema & {
  DISPOSITION: 'version-pin';
  fromObject: (object: BaseEchoObject) => VersionPin;
  createBlock: (pin: VersionPin) => MessageContentBlock;
} = class extends VersionPinSchema {
  static readonly DISPOSITION = 'version-pin';
  static fromObject(object: BaseEchoObject): VersionPin {
    return VersionPin.make({
      id: object.id,
      version: getVersion(object),
    });
  }
  static createBlock(pin: VersionPin): MessageContentBlock {
    return {
      type: 'json',
      disposition: VersionPin.DISPOSITION,
      json: JSON.stringify(pin),
    };
  }
};
