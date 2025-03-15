//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginsContext, contributes } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/react-ui-editor';

import { FileCapabilities } from './capabilities';
import { FILES_PLUGIN } from '../meta';
import { type FilesSettingsProps } from '../types';

export default (context: PluginsContext) => {
  const extensionProvider = () =>
    listener({
      onChange: (text, id) => {
        const settings = context
          .requestCapability(Capabilities.SettingsStore)
          .getStore<FilesSettingsProps>(FILES_PLUGIN)!.value;
        const state = context.requestCapability(FileCapabilities.State);
        if (settings.openLocalFiles && state.current && state.current.id === id && state.current.text !== text) {
          state.current.text = text.toString();
          state.current.modified = true;
        }
      },
    });

  return contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
};
