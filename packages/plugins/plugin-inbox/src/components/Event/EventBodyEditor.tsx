//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Doc } from '@dxos/echo-doc';
import { type ThemedClassName } from '@dxos/react-ui';
import { type Event as EventType } from '@dxos/types';
import { automerge } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { Editor } from '../Editor';

export type EventBodyEditorProps = ThemedClassName<{
  event: EventType.Event;
  /** Render markdown decorations; pass `false` for plain text. */
  markdown?: boolean;
}>;

/**
 * Editable CodeMirror editor bound to an event's `description` (used for draft events). Edits are
 * written live to the ECHO object via an automerge doc accessor.
 */
export const EventBodyEditor = ({ event, markdown = true, classNames }: EventBodyEditorProps) => {
  const accessor = useMemo(() => Doc.createAccessor(event, ['description']), [event]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  return (
    <Editor
      lineWrapping
      markdown={markdown}
      extensions={extensions}
      classNames={mx('flex overflow-hidden p-3', classNames)}
    />
  );
};
