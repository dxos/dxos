//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { isTypedObject, type Expando, type TypedObject } from '@dxos/react-client/echo';

import { MERMAID_PLUGIN } from './meta';

const MERMAID_ACTION = `${MERMAID_PLUGIN}/action`;

export enum MermaidAction {
  CREATE = `${MERMAID_ACTION}/create`,
}

export type MermaidPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

// TODO(burdon): Warning: Encountered two children with the same key, `dxos.org/plugin/mermaid`.
// TODO(burdon): Better way to detect?
export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && (object as Expando).type === 'mermaid';
};
