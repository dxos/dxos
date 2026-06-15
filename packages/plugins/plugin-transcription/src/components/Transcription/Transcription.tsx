//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Message, type Transcript } from '@dxos/types';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  preview,
  scroller,
} from '@dxos/ui-editor';

import { type SerializationModel } from '../../model';
import { transcription } from './transcription-extension';

export type TranscriptionProps = {
  transcript?: Transcript.Transcript;
  model: SerializationModel<Message.Message>;
};

// TODO(burdon): Remove forwardedRef/use react-ui-editor.
export const Transcription = composable<HTMLDivElement, TranscriptionProps>(
  ({ transcript: object, model, children, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor(() => {
      return {
        extensions: [
          createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          createMarkdownExtensions(),
          decorateMarkdown(),
          preview(),
          transcription({ model, started: object?.started ? new Date(object.started) : undefined }),
          scroller(),
        ],
      };
    }, [model, themeMode]);

    return (
      <div
        {...composableProps(props, { classNames: 'dx-container' })}
        data-popover-collision-boundary={true}
        ref={parentRef}
      />
    );
  },
);
