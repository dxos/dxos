//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { useMemo } from 'react';

import { getQueryTarget } from '@dxos/app-toolkit/query';
import { Obj, Query } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { getSpace, isSpace } from '@dxos/react-client/echo';
import { type BoardModel } from '@dxos/react-ui-mosaic';
import { Pipeline } from '@dxos/types';

export const usePipelineBoardModel = (
  pipeline: Pipeline.Pipeline | undefined,
  registry: Registry.Registry,
): BoardModel<Pipeline.Column, Obj.Unknown> =>
  useMemo<BoardModel<Pipeline.Column, Obj.Unknown>>(() => {
    if (pipeline == null) {
      return emptyPipelineModel;
    }

    const space = getSpace(pipeline);
    const columnsAtom = AtomObj.makeProperty(pipeline, 'columns');
    const columnAtomFamily = Atom.family<string, Atom.Atom<Pipeline.Column | undefined>>((viewKey: string) =>
      Atom.make((get) => {
        const columns = get(columnsAtom);
        return columns.find((c) => c.view.dxn.toString() === viewKey);
      }),
    );

    const itemsAtomFamily = Atom.family<string, Atom.Atom<Obj.Unknown[]>>((viewKey: string) =>
      Atom.make((get) => {
        const column = get(columnAtomFamily(viewKey));
        if (column == null) {
          return [];
        }
        const viewSnapshot = get(AtomObj.make(column.view));
        if (!viewSnapshot?.query?.ast) {
          return [];
        }
        const query = Query.fromAst(JSON.parse(JSON.stringify(viewSnapshot.query.ast)));
        const queryTarget = space ? getQueryTarget(query.ast, space) : undefined;
        if (!queryTarget) {
          return [];
        }
        const raw = get(AtomQuery.make(queryTarget, query));
        return isSpace(queryTarget) ? raw : [...raw].reverse();
      }),
    );

    return {
      getColumnId: (data) => (data as Pipeline.Column).view.dxn.toString(),
      getItemId: (data) => (data as Obj.Unknown).id,
      isColumn: (obj: unknown): obj is Pipeline.Column => Schema.is(Pipeline.Column)(obj),
      isItem: (obj: unknown): obj is Obj.Unknown => Obj.isObject(obj),
      columns: columnsAtom,
      items: (column) => itemsAtomFamily(column.view.dxn.toString()),
      getColumns: () => [...registry.get(columnsAtom)],
      getItems: (column) => registry.get(itemsAtomFamily(column.view.dxn.toString())) ?? [],
    };
  }, [pipeline, registry]);

const emptyColumnsAtom = Atom.make(() => [] as Pipeline.Column[]);

const emptyItemsAtom = Atom.make(() => [] as Obj.Unknown[]);

const emptyPipelineModel: BoardModel<Pipeline.Column, Obj.Unknown> = {
  getColumnId: (data) => (data as Pipeline.Column).view.dxn.toString(),
  getItemId: (data) => (data as Obj.Unknown).id,
  isColumn: (obj: unknown): obj is Pipeline.Column => Schema.is(Pipeline.Column)(obj),
  isItem: (obj): obj is Obj.Unknown => Obj.isObject(obj),
  columns: emptyColumnsAtom,
  items: () => emptyItemsAtom,
  getColumns: () => [],
  getItems: () => [],
};
