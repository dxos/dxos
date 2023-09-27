//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { File as FileType } from '@braneframe/types';
import { isTypedObject, TypedObject } from '@dxos/client/echo';

export const IPFS_PLUGIN = 'dxos.org/plugin/template';

const IPFS_ACTION = `${IPFS_PLUGIN}/action`;

export enum IpfsAction {
  CREATE = `${IPFS_ACTION}/create`,
}

export type IpfsProvides = {};

export type IpfsPluginProvides = GraphProvides & TranslationsProvides;

export const isFile = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && FileType.type.name === object.__typename;
};
