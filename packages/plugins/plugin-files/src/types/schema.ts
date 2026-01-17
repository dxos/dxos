//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const FILES_OPERATION = `${meta.id}/operation`;

export namespace LocalFilesOperation {
  export const SelectRoot = Operation.make({
    meta: { key: `${FILES_OPERATION}/select-root`, name: 'Select Root Directory' },
    schema: { input: Schema.Void, output: Schema.Void },
  });

  export const Export = Operation.make({
    meta: { key: `${FILES_OPERATION}/export`, name: 'Export Files' },
    schema: { input: Schema.Void, output: Schema.Void },
  });

  export const Import = Operation.make({
    meta: { key: `${FILES_OPERATION}/import`, name: 'Import Files' },
    schema: {
      input: Schema.Struct({ rootDir: Schema.optional(Schema.String) }),
      output: Schema.Void,
    },
  });

  export const OpenFile = Operation.make({
    meta: { key: `${FILES_OPERATION}/open-file`, name: 'Open File' },
    schema: {
      input: Schema.Void,
      output: Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) }),
    },
  });

  export const OpenDirectory = Operation.make({
    meta: { key: `${FILES_OPERATION}/open-directory`, name: 'Open Directory' },
    schema: {
      input: Schema.Void,
      output: Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) }),
    },
  });

  export const Reconnect = Operation.make({
    meta: { key: `${FILES_OPERATION}/reconnect`, name: 'Reconnect File' },
    schema: { input: Schema.Struct({ id: Schema.String }), output: Schema.Void },
  });

  export const Close = Operation.make({
    meta: { key: `${FILES_OPERATION}/close`, name: 'Close File' },
    schema: { input: Schema.Struct({ id: Schema.String }), output: Schema.Void },
  });

  export const Save = Operation.make({
    meta: { key: `${FILES_OPERATION}/save`, name: 'Save File' },
    schema: { input: Schema.Struct({ id: Schema.String }), output: Schema.Void },
  });
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

export type LocalEntity = LocalDirectory | LocalFile;

// TODO(burdon): Adapt to use/extend DocumentType.
export type LocalFile = {
  id: string;
  name: string;
  handle: FileSystemFileHandle | false;
  permission: PermissionStatus;
  text?: string;
  // TODO(wittjosiah): Store original text?
  modified?: boolean;
};

export type LocalDirectory = {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  permission: PermissionStatus;
  children: LocalEntity[];
};

export const FilesSettingsSchema = Schema.mutable(
  Schema.Struct({
    autoExport: Schema.Boolean,
    autoExportInterval: Schema.Number,
    openLocalFiles: Schema.optional(Schema.Boolean),
  }),
);

export type FilesSettingsProps = Schema.Schema.Type<typeof FilesSettingsSchema>;

export type FilesState = {
  exportRunning: boolean;
  lastExport?: number;
  files: LocalEntity[];
  current: LocalFile | undefined;
  // TODO(wittjosiah): Should be in settings but settings store doesn't support instance types.
  rootHandle?: FileSystemDirectoryHandle;
};
