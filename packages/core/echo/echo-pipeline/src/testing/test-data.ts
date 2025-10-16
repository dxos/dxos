//
// Copyright 2025 DXOS.org
//

import { getSchemaDXN } from '@dxos/echo/internal';
import { DatabaseDirectory, ObjectStructure } from '@dxos/echo-protocol';
import { DXN, ObjectId, PublicKey } from '@dxos/keys';

import * as TestSchema from './test-schema';

const spaceKey = PublicKey.random();

export const PEOPLE = {
  fred: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: getSchemaDXN(TestSchema.Person)!.toString(),
        data: {
          name: 'Fred',
        },
      }),
    },
  }),
  alice: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: getSchemaDXN(TestSchema.Person)!.toString(),
        data: {
          name: 'Alice',
        },
      }),
    },
  }),
};

export const ORGS = {
  cyberdyne: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: getSchemaDXN(TestSchema.Organization)!.toString(),
        data: {
          name: 'Cyberdyne Systems',
          founded: '1984',
        },
      }),
    },
  }),
  aperture: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: getSchemaDXN(TestSchema.Organization)!.toString(),
        data: {
          name: 'Aperture Science',
          founded: '1953',
        },
      }),
    },
  }),
};

export const WORKS_FOR = {
  fredWorksForCyberdyne: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeRelation({
        type: getSchemaDXN(TestSchema.WorksFor)!.toString(),
        source: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.fred.objects!)[0]).toString() },
        target: { '/': DXN.fromLocalObjectId(Object.keys(ORGS.cyberdyne.objects!)[0]).toString() },
        data: {
          since: '2020',
          position: 'Engineer',
        },
      }),
    },
  }),
  aliceWorksForAperture: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeRelation({
        type: getSchemaDXN(TestSchema.WorksFor)!.toString(),
        source: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.alice.objects!)[0]).toString() },
        target: { '/': DXN.fromLocalObjectId(Object.keys(ORGS.aperture.objects!)[0]).toString() },
        data: {
          since: '2018',
          position: 'Research Scientist',
        },
      }),
    },
  }),
};

export const TASKS = {
  task1: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: getSchemaDXN(TestSchema.Task)!.toString(),
        data: {
          title: 'Complete project documentation',
          description: 'Write comprehensive documentation for the new system',
          status: 'in-progress',
          dueDate: '2023-12-31',
          assignee: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.fred.objects!)[0]).toString() },
        },
      }),
    },
  }),
  task2: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: getSchemaDXN(TestSchema.Task)!.toString(),
        data: {
          title: 'Run experiments',
          description: 'Conduct series of experiments on the portal device',
          status: 'pending',
          dueDate: '2023-11-15',
          assignee: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.alice.objects!)[0]).toString() },
        },
      }),
    },
  }),
};
