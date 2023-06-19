//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import { LinkBreak } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { log } from '@dxos/log';
import { isTypedObject } from '@dxos/react-client';
import {
  definePlugin,
  PluginAction,
  PluginDefinition,
  Plugin,
  findPlugin,
  SplitViewProvides,
} from '@dxos/react-surface';

import { isMarkdownProperties } from '../MarkdownPlugin';
import { MarkdownProperties } from '../MarkdownPlugin/components';
import { OctokitContextValue, OctokitProvider, PatInput, useOctokitContext } from './components';

export const isDocument = (datum: unknown): datum is Document =>
  isTypedObject(datum) && Document.type.name === datum.__typename;

const getDocGhId = (properties: MarkdownProperties) => {
  const key = properties.keys?.find((key) => key.source === 'com.github');
  try {
    const [owner, repo, type, ...rest] = key?.id?.split('/') ?? [];
    if (type === 'issues') {
      return {
        owner,
        repo,
        issueNumber: parseInt(rest[0], 10),
      };
    } else if (type === 'blob') {
      const [ref, ...pathParts] = rest;
      return {
        owner,
        repo,
        ref,
        path: pathParts.join('/'),
      };
    } else {
      return null;
    }
  } catch (err) {
    log.catch(err);
    return null;
  }
};

const getDocumentActions = (plugins: Plugin[], properties: MarkdownProperties): PluginAction[] => {
  const actions: PluginAction[] = [];
  const docGhId = getDocGhId(properties);
  const splitViewPlugin = findPlugin<SplitViewProvides>(plugins, 'dxos:SplitViewPlugin');

  if (docGhId) {
    const boundKeyIndex = properties.keys?.findIndex((key) => key.source === 'com.github');
    if (boundKeyIndex && boundKeyIndex >= 0) {
      actions.push({
        id: 'gh-unbind',
        testId: 'githubMarkdownPlugin.documentUnbind',
        label: ['unbind from github label', { ns: 'plugin-github-markdown' }],
        icon: LinkBreak,
        invoke: () => properties.keys?.splice(boundKeyIndex, 1),
      });
    }
  } else {
    actions.push({
      id: 'gh-bind',
      testId: 'githubMarkdownPlugin.documentBind',
      label: ['bind to github label', { ns: 'plugin-github-markdown' }],
      invoke: () => {
        if (splitViewPlugin?.provides.splitView) {
          splitViewPlugin.provides.splitView.dialogOpen = true;
          splitViewPlugin.provides.splitView.dialogContent = 'dxos:githubMarkdownPlugin/BindDialog';
        }
      },
    });
  }

  return actions;
};

export const GithubMarkdownPlugin: PluginDefinition<{}, {}, OctokitContextValue> = definePlugin({
  meta: {
    id: 'dxos:GithubMarkdownPlugin',
  },
  provides: {
    context: (props) => <OctokitProvider {...props} />,
    useContext: useOctokitContext,
    component: (datum, role) => {
      if (role === 'dialog' && datum === 'dxos:SplitViewPlugin/ProfileSettings') {
        return PatInput;
      } else {
        return null;
      }
    },
    actions: (datum, plugins) => {
      switch (true) {
        case Array.isArray(datum) && isMarkdownProperties(datum[1]):
          return getDocumentActions(plugins, datum[1]);
        default:
          return [];
      }
    },
    translations: [
      {
        'en-US': {
          'plugin-github-markdown': {
            'unbind from github label': 'Unbind from Github',
            'bind to github label': 'Bind to Github issue',
          },
        },
      },
    ],
  },
});
