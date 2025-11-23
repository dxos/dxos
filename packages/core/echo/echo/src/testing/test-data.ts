//
// Copyright 2025 DXOS.org
//

import { DatabaseDirectory, ObjectStructure } from '@dxos/echo-protocol';
import { DXN, ObjectId, PublicKey } from '@dxos/keys';

import { Type } from '../index';

import { TestSchema } from './test-schema';

const spaceKey = PublicKey.random();

// TODO(burdon): Use Obj.make.

export const PEOPLE = {
  alice: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: Type.getDXN(TestSchema.Person)!.toString(),
        data: {
          name: 'Alice',
        },
      }),
    },
  }),
  bob: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: Type.getDXN(TestSchema.Person)!.toString(),
        data: {
          name: 'Bob',
        },
      }),
    },
  }),
};

export const ORGS = {
  dxos: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: Type.getDXN(TestSchema.Organization)!.toString(),
        data: {
          name: 'DXOS',
          founded: '2023',
        },
      }),
    },
  }),
  cyberdyne: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: Type.getDXN(TestSchema.Organization)!.toString(),
        data: {
          name: 'Cyberdyne Systems',
          founded: '1984',
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
        type: Type.getDXN(TestSchema.EmployedBy)!.toString(),
        source: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.bob.objects!)[0]).toString() },
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
        type: Type.getDXN(TestSchema.EmployedBy)!.toString(),
        source: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.alice.objects!)[0]).toString() },
        target: { '/': DXN.fromLocalObjectId(Object.keys(ORGS.dxos.objects!)[0]).toString() },
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
        type: Type.getDXN(TestSchema.Task)!.toString(),
        data: {
          title: 'Complete project documentation',
          description: 'Write comprehensive documentation for the new system',
          status: 'in-progress',
          dueDate: '2023-12-31',
          assignee: { '/': DXN.fromLocalObjectId(Object.keys(PEOPLE.bob.objects!)[0]).toString() },
        },
      }),
    },
  }),
  task2: DatabaseDirectory.make({
    spaceKey: spaceKey.toHex(),
    objects: {
      [ObjectId.random()]: ObjectStructure.makeObject({
        type: Type.getDXN(TestSchema.Task)!.toString(),
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
