//
// Copyright 2023 DXOS.org
//

import { File as FileType } from '@braneframe/types';
import type { GraphBuilderProvides, SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';
import { isTypedObject, type TypedObject } from '@dxos/client/echo';

export const IPFS_PLUGIN = 'dxos.org/plugin/template';

const IPFS_ACTION = `${IPFS_PLUGIN}/action`;

export enum IpfsAction {
  CREATE = `${IPFS_ACTION}/create`,
}

export type IpfsProvides = {};

export type IpfsPluginProvides = SurfaceProvides & GraphBuilderProvides & TranslationsProvides;

export const isFile = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && FileType.schema.typename === object.__typename;
};
