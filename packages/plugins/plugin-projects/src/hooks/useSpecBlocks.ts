//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import type * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';

import { type ProjectOperation } from '#types';

import { readDocument, toSpecBlock } from '../operations/spec-block.ts';

const NONE: readonly ProjectOperation.SpecBlock[] = [];

/** The blocks a spec's text states, of `kind` when given, as `GetSpecBlocks` reports them; follows the text live. */
export const useSpecBlocks = (spec: Spec.Spec | undefined, kind?: string): readonly ProjectOperation.SpecBlock[] => {
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        if (!spec) {
          return NONE;
        }
        const snapshot = get(Obj.atom(spec));
        const text = get(Obj.atomReactive(snapshot.content));
        if (!text) {
          return NONE;
        }
        const document = readDocument(snapshot, text, get(Obj.atom(text)).content);
        return document.items
          .filter((item) => !item.entry && (!kind || item.kind === kind))
          .map((item) => toSpecBlock(document, item));
      }),
    [spec, kind],
  );
  return useAtomValue(atom);
};
