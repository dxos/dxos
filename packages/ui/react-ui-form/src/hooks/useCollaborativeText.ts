//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { createDataExtensions } from '@dxos/ui-editor';
import { getDeep } from '@dxos/util';

export type UseCollaborativeTextProps = {
  /** The live object holding the string. */
  object: Obj.Unknown;
  /** The string's key path in `object`. */
  path: Doc.KeyPath;
  /** Added once the editor is bound to the string, such as comments on it. */
  extensions?: Extension[];
  readonly?: boolean;
};

export type CollaborativeText = {
  /** The binding: keystrokes splice the object's string, and edits made elsewhere arrive through it. */
  extensions: Extension[];
  /** The string as the editor's first frame shows it; later changes arrive through the binding. */
  initialValue: string;
  /** Set while a string created on focus rebinds the editor, so the field keeps the focus. */
  autoFocus: boolean;
};

/**
 * Binds an editor to a string of an ECHO object as collaborative text, so concurrent edits merge and cursors into it
 * (comment anchors) survive. A missing string is created when the editor takes focus, not when it is shown, so viewing
 * an object never writes to it.
 */
export const useCollaborativeText = ({
  object,
  path,
  extensions,
  readonly,
}: UseCollaborativeTextProps): CollaborativeText => {
  // Callers pass a fresh path array each render; rebinding on its identity would rebuild the editor per keystroke.
  const pathKey = JSON.stringify(path);
  const [created, setCreated] = useState<string>();
  // Read key by key, since `Obj.getValue`'s JSON path refuses record keys such as `F-1.1`.
  const value = getDeep<unknown>(object, path);
  const ready = typeof value === 'string';
  const handleFocus = useCallback(() => {
    if (!readonly && typeof getDeep(object, path) !== 'string') {
      Obj.update(object, (object) => Obj.setValue(object, path, ''));
      setCreated(pathKey);
    }
  }, [readonly, object, pathKey]);

  const binding = useMemo(
    () =>
      ready
        ? [
            createDataExtensions({ id: Obj.getURI(object), text: Doc.createAccessor(object, [...path]) }),
            EditorView.domEventHandlers({ blur: () => setCreated(undefined) }),
            extensions ?? [],
          ]
        : [EditorView.domEventHandlers({ focus: () => handleFocus() })],
    [ready, object, pathKey, extensions, handleFocus],
  );

  return { extensions: binding, initialValue: ready ? value : '', autoFocus: created === pathKey };
};
