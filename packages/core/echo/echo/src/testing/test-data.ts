//
// Copyright 2025 DXOS.org
//

import { DatabaseDirectory, EntityStructure } from '@dxos/echo-protocol';
import { EID, EntityId, PublicKey } from '@dxos/keys';

import { Type } from '../index';
import { TestSchema } from './test-schema';

// Lazy init: Cloudflare workers disallow non-determinism at module scope (e.g. random keys).
let cachedSpaceKeyHex: string | undefined;
const getSpaceKeyHex = (): string => {
  if (cachedSpaceKeyHex === undefined) {
    cachedSpaceKeyHex = PublicKey.random().toHex();
  }
  return cachedSpaceKeyHex;
};

let cachedPeopleAlice: DatabaseDirectory | undefined;
let cachedPeopleBob: DatabaseDirectory | undefined;
let cachedOrgsDxos: DatabaseDirectory | undefined;
let cachedOrgsCyberdyne: DatabaseDirectory | undefined;
let cachedWorksFredCyberdyne: DatabaseDirectory | undefined;
let cachedWorksAliceAperture: DatabaseDirectory | undefined;
let cachedTasksTask1: DatabaseDirectory | undefined;
let cachedTasksTask2: DatabaseDirectory | undefined;

// TODO(burdon): Use Obj.make.

export const PEOPLE = {
  get alice(): DatabaseDirectory {
    if (cachedPeopleAlice === undefined) {
      cachedPeopleAlice = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeObject({
            type: Type.getURI(TestSchema.Person)!,
            data: {
              name: 'Alice',
            },
          }),
        },
      });
    }
    return cachedPeopleAlice;
  },

  get bob(): DatabaseDirectory {
    if (cachedPeopleBob === undefined) {
      cachedPeopleBob = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeObject({
            type: Type.getURI(TestSchema.Person)!,
            data: {
              name: 'Bob',
            },
          }),
        },
      });
    }
    return cachedPeopleBob;
  },
};

export const ORGS = {
  get dxos(): DatabaseDirectory {
    if (cachedOrgsDxos === undefined) {
      cachedOrgsDxos = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeObject({
            type: Type.getURI(TestSchema.Organization)!,
            data: {
              name: 'DXOS',
              founded: '2023',
            },
          }),
        },
      });
    }
    return cachedOrgsDxos;
  },

  get cyberdyne(): DatabaseDirectory {
    if (cachedOrgsCyberdyne === undefined) {
      cachedOrgsCyberdyne = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeObject({
            type: Type.getURI(TestSchema.Organization)!,
            data: {
              name: 'Cyberdyne Systems',
              founded: '1984',
            },
          }),
        },
      });
    }
    return cachedOrgsCyberdyne;
  },
};

export const WORKS_FOR = {
  get fredWorksForCyberdyne(): DatabaseDirectory {
    if (cachedWorksFredCyberdyne === undefined) {
      cachedWorksFredCyberdyne = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeRelation({
            type: Type.getURI(TestSchema.EmployedBy)!,
            source: { '/': EID.make({ entityId: Object.keys(PEOPLE.bob.objects!)[0] }) },
            target: { '/': EID.make({ entityId: Object.keys(ORGS.cyberdyne.objects!)[0] }) },
            data: {
              since: '2020',
              position: 'Engineer',
            },
          }),
        },
      });
    }
    return cachedWorksFredCyberdyne;
  },

  get aliceWorksForAperture(): DatabaseDirectory {
    if (cachedWorksAliceAperture === undefined) {
      cachedWorksAliceAperture = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeRelation({
            type: Type.getURI(TestSchema.EmployedBy)!,
            source: { '/': EID.make({ entityId: Object.keys(PEOPLE.alice.objects!)[0] }) },
            target: { '/': EID.make({ entityId: Object.keys(ORGS.dxos.objects!)[0] }) },
            data: {
              since: '2018',
              position: 'Research Scientist',
            },
          }),
        },
      });
    }
    return cachedWorksAliceAperture;
  },
};

export const TASKS = {
  get task1(): DatabaseDirectory {
    if (cachedTasksTask1 === undefined) {
      cachedTasksTask1 = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeObject({
            type: Type.getURI(TestSchema.Task)!,
            data: {
              title: 'Complete project documentation',
              description: 'Write comprehensive documentation for the new system',
              status: 'in-progress',
              dueDate: '2023-12-31',
              assignee: { '/': EID.make({ entityId: Object.keys(PEOPLE.bob.objects!)[0] }) },
            },
          }),
        },
      });
    }
    return cachedTasksTask1;
  },

  get task2(): DatabaseDirectory {
    if (cachedTasksTask2 === undefined) {
      cachedTasksTask2 = DatabaseDirectory.make({
        spaceKey: getSpaceKeyHex(),
        objects: {
          [EntityId.random()]: EntityStructure.makeObject({
            type: Type.getURI(TestSchema.Task)!,
            data: {
              title: 'Run experiments',
              description: 'Conduct series of experiments on the portal device',
              status: 'pending',
              dueDate: '2023-11-15',
              assignee: { '/': EID.make({ entityId: Object.keys(PEOPLE.alice.objects!)[0] }) },
            },
          }),
        },
      });
    }
    return cachedTasksTask2;
  },
};
