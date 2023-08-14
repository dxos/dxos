//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SessionNode, useNavChildren, useRelatedNodes, useSessionGraph } from '@braneframe/plugin-session';
import { Tree } from '@dxos/aurora';
import { Surface } from '@dxos/react-surface';

import { BranchTreeItem } from './BranchTreeItem';
import { LeafTreeItem } from './LeafTreeItem';

export type TreeViewProps = {
  node: SessionNode;
};

// const TreeViewSortableImpl = ({ parent, items }: { parent: SessionNode; items: SessionNode[] }) => {
//   // todo(thure): `observer` does not trigger updates when node indices are updated.
//   const itemsInOrder = items.sort(sortByIndex);
//   const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
//   const dnd = useDnd();
//
//   const [activeId, setActiveId] = useState<string | null>(null);
//   const [overIsMember, setOverIsMember] = useState(false);
//
//   useDragEnd(
//     ({ active, over }: DragEndEvent) => {
//       // TODO(burdon): Use traversal instead of `get`?
//       const activeNode = active?.data?.current?.treeitem as SessionNode | null;
//       const overNode = over?.data?.current?.treeitem as SessionNode | null;
//       if (activeNode && overNode && activeNode.parent?.id === parent.id) {
//         if (parent.onChildrenRearrange && overNode.parent?.id === parent.id) {
//           if (overNode.id !== activeNode.id) {
//             dnd.overlayDropAnimation = 'around';
//             const activeIndex = itemsInOrder.findIndex(({ id }) => id === activeNode.id);
//             const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);
//
//             const beforeNode = itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1];
//             const afterNode = itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex];
//             if (beforeNode?.index === afterNode?.index) {
//               const nextActiveIndex = getIndexAbove(beforeNode.index);
//               const nextAfterIndex = getIndexAbove(nextActiveIndex);
//               parent.onChildrenRearrange(activeNode, nextActiveIndex);
//               parent.onChildrenRearrange(afterNode, nextAfterIndex);
//             } else {
//               parent.onChildrenRearrange(
//                 activeNode,
//                 overIndex < 1
//                   ? getIndexBelow(itemsInOrder[0].index)
//                   : getIndexBetween(beforeNode.index, afterNode?.index),
//               );
//             }
//           }
//         } else if (overNode.parent?.onMoveNode) {
//           dnd.overlayDropAnimation = 'into';
//           overNode.parent?.onMoveNode(overNode.parent, activeNode.parent!, activeNode, 'a1'); // TODO(burdon): Index.
//         }
//       }
//       setActiveId(null);
//       setOverIsMember(false);
//     },
//     [parent, itemsInOrder],
//   );
//
//   useDragOver(
//     ({ active, over }) => {
//       const node: SessionNode | null = get(active, 'data.current.treeitem', null);
//       setOverIsMember(
//         !!node && get(node, 'parent.id') === parent.id && get(over, 'data.current.treeitem.parent.id') === parent.id,
//       );
//       setActiveId(node?.id ?? null);
//     },
//     [parent],
//   );
//
//   return (
//     <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
//       {itemsInOrder.map((item) =>
//         item.attributes?.role === 'branch' || Object.values(item.pluginChildren ?? {}).flat().length ? (
//           <SortableBranchTreeItem key={item.id} node={item} rearranging={overIsMember && activeId === item.id} />
//         ) : (
//           <SortableLeafTreeItem key={item.id} node={item} rearranging={overIsMember && activeId === item.id} />
//         ),
//       )}
//     </SortableContext>
//   );
// };

export const TreeView = ({ node }: TreeViewProps) => {
  const items = useNavChildren(node.id);
  const parent = useRelatedNodes(node.id, 'provenance-parent');
  // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
  const visibleItems = items && Object.values(items).filter((item) => !item.params?.hidden);
  const {
    sessionGraph: { relations },
  } = useSessionGraph();
  return (
    <Tree.Branch>
      {visibleItems?.length ? (
        visibleItems
          // .sort(sortByIndex)
          .map((item) =>
            item.params?.role === 'branch' || relations[item.id]['navmenu-child']?.size > 0 ? (
              <BranchTreeItem key={item.id} node={item} />
            ) : (
              <LeafTreeItem key={item.id} node={item} />
            ),
          )
      ) : (
        <Surface role='tree--empty' data={parent} />
      )}
    </Tree.Branch>
  );
};
