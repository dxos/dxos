//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Document } from '@braneframe/types';
import { ComposerModel, TextKind, YText } from '@dxos/aurora-composer';
import { EchoObject, Space } from '@dxos/client/echo';
import { Plugin } from '@dxos/react-surface';

import { MARKDOWN_PLUGIN, MarkdownProperties, MarkdownProvides } from './types';

export const isMarkdown = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      (typeof (datum as { [key: string]: any }).content === 'string' ||
        (datum as { [key: string]: any }).content instanceof YText)
    : false;

export const isMarkdownContent = (datum: unknown): datum is { content: ComposerModel } =>
  !!datum &&
  typeof datum === 'object' &&
  (datum as { [key: string]: any }).content &&
  isMarkdown((datum as { [key: string]: any }).content);

export const isMarkdownPlaceholder = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum && typeof datum.id === 'string' && 'content' in datum && typeof datum.content === 'function'
    : false;

export const isMarkdownProperties = (datum: unknown): datum is MarkdownProperties =>
  datum instanceof EchoObject
    ? true
    : datum && typeof datum === 'object'
    ? 'title' in datum && typeof datum.title === 'string'
    : false;

type MarkdownPlugin = Plugin<MarkdownProvides>;
export const markdownPlugins = (plugins: Plugin[]): MarkdownPlugin[] => {
  return (plugins as MarkdownPlugin[]).filter((p) => Boolean(p.provides?.markdown));
};

export const documentToGraphNode = (parent: GraphNode<Space>, document: Document, index: string): GraphNode => ({
  id: document.id,
  index: get(document, 'meta.index', index),
  label: document.title ?? 'New Document', // TODO(burdon): Translation.
  icon: (props) => (document.content?.kind === TextKind.PLAIN ? <ArticleMedium {...props} /> : <Article {...props} />),
  data: document,
  parent,
  pluginActions: {
    [MARKDOWN_PLUGIN]: [
      {
        id: 'delete',
        index: 'a1',
        label: ['delete document label', { ns: MARKDOWN_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: document.id },
        },
      },
    ],
  },
});
