//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/ui-editor';

import { meta } from '../meta';
import { type FilesSettingsProps } from '../types';

import { FileCapabilities } from './capabilities';

export default Capability.makeModule((context) => {
  const extensionProvider = () =>
    listener({
      onChange: ({ id, text }) => {
        const settings = context.getCapability(Common.Capability.SettingsStore).getStore<FilesSettingsProps>(meta.id)!.value;
        const state = context.getCapability(FileCapabilities.State);
        if (settings.openLocalFiles && state.current && state.current.id === id && state.current.text !== text) {
          state.current.text = text.toString();
          state.current.modified = true;
        }
      },
    });

  return Capability.contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
});
