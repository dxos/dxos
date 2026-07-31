//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapability, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Type } from '@dxos/echo';
import { type IdentitySpec, planMerge } from '@dxos/extractor';
import { type Space } from '@dxos/react-client/echo';

import { SpaceOperation } from '../../operations/definitions';
import { SpaceCapabilities } from '../../types';

export type UseDuplicatesProps = {
  space: Space;
  type: Type.AnyEntity;
  /** Live query results, so a group resolves to reactive objects rather than the scan's snapshots. */
  objects: readonly Obj.Unknown[];
  /** Scan only while the duplicates layout is showing. */
  enabled: boolean;
};

export type UseDuplicatesResult = {
  /** `undefined` when no plugin registered an identity rule for this type — the tab is then hidden. */
  spec: IdentitySpec<any> | undefined;
  /** Members of the group under review, or `[]` when the review is finished. */
  current: Obj.Unknown[];
  /** 1-based position of the current group, for the toolbar counter. */
  position: number;
  total: number;
  scanning: boolean;
  next: () => void;
  previous: () => void;
  /** Re-runs the scan (after a merge, or when re-entering the tab). */
  refresh: () => void;
};

/**
 * Drives the duplicates review: runs `FindDuplicates` for the type, then walks the returned groups
 * one at a time. Groups are held as ids and resolved against the live query on every render, so a
 * merged-away member disappears from the current group without a rescan.
 */
export const useDuplicates = ({ space, type, objects, enabled }: UseDuplicatesProps): UseDuplicatesResult => {
  const { invokePromise } = useOperationInvoker();
  const specs = useCapabilities(SpaceCapabilities.IdentitySpec);
  const typename = Type.getTypename(type);
  const spec = useMemo(
    () => specs.find((candidate) => Type.getTypename(candidate.type) === typename),
    [specs, typename],
  );

  const [groups, setGroups] = useState<readonly SpaceOperation.DuplicateGroupResult[]>([]);
  const [index, setIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  const { lastMergeAt } = useAtomCapability(SpaceCapabilities.EphemeralState);

  const refresh = useCallback(() => {
    if (!spec) {
      return;
    }
    setScanning(true);
    void invokePromise(SpaceOperation.FindDuplicates, { typename }, { spaceId: space.id })
      .then(({ data }) => {
        setGroups(data?.groups ?? []);
        setIndex(0);
      })
      .finally(() => setScanning(false));
  }, [invokePromise, spec, typename, space.id]);

  // `lastMergeAt` is a dependency, not a read: a committed merge invalidates the scan.
  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh, lastMergeAt]);

  const byId = useMemo(() => new Map(objects.map((object) => [object.id, object])), [objects]);
  const current = useMemo(() => {
    const group = groups[index];
    return group ? group.objectIds.flatMap((id) => byId.get(id) ?? []) : [];
  }, [groups, index, byId]);

  return {
    spec,
    current,
    position: groups.length === 0 ? 0 : index + 1,
    total: groups.length,
    scanning,
    next: useCallback(() => setIndex((value) => Math.min(value + 1, groups.length)), [groups.length]),
    previous: useCallback(() => setIndex((value) => Math.max(value - 1, 0)), []),
    refresh,
  };
};

/** Builds the detached preview for the group under review; `undefined` when there is nothing to merge. */
export const buildMergePreview = (
  spec: IdentitySpec<any> | undefined,
  objects: readonly Obj.Unknown[],
): Obj.Unknown | undefined => {
  if (!spec || objects.length < 2) {
    return undefined;
  }
  const { preview } = planMerge(spec, { keys: [], objects });
  return Obj.isObject(preview) ? preview : undefined;
};
