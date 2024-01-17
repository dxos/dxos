//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
} from '@dxos/app-framework';

import { UNDO_PLUGIN } from './meta';

const UNDO_ACTION = `${UNDO_PLUGIN}/action`;

export enum UndoAction {
  REDO = `${UNDO_ACTION}/redo`,
  UNDO = `${UNDO_ACTION}/undo`,
}

export type UndoFunction = () => Promise<void>;

export type UndoProvides = {
  undo: {
    push: (action: UndoFunction) => void;
  };
};

export type UndoPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  UndoProvides;
