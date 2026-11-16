//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback, useMemo, useRef } from 'react';

import * as Spec from '@dxos/compute/Spec';
import { Filter } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { getSpace } from '@dxos/react-client/echo';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { SharedAwareness, specBlocks } from '../components/SpecBlocks/index.ts';
import { useSpecFacts } from './useSpecFacts.ts';

export type UseSpecBlockFormsOptions = {
  /** `preview` draws each block as a form over its kind's schema, `readonly` as one that does not edit, `source` as text. */
  viewMode: EditorViewMode;
  /** Added to the field editors of the forms, bound to the spec's text through their fields. */
  fieldExtensions?: Extension[];
};

export type SpecBlockForms = {
  extension: Extension;
  /** Passed as `createDataExtensions`' `wrapAwareness`, so the field editors publish carets on the spec's channel. */
  wrapAwareness: SharedAwareness['wrap'];
};

/** The spec editor's extension that draws `spec`'s blocks as forms; none without a spec. */
export const useSpecBlockForms = (
  spec: Spec.Spec | undefined,
  { viewMode, fieldExtensions }: UseSpecBlockFormsOptions,
): SpecBlockForms => {
  const [dialects = EMPTY] = useObject(spec, 'dialects');
  const awareness = useMemo(() => new SharedAwareness(), [spec]);
  const facts = useSpecFacts(dialects);
  // Read through a ref, so a spec added or renamed reaches the pickers without rebuilding the editor.
  const specs = useQuery(spec && getSpace(spec)?.db, Filter.type(Spec.Spec));
  const specsRef = useRef(specs);
  specsRef.current = specs;
  const specOptions = useCallback(
    () =>
      specsRef.current
        .filter((candidate) => candidate.id !== spec?.id)
        .map((candidate) => ({ id: candidate.id, name: candidate.name })),
    [spec],
  );
  return useMemo(
    () => ({
      extension: spec
        ? specBlocks({
            dialects,
            cards: viewMode !== 'source',
            readonly: viewMode === 'readonly',
            awareness,
            fieldExtensions,
            specs: specOptions,
            facts,
          })
        : [],
      wrapAwareness: awareness.wrap,
    }),
    [spec, dialects, viewMode, awareness, fieldExtensions, specOptions, facts],
  );
};

const EMPTY: readonly string[] = [];
