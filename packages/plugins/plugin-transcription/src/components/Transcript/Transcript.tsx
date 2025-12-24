//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Message, type Transcript } from '@dxos/types';
import {
  autoScroll,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorSlots,
  preview,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { type SerializationModel } from '../../model';
import { renderByline } from '../../util';

import { transcript } from './transcript-extension';

export { renderByline };

export type TranscriptViewProps = ThemedClassName<{
  transcript?: Transcript.Transcript;
  model: SerializationModel<Message.Message>;
  // TODO(burdon): Are these still in use?
  attendableId?: string;
  ignoreAttention?: boolean;
}>;

/**
 * Transcript component implemented using the editor.
 */
export const TranscriptView = ({ classNames, transcript: object, model }: TranscriptViewProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, slots: editorSlots }),
        decorateMarkdown(),
        preview(),
        transcript({
          model,
          started: object?.started ? new Date(object.started) : undefined,
        }),
        autoScroll(),
      ].filter(isTruthy),
    };
  }, [model]);

  return (
    <div
      ref={parentRef}
      className={mx('flex grow overflow-hidden container-max-width', classNames)}
      data-popover-collision-boundary={true /* TODO(thure): Make this a constant and document it. */}
    />
  );
};
