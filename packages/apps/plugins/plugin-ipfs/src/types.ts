//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { File as FileProto } from '@braneframe/types';
import { isTypedObject, TypedObject } from '@dxos/client/echo';

export const IPFS_PLUGIN = 'dxos.org/plugin/template';

const IPFS_ACTION = `${IPFS_PLUGIN}/action`;

export enum IpfsAction {
  CREATE = `${IPFS_ACTION}/create`,
}

export type IpfsProvides = {};

export type IpfsPluginProvides = GraphProvides & TranslationsProvides;

// TODO(burdon): Warning: Encountered two children with the same key, `dxos.org/plugin/template`.
// TODO(burdon): Better way to detect?
export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && FileProto.type.name === object.__typename;
};
