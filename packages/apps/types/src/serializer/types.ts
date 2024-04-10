//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Why is this defined here?
export const TypeOfExpando = 'dxos.org/typename/expando';

// TODO(burdon): Per plugin metadata (e.g., tldraw schema).
export type SpaceMetadata = {
  name: string;
  version: number;
  timestamp: string; // ISO.
  spaceKey: string;
};

export type SerializedObject =
  | {
      // Object.
      type: 'file';
      name: string;
      id: string;
      extension: string;
      typename: string;
      md5sum: string;
      content?: string;
    }
  | {
      // Folder.
      type: 'folder';
      name: string;
      id: string;
      children: SerializedObject[];
    };

export type SerializedSpace = {
  metadata: SpaceMetadata;
  objects: SerializedObject[];
};
