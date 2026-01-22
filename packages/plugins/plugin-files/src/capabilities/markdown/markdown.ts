//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps, type LocalFile } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    const extensionProvider = () =>
      listener({
        onChange: ({ id, text }) => {
          const settings = capabilities
            .get(Common.Capability.SettingsStore)
            .getStore<FilesSettingsProps>(meta.id)!.value;
          const store = capabilities.get(FileCapabilities.State);
          const { current } = store.values;
          if (settings.openLocalFiles && current && current.id === id && current.text !== text) {
            // Update the current file's text and modified state.
            store.update((state) => ({
              ...state,
              current: state.current
                ? { ...state.current, text: text.toString(), modified: true }
                : undefined,
              files: state.files.map((f) =>
                f.id === id ? ({ ...f, text: text.toString(), modified: true } as LocalFile) : f,
              ),
            }));
          }
        },
      });

    return Capability.contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
  }),
);
