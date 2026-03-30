//
// Copyright 2024 DXOS.org

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useEffect, useMemo } from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeModel, TreeProvider } from './TreeContext';
import { TreeItemById, type TreeItemByIdProps, type TreeItemProps } from './TreeItem';

export type TreeProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  rootId?: string;
  path?: string[];
  id: string;
} & Partial<Pick<TreegridRootProps, 'gridTemplateColumns' | 'classNames'>> &
  Pick<
    TreeItemProps<T>,
    | 'draggable'
    | 'renderColumns'
    | 'blockInstruction'
    | 'canDrop'
    | 'canSelect'
    | 'onOpenChange'
    | 'onSelect'
    | 'onItemHover'
    | 'levelOffset'
  >;

export const Tree = <T extends { id: string } = any>({
  model,
  rootId,
  path,
  id,
  draggable = false,
  gridTemplateColumns = '[tree-row-start] 1fr min-content [tree-row-end]',
  classNames,
  levelOffset,
  renderColumns,
  blockInstruction,
  canDrop,
  canSelect,
  onOpenChange,
  onSelect,
  onItemHover,
}: TreeProps<T>) => {
  const childIds = useAtomValue(model.childIds(rootId));
  const treePath = useMemo(() => (path ? [...path, id] : [id]), [id, path]);

  useEffect(() => {
    if (!draggable) {
      return;
    }

    const onDragOver = (event: DragEvent) => {
      if ((globalThis as any).__dxTreeDndDebugDocumentDragOverLogged) {
        return;
      }
      (globalThis as any).__dxTreeDndDebugDocumentDragOverLogged = true;
      // #region agent log H7
      fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H7',location:'Tree.tsx:document-dragover',message:'Document received native dragover while tree mounted',data:{id: String(id),targetTag:event.target instanceof Element ? event.target.tagName : null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    const onDrop = () => {
      (globalThis as any).__dxTreeDndDebugDocumentDragOverLogged = false;
    };

    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('drop', onDrop, true);

    return () => {
      document.removeEventListener('dragover', onDragOver, true);
      document.removeEventListener('drop', onDrop, true);
    };
  }, [draggable, id]);

  const childProps: Omit<TreeItemByIdProps, 'id' | 'last'> = {
    path: treePath,
    levelOffset,
    draggable,
    renderColumns,
    blockInstruction,
    canDrop,
    canSelect,
    onOpenChange,
    onSelect,
    onItemHover,
  };

  return (
    <Treegrid.Root gridTemplateColumns={gridTemplateColumns} classNames={classNames}>
      <TreeProvider value={model}>
        {childIds.map((childId, index) => (
          <TreeItemById key={childId} id={childId} last={index === childIds.length - 1} {...childProps} />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
