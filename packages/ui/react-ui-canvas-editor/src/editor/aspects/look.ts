//
// Copyright 2026 DXOS.org
//

import { useMemo, useRef, useState } from 'react';

import { type ThemeChoice, withThemeChoice } from '@dxos/react-ui-canvas';

import { type DisplayOptions } from '../config.ts';
import { type EditorDisplay, type EditorLook } from './context.ts';

/** The look the editor's Look provider holds: the host's display, with this view's own theme pick when it stores none. */
export const useEditorLook = (
  options: DisplayOptions,
  hostDisplay: EditorDisplay,
  onDisplayChange: ((display: Partial<EditorDisplay>) => void) | undefined,
): EditorLook => {
  // A host that stores no theme choice still lets the viewer pick one, for this view alone.
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>();
  const display = useMemo(() => withThemeChoice(hostDisplay, themeChoice), [hostDisplay, themeChoice]);
  // Read when a control is used, so a host passing a fresh callback each render does not change the look.
  const latest = useRef(onDisplayChange);
  latest.current = onDisplayChange;
  const offered = onDisplayChange !== undefined;
  return useMemo(
    () => ({
      display,
      options,
      setDisplay: offered ? (next: Partial<EditorDisplay>) => latest.current?.(next) : undefined,
      setTheme: (theme: string | undefined) =>
        latest.current ? latest.current({ themeOverride: theme }) : setThemeChoice({ theme }),
    }),
    [display, options, offered],
  );
};
