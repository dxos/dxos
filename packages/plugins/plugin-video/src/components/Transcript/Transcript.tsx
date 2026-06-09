//
// Copyright 2026 DXOS.org
//

import { composeRefs } from '@radix-ui/react-compose-refs';
import React from 'react';

import { type Ref } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { useObject } from '@dxos/react-client/echo';
import { composable, composableProps, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
} from '@dxos/ui-editor';

import { decorateTranscript, transcriptMarkdownExtensions } from './decorate-transcript';

export type TranscriptProps = {
  /** Stable editor/document id (used for collaboration + selection state). */
  id: string;
  /** The transcript text object. */
  source?: Ref.Ref<Text.Text>;
  /** Invoked with the seconds offset when a timestamp link is activated. */
  onSeek?: (seconds: number) => void;
};

/**
 * Read-only markdown view of a transcript text object, live-bound to its ECHO content.
 * Composable: forwards its ref and merges slot props onto the root element.
 */
export const Transcript = composable<HTMLDivElement, TranscriptProps>(
  ({ classNames, id, source, onSeek, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    // Subscribe to the ref's target so the editor (re-)initializes once it resolves; a `Ref`'s
    // `.target` loads asynchronously and isn't reactive on its own, so without this the editor
    // mounts empty (e.g. the Summary tab is blank until toggled away and back).
    const [resolved] = useObject(source);
    const { parentRef } = useTextEditor(() => {
      const target = source?.target;
      if (!resolved || !target) {
        return {};
      }

      return {
        initialValue: target.content ?? '',
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(target, ['content']) }),
          createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          // Remove blockquote parsing so `>>` speaker markers aren't styled as quotes (see decorate-transcript).
          createMarkdownExtensions({ extensions: transcriptMarkdownExtensions }),
          decorateTranscript({ onSeek }),
          decorateMarkdown(),
        ],
      };
    }, [themeMode, id, resolved, onSeek]);

    return (
      <div
        {...composableProps(props, { classNames: ['w-full overflow-hidden', classNames] })}
        ref={composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
