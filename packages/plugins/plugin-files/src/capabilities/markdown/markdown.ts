//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const settingsStore = yield* Capability.get(Common.Capability.SettingsStore);
    const state = yield* Capability.get(FileCapabilities.State);
    const extensionProvider = () =>
      listener({
        onChange: ({ id, text }) => {
          const settings = settingsStore.getStore<FilesSettingsProps>(meta.id)!.value;
          if (settings.openLocalFiles && state.current && state.current.id === id && state.current.text !== text) {
            state.current.text = text.toString();
            state.current.modified = true;
          }
        },
      });

    return Capability.contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
  }),
);
