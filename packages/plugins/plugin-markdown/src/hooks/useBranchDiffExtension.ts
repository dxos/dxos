//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useEffect, useMemo, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { getObjectOnBranch } from '@dxos/echo-client';
import { diffView } from '@dxos/ui-editor';

/**
 * Editor extension that overlays an inline (unified) diff of the live document against another
 * branch's content, while keeping the editor fully editable. The compare branch's text is read once
 * (a snapshot) and used as the merge view's `original`; the live document is the modified side, so
 * the diff updates as the user edits the current branch. Returns undefined until the compare content
 * loads, or when no comparison is active (no `textObject` / `compareBranch`).
 */
export const useBranchDiffExtension = (
  textObject: Obj.Unknown | undefined,
  compareBranch: string | undefined,
): Extension | undefined => {
  const [original, setOriginal] = useState<string>();

  useEffect(() => {
    if (!textObject || !compareBranch) {
      setOriginal(undefined);
      return;
    }

    let cancelled = false;
    void getObjectOnBranch(textObject, compareBranch).then((data) => {
      if (!cancelled) {
        setOriginal(String(data?.content ?? ''));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [textObject, compareBranch]);

  return useMemo(() => (original !== undefined ? diffView({ original }) : undefined), [original]);
};
