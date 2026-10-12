//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useDocAccessor } from '@dxos/react-client/echo';
import type * as Util from '@dxos/react-ui/Util';
import { type Event as EventType } from '@dxos/types';
import { automerge } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { Editor } from '../Editor/index.ts';

export type EventBodyEditorProps = Util.ThemedClassName<{
  event: EventType.Event;
  /** Render markdown decorations; pass `false` for plain text. */
  markdown?: boolean;
}>;

/**
 * Editable CodeMirror editor bound to an event's `description` (used for draft events). Edits are
 * written live to the ECHO object via an automerge doc accessor.
 */
export const EventBodyEditor = ({ event, markdown = true, classNames }: EventBodyEditorProps) => {
  const accessor = useDocAccessor(event, ['description']);
  const extensions = useMemo(() => (accessor ? [automerge(accessor)] : []), [accessor]);
  if (!accessor) {
    return null;
  }

  return (
    <Editor
      lineWrapping
      markdown={markdown}
      extensions={extensions}
      classNames={mx('flex overflow-hidden p-3', classNames)}
    />
  );
};
