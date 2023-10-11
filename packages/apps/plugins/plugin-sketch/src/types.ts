//
// Copyright 2023 DXOS.org
//

import { TLStore } from '@tldraw/tlschema';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { StackProvides } from '@braneframe/plugin-stack';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { Sketch as SketchType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

export const SKETCH_PLUGIN = 'dxos.org/plugin/sketch';

const SKETCH_ACTION = `${SKETCH_PLUGIN}/action`;

export enum SketchAction {
  CREATE = `${SKETCH_ACTION}/create`,
}

export type SketchPluginProvides = GraphProvides & IntentProvides & TranslationsProvides & StackProvides;

export interface SketchModel {
  store: TLStore;
}

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SketchType.name] = SketchType;

export const isSketch = (data: unknown): data is SketchType => {
  return isTypedObject(data) && SketchType.schema.typename === data.__typename;
};
