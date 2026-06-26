//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, { useEffect } from 'react';

import { type Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
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

import { decorateTranscript, parseLineTimestamp, transcriptMarkdownExtensions } from './decorate-transcript';

export type TranscriptProps = {
  /** Stable editor/document id (used for collaboration + selection state). */
  id: string;
  /** The transcript text object. */
  source?: Ref.Ref<Text.Text>;
  /** Invoked with the seconds offset when a timestamp link is activated. */
  onSeek?: (seconds: number) => void;
  /**
   * Estimated playback position in seconds. When it changes the transcript scrolls to the nearest
   * timestamp line at or before this offset (driven by the 10s sync ticker in TranscriptSection).
   */
  currentSeconds?: number;
};

/**
 * Read-only markdown view of a transcript text object, live-bound to its ECHO content.
 * Composable: forwards its ref and merges slot props onto the root element.
 */
export const Transcript = composable<HTMLDivElement, TranscriptProps>(
  ({ classNames, id, source, onSeek, currentSeconds, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    // Subscribe to the ref's target so the editor (re-)initializes once it resolves; a `Ref`'s
    // `.target` loads asynchronously and isn't reactive on its own, so without this the editor
    // mounts empty (e.g. the Summary tab is blank until toggled away and back).
    const [resolved] = useObject(source);
    const { parentRef, view } = useTextEditor(() => {
      const target = source?.target;
      if (!resolved || !target) {
        return {};
      }

      return {
        initialValue: target.content ?? '',
        extensions: [
          createDataExtensions({ id, text: Doc.createAccessor(target, ['content']) }),
          createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          // Remove blockquote parsing so `>>` speaker markers aren't styled as quotes (see decorate-transcript).
          createMarkdownExtensions({ extensions: transcriptMarkdownExtensions }),
          decorateTranscript({ onSeek }),
          decorateMarkdown(),
        ],
      };
    }, [themeMode, id, resolved, onSeek]);

    // Scroll to the last timestamp line at or before currentSeconds.
    useEffect(() => {
      if (!view || currentSeconds === undefined) {
        return;
      }
      const { doc } = view.state;
      let scrollPos: number | undefined;
      for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum);
        const ts = parseLineTimestamp(line.text);
        if (ts && ts.seconds <= currentSeconds) {
          scrollPos = line.from;
        }
      }
      if (scrollPos !== undefined) {
        view.dispatch({ effects: EditorView.scrollIntoView(scrollPos, { y: 'center' }) });
      }
    }, [view, currentSeconds]);

    return (
      <div
        {...composableProps(props, { classNames: ['dx-container', classNames] })}
        ref={composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
