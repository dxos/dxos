//
// Copyright 2026 DXOS.org
//

import { type Role } from '@dxos/deus/dialect';

import { type DefinitionGraphModel, type DefinitionModel } from './spec-model.ts';

/**
 * What a block type is to a spec, as its dialect declares it: an anchor states intent and names the blocks that serve
 * it; structure is what they are built from; verification checks them; context is what the spec relies on from outside.
 */
export type BlockRole = Role;

/** One anchor and the blocks it names. */
export type DefinitionGroup = {
  /** The anchor's id. */
  id: string;
  anchor: DefinitionModel;
  /** Structure only this group names. */
  owned: string[];
  /** Structure other groups name too. */
  shared: string[];
  /** Context blocks it names. */
  context: string[];
  /** Verification blocks that name it or what it owns. */
  verifiedBy: string[];
  /** Anchors it names. */
  buildsOn: string[];
};

/** Groups gathered around the structure they share most. */
export type DefinitionCluster = {
  id: string;
  /** The block its groups share most; absent for the groups that share nothing. */
  hub?: string;
  groups: string[];
  /** Shared structure whose groups sit mostly in this cluster, most shared first. */
  shared: string[];
};

/** How many references the members of one cluster make into another. */
export type ClusterLink = { from: string; to: string; count: number };

export type DefinitionGrouping = {
  /** The role each kind present took. */
  roles: ReadonlyMap<string, BlockRole>;
  groups: DefinitionGroup[];
  clusters: DefinitionCluster[];
  links: ClusterLink[];
  /** The groups naming each block. */
  memberOf: ReadonlyMap<string, string[]>;
  /** The cluster each shared or context block sits in. */
  homeOf: ReadonlyMap<string, string>;
  /** Structure no group names. */
  ungrouped: string[];
};

export const UNSHARED_CLUSTER_ID = 'cluster:unshared';

/** The role of each kind present, as its first definition carries it. */
export const rolesOf = ({ definitions }: DefinitionGraphModel): Map<string, BlockRole> => {
  const roles = new Map<string, BlockRole>();
  for (const { kind, role } of definitions) {
    roles.has(kind) || roles.set(kind, role);
  }
  return roles;
};

/**
 * A spec's definitions grouped by what names them. Every anchor is a group of the structure it names, owned when no
 * other group names it and shared otherwise. Each group joins the cluster of the shared block it names that the most
 * groups name; a group that shares nothing joins the cluster of an anchor it builds on, else the unshared cluster.
 */
export const groupDefinitions = (model: DefinitionGraphModel): DefinitionGrouping => {
  const roles = rolesOf(model);
  const byId = new Map(model.definitions.map((definition) => [definition.id, definition]));
  const roleOf = (id: string) => byId.get(id)?.role;
  const named = new Map<string, Set<string>>();
  for (const { from, to } of model.edges) {
    if (from !== to && byId.has(from) && byId.has(to)) {
      named.set(from, (named.get(from) ?? new Set()).add(to));
    }
  }

  let anchors = model.definitions.filter(({ id }) => roleOf(id) === 'anchor');
  if (anchors.length === 0) {
    const referenced = new Set(
      model.edges.filter(({ from, to }) => from !== to && roleOf(from) === 'structure').map(({ to }) => to),
    );
    anchors = model.definitions.filter(({ id }) => roleOf(id) === 'structure' && !referenced.has(id) && named.has(id));
  }
  const anchorIds = new Set(anchors.map(({ id }) => id));

  const memberOf = new Map<string, string[]>();
  for (const { id } of anchors) {
    for (const target of named.get(id) ?? []) {
      if (!anchorIds.has(target) && roleOf(target) !== 'verification') {
        memberOf.set(target, [...(memberOf.get(target) ?? []), id]);
      }
    }
  }
  const groups = anchors.map((anchor): DefinitionGroup => {
    const targets = [...(named.get(anchor.id) ?? [])];
    const structure = targets.filter((id) => !anchorIds.has(id) && roleOf(id) === 'structure');
    return {
      id: anchor.id,
      anchor,
      owned: structure.filter((id) => memberOf.get(id)?.length === 1),
      shared: structure.filter((id) => (memberOf.get(id)?.length ?? 0) > 1),
      context: targets.filter((id) => !anchorIds.has(id) && roleOf(id) === 'context'),
      verifiedBy: [],
      buildsOn: targets.filter((id) => anchorIds.has(id)),
    };
  });
  const groupById = new Map(groups.map((group) => [group.id, group]));
  for (const { id } of model.definitions.filter(({ id }) => roleOf(id) === 'verification')) {
    const targets = [...(named.get(id) ?? [])];
    const direct = targets.filter((target) => anchorIds.has(target));
    const verified =
      direct.length > 0
        ? direct
        : groups.filter(({ owned }) => owned.some((owned) => targets.includes(owned))).map(({ id }) => id);
    verified.forEach((group) => groupById.get(group)!.verifiedBy.push(id));
  }

  const count = (id: string) => memberOf.get(id)?.length ?? 0;
  const declared = new Map(model.definitions.map(({ id }, index) => [id, index]));
  const byDeclaration = (ids: readonly string[]) => [...ids].sort((a, b) => declared.get(a)! - declared.get(b)!);
  const hubOf = new Map<string, string>();
  for (const group of groups) {
    // Ties go to the block declared first, so a cluster does not move when an unrelated block is added.
    const hub = byDeclaration(group.shared).reduce<string | undefined>(
      (best, id) => (best === undefined || count(id) > count(best) ? id : best),
      undefined,
    );
    hub !== undefined && hubOf.set(group.id, hub);
  }
  // A group that shares nothing takes the hub of an anchor it builds on, the nearer first: each round reads only the
  // hubs the rounds before it settled, so the order the groups are declared in does not matter.
  for (let settled = new Map(hubOf); ; settled = new Map(hubOf)) {
    for (const group of groups) {
      const base = hubOf.has(group.id) ? undefined : byDeclaration(group.buildsOn).find((id) => settled.has(id));
      base !== undefined && hubOf.set(group.id, settled.get(base)!);
    }
    if (hubOf.size === settled.size) {
      break;
    }
  }
  const clusters = new Map<string, DefinitionCluster>();
  const clusterOf = new Map<string, string>();
  for (const group of groups) {
    const hub = hubOf.get(group.id);
    const id = hub === undefined ? UNSHARED_CLUSTER_ID : `cluster:${hub}`;
    const cluster = clusters.get(id) ?? { id, hub, groups: [], shared: [] };
    cluster.groups.push(group.id);
    clusters.set(id, cluster);
    clusterOf.set(group.id, id);
  }
  // A hub sits in its own cluster; any other shared or context block in the cluster most of the groups naming it are
  // in, the first of them on a tie.
  const majority = (id: string) => {
    const votes = new Map<string, number>();
    memberOf.get(id)!.forEach((group) => votes.set(clusterOf.get(group)!, (votes.get(clusterOf.get(group)!) ?? 0) + 1));
    return [...votes].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  };
  const sharedIds = [...new Set(groups.flatMap(({ shared }) => shared))].sort((a, b) => count(b) - count(a));
  const homeOf = new Map<string, string>();
  for (const id of sharedIds) {
    const home = clusters.has(`cluster:${id}`) ? `cluster:${id}` : majority(id);
    homeOf.set(id, home);
    clusters.get(home)!.shared.push(id);
  }
  for (const id of new Set(groups.flatMap(({ context }) => context))) {
    homeOf.set(id, majority(id));
  }
  // Clusters sharing nothing go last, the rest by size.
  const ordered = [...clusters.values()].sort(
    (a, b) => Number(a.hub === undefined) - Number(b.hub === undefined) || b.groups.length - a.groups.length,
  );

  const placeOf = (id: string): string | undefined => {
    const groupCluster = clusterOf.get(id);
    if (groupCluster) {
      return groupCluster;
    }
    const groupIds = memberOf.get(id);
    return homeOf.get(id) ?? (groupIds?.length === 1 ? clusterOf.get(groupIds[0]) : undefined);
  };
  const linkCounts = new Map<string, number>();
  for (const { from, to } of model.edges) {
    const [a, b] = [placeOf(from), placeOf(to)];
    if (a && b && a !== b) {
      const key = `${a}\n${b}`;
      linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
    }
  }
  const links = [...linkCounts].map(([key, count]) => {
    const [from, to] = key.split('\n');
    return { from, to, count };
  });

  return {
    roles,
    groups,
    clusters: ordered,
    links,
    memberOf,
    homeOf,
    ungrouped: model.definitions
      .filter(({ id }) => roleOf(id) === 'structure' && !anchorIds.has(id) && !memberOf.has(id))
      .map(({ id }) => id),
  };
};

/** The blocks a cluster draws as its own: each group's anchor and owned blocks, and the shared and context ones at home there. */
export const clusterBlocks = (grouping: DefinitionGrouping, clusterId: string): string[] => {
  const cluster = grouping.clusters.find(({ id }) => id === clusterId);
  if (!cluster) {
    return [];
  }
  const shared = new Set(cluster.shared);
  const ids = grouping.groups
    .filter(({ id }) => cluster.groups.includes(id))
    .flatMap((group) => [
      group.id,
      ...group.owned,
      ...group.shared.filter((id) => shared.has(id)),
      ...group.context.filter((id) => grouping.homeOf.get(id) === clusterId),
    ]);
  return [...new Set(ids)];
};
