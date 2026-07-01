//
// Copyright 2026 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Obj, Query, Relation } from '@dxos/echo';
import { type BundleEdge, type TreeNode } from '@dxos/react-ui-graph';
import {
  type RelationSpec,
  type TypeSpec,
  type ValueGenerator,
  createObjectFactory,
  createRelationFactory,
} from '@dxos/schema/testing';
import { HasConnection, Organization, Person } from '@dxos/types';

const SECTORS = ['Technology', 'Finance', 'Research', 'Media'];
const CONNECTION_KINDS = ['partner', 'investor', 'vendor', 'customer'];

export type ConnectedOrgsResult = {
  organizations: Obj.Any[];
  people: Obj.Any[];
  connections: Obj.Any[];
};

export type ConnectedOrgsOptions = {
  organizationCount?: number;
  personCount?: number;
  connectionCount?: number;
};

/**
 * Populate a space with Organizations, People, and HasConnection relations between organizations.
 * Uses `createObjectFactory` to generate Org/Person properties from their `GeneratorAnnotation`s,
 * then `createRelationFactory` to wire HasConnection relations (Org→Org) between them, spreading
 * the connections across the available kinds.
 */
export const generateConnectedOrgs = async (
  space: Space,
  generator: ValueGenerator,
  { organizationCount = 12, personCount = 24, connectionCount = 18 }: ConnectedOrgsOptions = {},
): Promise<ConnectedOrgsResult> => {
  const specs: TypeSpec[] = [
    { type: Organization.Organization, count: organizationCount },
    // Person has a Ref to Organization — generator fills it from objects already in db.
    { type: Person.Person, count: personCount },
  ];

  await createObjectFactory(space.db, generator)(specs);

  // Distribute the requested connections evenly across the connection kinds.
  const relationSpecs: RelationSpec[] = CONNECTION_KINDS.map((kind, index) => ({
    type: HasConnection.HasConnection,
    count:
      Math.floor(connectionCount / CONNECTION_KINDS.length) +
      (index < connectionCount % CONNECTION_KINDS.length ? 1 : 0),
    data: { kind },
  }));
  const connections = await createRelationFactory(space.db, generator)(relationSpecs);

  const organizations = await space.db.query(Query.type(Organization.Organization)).run();
  const people = await space.db.query(Query.type(Person.Person)).run();
  return { organizations, people, connections };
};

/**
 * Build a TreeNode hierarchy: Root → Sector → Organization (leaf).
 * Organizations are deterministically bucketed into `SECTORS` so the demo has visible groups.
 */
export const buildOrgHierarchy = (organizations: Obj.Any[], sectors: readonly string[] = SECTORS): TreeNode => {
  // Avoid modulo-by-zero / missing-bucket crashes when the caller passes an empty sectors list.
  const activeSectors = sectors.length > 0 ? sectors : ['Uncategorized'];
  const buckets = new Map<string, TreeNode[]>();
  for (const sector of activeSectors) {
    buckets.set(sector, []);
  }
  for (let i = 0; i < organizations.length; i++) {
    const org = organizations[i] as any;
    const sector = activeSectors[i % activeSectors.length];
    buckets.get(sector)!.push({
      id: org.id,
      label: org.name ?? org.id.slice(0, 6),
    });
  }

  return {
    id: 'root',
    label: 'Organizations',
    children: activeSectors.map((sector) => ({
      id: `sector:${sector}`,
      label: sector,
      children: buckets.get(sector) ?? [],
    })),
  };
};

/**
 * Convert HasConnection relations into bundle edges between organization ids.
 */
export const connectionsToEdges = (connections: Obj.Any[]): BundleEdge[] => {
  return connections
    .map((relation): BundleEdge | undefined => {
      const source = Relation.getSource(relation as any) as any;
      const target = Relation.getTarget(relation as any) as any;
      if (!source?.id || !target?.id) {
        return undefined;
      }
      return {
        source: source.id,
        target: target.id,
        kind: (relation as any).kind,
      };
    })
    .filter((e): e is BundleEdge => Boolean(e));
};
