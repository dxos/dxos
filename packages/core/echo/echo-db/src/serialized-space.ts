import { createIdFromSpaceKey } from '@dxos/echo-pipeline';
import { DXN, PublicKey, SpaceId } from '@dxos/keys';

/**
 * Data class to represent a serialized space.
 */
export class SerializedSpaceData {
  public version: number;

  public timestamp?: string;

  public spaceId?: SpaceId;

  public objects: SerializedObjectData[] = [];

  constructor(version: number) {
    this.version = version;
  }

  static async decode(data: SerializedSpaceJSON): Promise<SerializedSpaceData> {
    const space = new SerializedSpaceData(data.version);

    if (data.timestamp) {
      space.timestamp = data.timestamp;
    }

    if (data.spaceId) {
      if (!SpaceId.isValid(data.spaceId)) {
        throw new Error(`Invalid spaceId: ${data.spaceId}`);
      }
      space.spaceId = data.spaceId;
    } else {
      if (data.spaceKey) {
        space.spaceId = await createIdFromSpaceKey(PublicKey.from(data.spaceKey));
      }
    }

    for (const object of data.objects) {
      let type: DXN | undefined;

      if (!object['@type']) {
        type = undefined;
      } else if (typeof object['@type'] === 'string') {
        type = new DXN(DXN.kind.TYPE, [object['@type']]);
      } else if (
        typeof object['@type'] === 'object' &&
        object['@type'] !== null &&
        (object['@type'] as any)['@type'] === LEGACY_REFERENCE_TYPE_TAG
      ) {
        type = new DXN(DXN.kind.TYPE, [(object['@type'] as any).itemId]);
      } else if (
        typeof object['@type'] === 'object' &&
        object['@type'] !== null &&
        typeof (object['@type'] as any)['/'] === 'string'
      ) {
        type = DXN.parse((object['@type'] as any)['/']);
      } else {
        throw new Error(`Invalid object type: ${object['@type']}`);
      }

      space.objects.push({
        version: object['@version'],
        timestamp: object['@timestamp'],
        id: object['@id'],
        type: type,
        deleted: object['@deleted'] || false,
      });
    }

    return space;
  }

  async encode(): Promise<SerializedSpaceJSON> {
    const data: SerializedSpaceJSON = {
      version: this.version,
      objects: this.objects.map((object) => this._encodeObject(object)),
    };

    if (this.timestamp) {
      data.timestamp = this.timestamp;
    }

    if (this.spaceId) {
      data.spaceId = this.spaceId;
    }

    return data;
  }

  private _encodeObject(object: SerializedObjectData): SerializedObjectJSON {
    const json: SerializedObjectJSON = {
      '@version': object.version,
      '@id': object.id,
      '@deleted': object.deleted,
    };

    if (object.timestamp) {
      json['@timestamp'] = object.timestamp;
    }

    if (object.type) {
      json['@type'] = { '/': object.type.toString() };
    }

    return json;
  }
}

export type SerializedObjectData = {
  version: number;
  timestamp?: string;
  id: string;
  type?: DXN;
  deleted: boolean;
};

/**
 * Archive of echo objects.
 *
 * ## Encoding and file format
 *
 * The data is serialized to JSON.
 * Preferred file extensions are `.dx.json`.
 * The file might be compressed with gzip (`.dx.json.gz`).
 */
export type SerializedSpaceJSON = {
  /**
   * Format version number.
   *
   * Current version: 1.
   */
  version: number;

  /**
   * Human-readable date of creation.
   */
  timestamp?: string;

  /**
   * Space identifier.
   */
  spaceId?: string;

  /**
   * Space key.
   * @deprecated
   */
  spaceKey?: string;

  /**
   * List of objects included in the archive.
   */
  objects: SerializedObjectJSON[];
};

export type SerializedObjectJSON = {
  /**
   * Format version number.
   *
   * Current version: 1.
   */
  '@version': number;

  /**
   * Human-readable date of creation.
   */
  '@timestamp'?: string;

  /**
   * Unique object identifier.
   */
  '@id': string;

  /**
   * Reference to a type.
   */
  '@type'?: SerializedReferenceJSON | string;

  /**
   * Flag to indicate soft-deleted objects.
   */
  '@deleted'?: boolean;

  /**
   * @deprecated
   *
   * Model name for the objects backed by a legacy ECHO model.
   */
  '@model'?: string;
};

/**
 * Reference encoding in JSON format.
 */
export type SerializedReferenceJSON =
  // New format.
  | {
      /**
       * Stringified DXN.
       */
      '/': string;
    }
  // Old format.
  | {
      '@type': typeof LEGACY_REFERENCE_TYPE_TAG;
      itemId: string | null;
      protocol: string | null;
      host: string | null;
    };

export const LEGACY_REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';
