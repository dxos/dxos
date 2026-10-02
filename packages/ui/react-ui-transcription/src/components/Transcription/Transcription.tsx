//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTextEditor } from '@dxos/react-ui-editor';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as Util from '@dxos/react-ui/Util';
import { type Message, type Transcript } from '@dxos/types';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  objectLinks,
  scroller,
} from '@dxos/ui-editor';

import { type TranscriptModel } from '../../model/index.ts';
import { transcription } from './transcription-extension.ts';

export type TranscriptionProps = {
  transcript?: Transcript.Transcript;
  model: TranscriptModel<Message.Message>;
};

// TODO(burdon): Rename Transcript.
export const Transcription = Util.composable<HTMLDivElement, TranscriptionProps>(
  ({ transcript: object, model, children, ...props }, forwardedRef) => {
    const { themeMode } = ThemeProvider.useThemeContext();
    const { parentRef } = useTextEditor(() => {
      return {
        extensions: [
          createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          createMarkdownExtensions(),
          decorateMarkdown(),
          objectLinks(),
          transcription({ model, started: object?.started ? new Date(object.started) : undefined }),
          scroller(),
        ],
      };
    }, [model, themeMode]);

    return (
      <div
        {...Util.composableProps(props, { classNames: 'dx-expand' })}
        data-popover-collision-boundary={true}
        ref={parentRef}
      />
    );
  },
);
