//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { makeRef, create } from '@dxos/live-object';

import { MarkdownCapabilities } from './capabilities';
import { DocumentType, MarkdownAction, TextType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver(MarkdownAction.Create, ({ name, content }) => {
      const doc = create(DocumentType, {
        name,
        content: makeRef(create(TextType, { content: content ?? '' })),
        threads: [],
      });

      return { data: { object: doc } };
    }),
    createResolver(MarkdownAction.SetViewMode, ({ id, viewMode }) => {
      const { state } = context.requestCapability(MarkdownCapabilities.State);
      state.viewMode[id] = viewMode;
    }),
  ]);
