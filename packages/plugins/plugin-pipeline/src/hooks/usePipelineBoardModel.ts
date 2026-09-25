//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { useMemo } from 'react';

import { getQueryTarget } from '@dxos/app-toolkit/query';
import { Obj, Query } from '@dxos/echo';
import { type BoardModel } from '@dxos/react-ui-mosaic';
import { Pipeline } from '@dxos/types';

export const usePipelineBoardModel = (
  pipeline: Pipeline.Pipeline | undefined,
  registry: Registry.AtomRegistry,
): BoardModel<Pipeline.Column, Obj.Unknown> =>
  useMemo<BoardModel<Pipeline.Column, Obj.Unknown>>(() => {
    if (pipeline == null) {
      return emptyPipelineModel;
    }

    const db = Obj.getDatabase(pipeline);
    const columnsAtom = Obj.atomProperty(pipeline, 'columns');
    const columnAtomFamily = Atom.family<string, Atom.Atom<Pipeline.Column | undefined>>((viewKey: string) =>
      Atom.make((get) => {
        const columns = get(columnsAtom);
        return columns.find((c) => c.view.uri === viewKey);
      }),
    );

    const itemsAtomFamily = Atom.family<string, Atom.Atom<Obj.Unknown[]>>((viewKey: string) =>
      Atom.make((get) => {
        const column = get(columnAtomFamily(viewKey));
        if (column == null) {
          return [];
        }
        const viewSnapshot = get(Obj.atom(column.view));
        if (!viewSnapshot?.query?.ast) {
          return [];
        }
        const query = Query.fromAst(JSON.parse(JSON.stringify(viewSnapshot.query.ast)));
        const queryTarget = db ? getQueryTarget(query.ast, db) : undefined;
        if (!queryTarget) {
          return [];
        }
        const raw = get(queryTarget.query(query).atom);
        // `getQueryTarget` resolves to a database in every branch, so the space-vs-feed test that
        // used to guard this was already dead.
        return [...raw].reverse();
      }),
    );

    return {
      getColumnId: (data) => (data as Pipeline.Column).view.uri,
      getItemId: (data) => (data as Obj.Unknown).id,
      isColumn: (obj: unknown): obj is Pipeline.Column => Schema.is(Pipeline.Column)(obj),
      isItem: (obj: unknown): obj is Obj.Unknown => Obj.isObject(obj),
      columns: columnsAtom,
      items: (column) => itemsAtomFamily(column.view.uri),
      getColumns: () => [...registry.get(columnsAtom)],
      getItems: (column) => registry.get(itemsAtomFamily(column.view.uri)) ?? [],
    };
  }, [pipeline, registry]);

const emptyColumnsAtom = Atom.make(() => [] as Pipeline.Column[]);

const emptyItemsAtom = Atom.make(() => [] as Obj.Unknown[]);

const emptyPipelineModel: BoardModel<Pipeline.Column, Obj.Unknown> = {
  getColumnId: (data) => (data as Pipeline.Column).view.uri,
  getItemId: (data) => (data as Obj.Unknown).id,
  isColumn: (obj: unknown): obj is Pipeline.Column => Schema.is(Pipeline.Column)(obj),
  isItem: (obj): obj is Obj.Unknown => Obj.isObject(obj),
  columns: emptyColumnsAtom,
  items: () => emptyItemsAtom,
  getColumns: () => [],
  getItems: () => [],
};
