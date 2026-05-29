//
// Copyright 2026 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Obj, Query, Relation } from '@dxos/echo';
import { type TypeSpec, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { HasConnection, HasRelationship, Organization, Person, Pipeline } from '@dxos/types';
import { range } from '@dxos/util';

import { type BundleEdge } from '../components/Tree/layout';
import { type TreeNode } from '../components/Tree/types';

const SECTORS = ['Technology', 'Finance', 'Research', 'Media'];
const CONNECTION_KINDS = ['partner', 'investor', 'vendor', 'customer'];

const pick = <T>(arr: readonly T[], rng = Math.random): T => arr[Math.floor(rng() * arr.length)];

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
 * then layers manual HasConnection relations on top — the connection schema is fixed
 * (Org→Org) so it isn't a fit for the generator's reference inference.
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

  const factory = createObjectFactory(space.db, generator);
  await factory(specs);

  const organizations = await space.db.query(Query.type(Organization.Organization)).run();
  const people = await space.db.query(Query.type(Person.Person)).run();

  const connections: Obj.Any[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < connectionCount && organizations.length >= 2; i++) {
    const source = pick(organizations);
    const target = pick(organizations);
    if (source.id === target.id) {
      continue;
    }
    const key = `${source.id}->${target.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const relation = Relation.make(HasConnection.HasConnection, {
      [Relation.Source]: source as any,
      [Relation.Target]: target as any,
      kind: pick(CONNECTION_KINDS),
    });
    connections.push(space.db.add(relation as any));
  }

  await space.db.flush();
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

export type GenerateOptions = {
  spec?: TypeSpec[];
  relations?: {
    kind: string;
    count: number;
  }[];
};

const defaultGenerateTypes: TypeSpec[] = [
  {
    type: Organization.Organization,
    count: 20,
  },
  {
    type: Person.Person,
    count: 30,
  },
  {
    type: Pipeline.Pipeline,
    count: 10,
  },
];

const defaultGenerateRelations: NonNullable<GenerateOptions['relations']> = [
  {
    kind: 'friend',
    count: 20,
  },
];

/**
 * Populate a space with a mixed dataset (Orgs, Pipelines, People) plus
 * `HasRelationship` edges between random pairs of People.
 *
 * Used by the force-directed and canvas-force graph stories that want a
 * heterogeneous typed dataset without caring about the precise shape of relations.
 */
export const generate = async (
  space: Space,
  generator: ValueGenerator,
  { spec = defaultGenerateTypes, relations = defaultGenerateRelations }: GenerateOptions = {},
) => {
  const createObjects = createObjectFactory(space.db, generator);
  await createObjects(spec);

  const contacts: Obj.Any[] = await space.db.query(Query.type(Person.Person)).run();
  if (contacts.length < 2 || !relations.length) {
    return;
  }

  // TODO(burdon): Pick.
  const relation = relations[0];
  for (const _ of range(relation.count)) {
    const source = pick(contacts);
    const target = pick(contacts);
    if (source.id !== target.id) {
      space.db.add(
        Relation.make(HasRelationship.HasRelationship, {
          [Relation.Source]: source as any,
          [Relation.Target]: target as any,
          kind: relation.kind,
        }) as any,
      );
    }
  }
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
