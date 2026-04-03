//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Message, type Transcript } from '@dxos/types';
import {
  autoScroll,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  preview,
} from '@dxos/ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { type SerializationModel } from '../../model';
import { renderByline } from '../../util';

import { transcription } from './transcription-extension';

export { renderByline };

export type TranscriptionProps = {
  transcript?: Transcript.Transcript;
  model: SerializationModel<Message.Message>;
  // TODO(burdon): Are these still in use?
  attendableId?: string;
  ignoreAttention?: boolean;
};

/**
 * Transcript component implemented using the editor.
 */
export const Transcription = composable<HTMLDivElement, TranscriptionProps>(
  ({ transcript: object, model, children, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor(() => {
      return {
        extensions: [
          createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
          createMarkdownExtensions(),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          preview(),
          transcription({ model, started: object?.started ? new Date(object.started) : undefined }),
          autoScroll(),
        ].filter(isTruthy),
      };
    }, [model]);

    return (
      <div
        {...composableProps(props, { classNames: 'dx-container' })}
        ref={parentRef}
        data-popover-collision-boundary={true /* TODO(thure): Make this a constant and document it. */}
      />
    );
  },
);
