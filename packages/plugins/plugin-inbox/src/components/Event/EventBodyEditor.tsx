//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Doc } from '@dxos/echo-doc';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Event as EventType } from '@dxos/types';
import {
  type Extension,
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

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
  const { themeMode } = useThemeContext();
  const accessor = useMemo(() => Doc.createAccessor(event, ['description']), [event]);
  const extensions = useMemo<Extension[]>(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      ...(markdown ? [createMarkdownExtensions()] : []),
      automerge(accessor),
    ],
    [themeMode, markdown, accessor],
  );

  const { parentRef } = useTextEditor({ extensions }, [extensions]);

  return <div className={mx('flex overflow-hidden p-3', classNames)} ref={parentRef} />;
};
