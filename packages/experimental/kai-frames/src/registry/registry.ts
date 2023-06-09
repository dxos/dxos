//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import { Space } from '@dxos/client';
import { TypedObject, TypeFilter } from '@dxos/echo-schema';
import { Module } from '@dxos/protocols/proto/dxos/config';

// TODO(burdon): Hack for sidebar content.
export type PluginProps = { space: Space; onSelect?: (objectId: string | undefined) => void };

/**
 * Dynamically loaded metadata for frame.
 */
// TODO(burdon): Plugin.
export type FrameRuntime<T extends TypedObject> = {
  Icon: FC<any>;
  Component: FC<any>;

  /**
   * @deprecated
   */
  // TODO(burdon): Remove: sidebar should interpret plugin metadata.
  Plugin?: FC<PluginProps>;

  /**
   * @deprecated
   */
  // TODO(burdon): Rename titleProperty; get from schema.
  title?: string;

  // TODO(burdon): Generalize filter.
  filter?: () => TypeFilter<T>;
  autoCreate?: boolean;
  onCreate?: (space: Space) => Promise<T>;
};

// TODO(burdon): Remove generic type.
export type FrameDef<T extends TypedObject> = {
  module: Module;
  runtime: FrameRuntime<T>;
};

export type SearchMeta = {
  rank: number;
  Icon: FC<any>;
  // TODO(burdon): Look-up based on type.
  frame?: FrameDef<any>;
};

/**
 * In-memory registry of loaded frames.
 * @deprecated Use metagraph.
 */
export class FrameRegistry {
  private readonly _frameMap = new Map<string, FrameDef<any>>();

  constructor(frameDefs: FrameDef<any>[] = []) {
    frameDefs.forEach((frameDef) => this._frameMap.set(frameDef.module.id!, frameDef));
  }

  get frames() {
    return Array.from(this._frameMap.values());
  }

  getFrameDef(id: string) {
    return this._frameMap.get(id);
  }
}
