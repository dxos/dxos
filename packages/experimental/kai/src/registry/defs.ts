//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import { Space } from '@dxos/client';
import { Document, TypeFilter } from '@dxos/echo-schema';
import { Module } from '@dxos/protocols/proto/dxos/config';

// TODO(burdon): Metagraph definitions.

// TODO(burdon): Create useFrameContext hook?
export type FrameComponent = FC<any>;

// TODO(burdon): Rename.
export type FrameRuntime<T extends Document> = {
  Icon: FC<any>;
  Component: FrameComponent;

  // Sidebar
  title?: string;
  filter?: () => TypeFilter<T>;
  onCreate?: (space: Space) => Promise<T>;
  Plugin?: FC<any>;
};

export type FrameDef<T extends Document> = {
  module: Module;
  runtime: FrameRuntime<T>;
};
