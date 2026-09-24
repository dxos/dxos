//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useConnections } from '@dxos/plugin-graph/hooks';
import { Avatar, Icon, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel, useSearchListItem, useSearchListResults } from '@dxos/react-ui-search';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useExpandPath } from '../hooks.ts';

export type NavBranchProps = {
  id: string;
};

/** Reported while a branch's groups are still unexpanded: nothing is yet known to be empty. */
const NO_EMPTY_GROUPS: ReadonlySet<string> = new Set();

/**
 * Ids of the given nodes that are section groups with nothing under them.
 *
 * A group node (Communications, Content, Assistant, System, …) is a label over the children other
 * plugins hang off it, not a destination of its own — desktop's navtree drops an empty one outright
 * (`TreeItem`), and mobile has to do the same or the row opens a permanently blank panel. Whether a
 * group is empty is a property of the running plugin set (no inbox plugin leaves Communications with
 * no contributor at all) and of the space's contents (the Assistant sections appear with the first
 * chat), so it is read reactively rather than decided once.
 */
const useEmptyGroupIds = (graph: AppGraph.ExpandableGraph, nodes: AppGraphNode.Node[]): ReadonlySet<string> => {
  const groupIds = useMemo(
    () => nodes.filter((node) => node.properties.disposition === 'group').map((node) => node.id),
    [nodes],
  );
  // Identity-stable key: `groupIds` is a fresh array whenever the graph re-emits this branch's
  // children, and rebuilding the atom on every emission would drop its subscriptions each time.
  const groupKey = groupIds.join('\n');
  const [expandedKey, setExpandedKey] = useState<string>();

  // Groups sit one level below this branch, so `useExpandPath` does not reach their children; without
  // expanding them their connectors never run and every group would read as empty. This has to be a
  // layout effect: `expandSync` runs every matching builder extension before it returns, so expanding
  // here and flipping the gate below lands the settled row set in the re-render React flushes before
  // the browser paints, instead of a frame later.
  useLayoutEffect(() => {
    for (const groupId of groupKey.split('\n').filter(Boolean)) {
      AppGraph.expandSync(graph, groupId, 'child');
    }
    setExpandedKey(groupKey);
  }, [graph, groupKey]);

  const emptyIdsAtom = useMemo(
    () =>
      Atom.make(
        (get) =>
          new Set(
            groupKey
              .split('\n')
              .filter(Boolean)
              .filter((groupId) => get(graph.connections(groupId, 'child')).length === 0),
          ),
      ),
    [graph, groupKey],
  );

  const emptyIds = useAtomValue(emptyIdsAtom);

  // An unexpanded group reads as childless whether or not it has children, so filtering on that first
  // read would drop a populated row and pop it back in once the expansion landed. Unknown counts as
  // visible until this branch's own groups have been expanded, which keeps the guarantee independent
  // of whether a connector happens to resolve synchronously.
  return expandedKey === groupKey ? emptyIds : NO_EMPTY_GROUPS;
};

/**
 * Renders the children of a graph branch node as a searchable mosaic list.
 * Used for any node with `role: 'branch'` or a workspace disposition, including
 * spaces, collection sections, type sections, and schema nodes.
 */
export const NavBranch = ({ id }: NavBranchProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { graph } = useAppGraph();

  useExpandPath(id);

  const children = useConnections(graph, id, 'child');
  const emptyGroupIds = useEmptyGroupIds(graph, children);

  const visibleChildren = useMemo(
    () => children.filter((node) => node.properties.disposition !== 'hidden' && !emptyGroupIds.has(node.id)),
    [children, emptyGroupIds],
  );

  const { results, handleSearch } = useSearchListResults({
    items: visibleChildren,
    extract: (child) => toLocalizedString(child.properties.label, t),
  });

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root centered padding thin>
          <ScrollArea.Viewport>
            {results.length === 0 ? (
              // A branch with no openable children is a legitimate state (an unpopulated section, or a
              // search that matched nothing); rendering nothing at all reads as a broken screen.
              <Empty label={t(visibleChildren.length === 0 ? 'empty-branch.message' : 'no-results.message')} />
            ) : (
              <Mosaic.Stack
                classNames='py-2 gap-1'
                draggable={false}
                items={results}
                getId={(item) => item.id}
                Tile={NavBranchTile}
              />
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </SearchPanel>
  );
};

const NavBranchTile: MosaicStackTileComponent<AppGraphNode.Node> = (props) => {
  const data = props.data;
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const ref = useRef<HTMLDivElement>(null);
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const isSelected = selectedValue === data.id;

  const name = toLocalizedString(data.properties.label, t);

  const handleSelect = useCallback(
    () => void invokePromise(LayoutOperation.Open, { subject: [data.id] }),
    [invokePromise, data.id],
  );

  // Register this item with the search context.
  useEffect(() => {
    if (ref.current) {
      registerItem(data.id, ref.current, handleSelect);
    }

    return () => unregisterItem(data.id);
  }, [data.id, handleSelect, registerItem, unregisterItem]);

  // Scroll into view when selected.
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  return (
    <Card.Root
      ref={ref}
      role='button'
      fullWidth
      tabIndex={-1} // TODO(burdon): Use Mosaic.Focus.
      data-selected={isSelected}
      // The search list auto-selects the first row for keyboard nav; a coarse (touch) pointer has no
      // keyboard focus to reflect, so the highlight would just read as an unexplained random row.
      classNames={mx('dx-focus-ring cursor-pointer', isSelected && 'bg-selected-surface pointer-coarse:bg-transparent')}
      onClick={handleSelect}
    >
      <Card.Header>
        <Avatar.Root>
          {/* `Card.Header` is a 3-track subgrid: the gutter `Card.Block`s and the center
              `Card.Title` are what keep the icon, label, and caret on one row. */}
          <Card.Block>
            <Avatar.Content
              hue={data.properties.hue}
              icon={data.properties.icon}
              hueVariant='transparent'
              variant='square'
              size={8}
              fallback={name}
            />
          </Card.Block>
          <Avatar.Label asChild>
            <Card.Title>{name}</Card.Title>
          </Avatar.Label>
          <Card.Block end>
            <Icon icon='ph--caret-right--regular' />
          </Card.Block>
        </Avatar.Root>
      </Card.Header>
    </Card.Root>
  );
};
