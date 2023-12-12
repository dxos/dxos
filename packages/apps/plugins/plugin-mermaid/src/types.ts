//
// Copyright 2023 DXOS.org
//

import type { StackProvides } from '@braneframe/plugin-stack';
import { Mermaid as MermaidType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { MERMAID_PLUGIN } from './meta';

const MERMAID_ACTION = `${MERMAID_PLUGIN}/action`;

export enum MermaidAction {
  CREATE = `${MERMAID_ACTION}/create`,
}

export type MermaidPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides;

export const isObject = (object: unknown): object is MermaidType => {
  return isTypedObject(object) && object.__typename === MermaidType.schema.typename;
};
