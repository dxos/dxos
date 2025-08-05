//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/react-ui-editor';

import { FILES_PLUGIN } from '../meta';
import { type FilesSettingsProps } from '../types';

import { FileCapabilities } from './capabilities';

export default (context: PluginContext) => {
  const extensionProvider = () =>
    listener({
      onChange: (text, id) => {
        const settings = context
          .getCapability(Capabilities.SettingsStore)
          .getStore<FilesSettingsProps>(FILES_PLUGIN)!.value;
        const state = context.getCapability(FileCapabilities.State);
        if (settings.openLocalFiles && state.current && state.current.id === id && state.current.text !== text) {
          state.current.text = text.toString();
          state.current.modified = true;
        }
      },
    });

  return contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
};
