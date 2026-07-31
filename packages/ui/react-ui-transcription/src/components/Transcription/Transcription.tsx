//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { composable, composableProps, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Message, type Transcript } from '@dxos/types';
import {
  AnchorWidget,
  type XmlWidgetProps,
  type XmlWidgetRegistry,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  scroller,
  xmlTags,
} from '@dxos/ui-editor';

import { type TranscriptModel } from '../../model';
import { transcription } from './transcription-extension';

const inlinePreviewRegistry: XmlWidgetRegistry = {
  'link-preview': {
    block: false,
    urlSchemes: ['dxn:', 'echo:'],
    factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
      typeof label === 'string' && typeof dxn === 'string' ? new AnchorWidget(label, dxn) : null,
  },
};

export type TranscriptionProps = {
  transcript?: Transcript.Transcript;
  model: TranscriptModel<Message.Message>;
};

// TODO(burdon): Rename Transcript.
export const Transcription = composable<HTMLDivElement, TranscriptionProps>(
  ({ transcript: object, model, children, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor(() => {
      return {
        extensions: [
          createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          createMarkdownExtensions(),
          // xmlTags() handles dxn:/echo: links via url-scheme widgets; skip here to avoid double-processing.
          decorateMarkdown({ skip: ({ url }) => url.startsWith('dxn:') || url.startsWith('echo:') }),
          xmlTags({ registry: inlinePreviewRegistry }),
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
