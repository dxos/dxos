//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import { Space } from '@dxos/client';
import { TypedObject, TypeFilter } from '@dxos/echo-schema';
import { Module } from '@dxos/protocols/proto/dxos/config';

// TODO(burdon): Hack for sidebar content.
export type PluginComponent = FC<{ space: Space; onSelect?: (objectId: string | undefined) => void } | any>;

/**
 * Dynamically loaded metadata for frame.
 */
// TODO(burdon): Remove generic type.
export type FrameRuntime<T extends TypedObject> = {
  Icon: FC<any>;
  Component: FC<any>;

  // Sidebar
  autoCreate?: boolean;
  title?: string;
  // TODO(burdon): Generalize filter.
  filter?: () => TypeFilter<T>;
  onCreate?: (space: Space) => Promise<T>;
  // TODO(burdon): Rename Selector.
  Plugin?: PluginComponent;
};

// TODO(burdon): Rename.
// TODO(burdon): Remove generic type.
export type FrameDef<T extends TypedObject> = {
  module: Module;
  runtime: FrameRuntime<T>;
};

/**
 * In-memory registry of loaded frames.
 */
export class FrameRegistry {
  private readonly _frameMap = new Map<string, FrameDef<any>>();

  get frames() {
    return Array.from(this._frameMap.values());
  }

  addFrameDef(frameDef: FrameDef<any>) {
    this._frameMap.set(frameDef.module.id!, frameDef);
  }

  getFrameDef(id: string) {
    return this._frameMap.get(id);
  }
}
