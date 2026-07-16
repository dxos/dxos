//
// Copyright 2026 DXOS.org
//

import { MergeView } from '@codemirror/merge';
import React, { useEffect, useRef } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type Extension,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

export type DiffViewProps = ThemedClassName<{
  /** Base content (left pane). */
  before: string;
  /** Compared content (right pane). */
  after: string;
}>;

/**
 * Read-only side-by-side comparison of two document revisions (the `sideBySide` diff setting).
 */
export const DiffView = ({ before, after, classNames }: DiffViewProps) => {
  const { themeMode } = useThemeContext();
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parentRef.current) {
      return;
    }

    const extensions: Extension[] = [
      createBasicExtensions({ readOnly: true, lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
    ];

    const view = new MergeView({
      a: { doc: before, extensions },
      b: { doc: after, extensions },
      parent: parentRef.current,
      gutter: true,
      collapseUnchanged: { margin: 3, minSize: 4 },
    });

    return () => view.destroy();
  }, [before, after, themeMode]);

  return <div role='figure' className={mx('bs-full is-full overflow-y-auto', classNames)} ref={parentRef} />;
};

DiffView.displayName = 'DiffView';
