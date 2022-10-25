//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import times from 'lodash.times';

import { Database, Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ItemID } from '@dxos/protocols';

export const OBJECT_ORG = 'example:object/org';
export const OBJECT_PERSON = 'example:object/person';
export const OBJECT_PROJECT = 'example:object/project';
export const OBJECT_TASK = 'example:object/task';

export const LINK_EMPLOYEE = 'example:link/employee';
export const LINK_PROJECT = 'example:link/project';
export const LINK_ASSIGNED = 'example:link/assigned';

export const labels = ['low', 'high', 'extra', 'medium'];

// TODO(burdon): See @dxos/client-testing generators.

const generators = {
  [OBJECT_ORG]: () => ({
    name: faker.company.companyName(),
    description: faker.lorem.sentence(),
    // TODO(burdon): Converted to object.
    labels: faker.random.arrayElements(labels, faker.datatype.number({ min: 0, max: 3 }))
  }),

  [OBJECT_PERSON]: () => ({
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    description: faker.lorem.sentence()
  }),

  [OBJECT_PROJECT]: () => ({
    name: faker.commerce.productName(),
    description: faker.lorem.sentence()
  }),

  [OBJECT_TASK]: () => ({
    name: faker.git.commitMessage(),
    description: faker.lorem.sentence()
  })
};

const createProps = (type: keyof typeof generators) => {
  const generator = generators[type];
  return generator ? generator() : undefined;
};

interface GeneratorOptions {
  seed?: number;
}

interface GenerateConfig {
  numOrgs?: number;
  numPeople?: number;
  numProjects?: number;
  numTasks?: number;
}

/**
 * Data generator.
 */
export class Generator {
  constructor(private readonly _database: Database, private readonly _options?: GeneratorOptions | undefined) {
    const { seed } = this._options || {};
    if (seed) {
      // TODO(burdon): Side effects on other objects?
      faker.seed(seed);
    }
  }

  get database() {
    return this._database;
  }

  get labels() {
    return labels;
  }

  // TODO(burdon): Parameterize.
  async createItem(sourceId: ItemID) {
    const source = this._database.getItem(sourceId);
    if (source?.type === OBJECT_ORG) {
      const props = createProps(OBJECT_PERSON);
      const target = await this._database.createItem({
        model: ObjectModel,
        type: OBJECT_PERSON,
        props
      });
      await this._database.createLink({ type: LINK_EMPLOYEE, source, target });
    }
  }

  // TODO(burdon): Parameterize.
  async linkItem(sourceId: ItemID, targetId: ItemID) {
    const source = this._database.getItem(sourceId);
    const target = this._database.getItem(targetId);
    if (source?.type === OBJECT_ORG && target?.type === OBJECT_PERSON) {
      await this._database.createLink({ type: LINK_EMPLOYEE, source, target });
    }
  }

  async generate(config: GenerateConfig) {
    // Orgs.
    const organizations = await Promise.all(
      times(config.numOrgs || 0).map(() =>
        this._database.createItem({
          model: ObjectModel,
          type: OBJECT_ORG,
          props: createProps(OBJECT_ORG)
        })
      )
    );

    // People.
    await Promise.all(
      times(config.numPeople || 0).map(async () => {
        const person = await this._database.createItem({
          model: ObjectModel,
          type: OBJECT_PERSON,
          props: createProps(OBJECT_PERSON)
        });
        const count = faker.datatype.number({ min: 0, max: 2 });
        const orgs = faker.random.arrayElements(organizations, count);
        return orgs.map((org: Item<any>) =>
          this._database.createLink({
            type: LINK_EMPLOYEE,
            source: org,
            target: person
          })
        );
      })
    );

    // Projects.
    await Promise.all(
      times(config.numProjects || 0).map(async () => {
        const project = await this._database.createItem({
          model: ObjectModel,
          type: OBJECT_PROJECT,
          props: createProps(OBJECT_PROJECT)
        });
        const org = faker.random.arrayElement(organizations);
        await this._database.createLink({
          type: LINK_PROJECT,
          source: org,
          target: project
        });

        // Task child nodes.
        // TODO(burdon): Assign to people (query people from org).
        await Promise.all(
          times(faker.datatype.number({ min: 0, max: config.numTasks || 3 })).map(async () => {
            await this._database.createItem({
              model: ObjectModel,
              type: OBJECT_TASK,
              props: createProps(OBJECT_TASK),
              parent: project.id
            });
          })
        );
      })
    );
  }
}
