//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { isTypedObject, Expando, TypedObject } from '@dxos/client/echo';

export const TEMPLATE_PLUGIN = 'dxos.org/plugin/template';

const TEMPLATE_ACTION = `${TEMPLATE_PLUGIN}/action`;

export enum TemplateAction {
  CREATE = `${TEMPLATE_ACTION}/create`,
}

export type TemplateProvides = {};

export type TemplatePluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

// TODO(burdon): Warning: Encountered two children with the same key, `dxos.org/plugin/template`.
// TODO(burdon): Better way to detect?
export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && (object as Expando).type === 'template';
};
