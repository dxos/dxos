//
// Copyright 2026 DXOS.org
//

// Kept out of `Gantt.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a layout function exported beside them forces a full reload on every edit.

import { type GanttGroup, type GanttLane } from './Gantt.tsx';

export type Row = {
  lane: GanttLane;
  depth: number;
  index: number;
  groupId: string | undefined;
};

/** A group's rows, contiguous — which is what lets one rectangle enclose them. */
export type Band = {
  group: GanttGroup;
  first: number;
  last: number;
};

/**
 * Rows in reading order: the ungrouped lanes, then each group's band, a nested group's band directly
 * after its parent's. Within a band the lanes come in the order given, each nested under its
 * `parentId`.
 *
 * A band is contiguous by construction, which is the whole reason the order is settled here rather
 * than left to the caller: one rectangle can only enclose a run of adjacent rows.
 */
export const orderRows = (
  groups: readonly GanttGroup[],
  lanes: readonly GanttLane[],
): { rows: Row[]; bands: Band[] } => {
  const rows: Row[] = [];
  const bands: Band[] = [];

  /** A group's lanes, nested under one another by `parentId`; a parent in another group is ignored. */
  const pushLanes = (members: readonly GanttLane[], parentId: string | undefined, depth: number): void => {
    for (const lane of members.filter((member) => member.parentId === parentId)) {
      rows.push({ lane, depth, index: rows.length, groupId: lane.groupId });
      pushLanes(members, lane.id, depth + 1);
    }
  };

  const visitGroup = (group: GanttGroup, depth: number): void => {
    const first = rows.length;
    pushLanes(
      lanes.filter((lane) => lane.groupId === group.id),
      undefined,
      depth,
    );
    if (rows.length > first) {
      bands.push({ group, first, last: rows.length - 1 });
    }
    for (const child of groups.filter((candidate) => candidate.parentId === group.id)) {
      visitGroup(child, depth + 1);
    }
  };

  pushLanes(
    lanes.filter((lane) => lane.groupId === undefined),
    undefined,
    0,
  );
  for (const group of groups.filter((group) => group.parentId === undefined)) {
    visitGroup(group, 0);
  }
  return { rows, bands };
};
