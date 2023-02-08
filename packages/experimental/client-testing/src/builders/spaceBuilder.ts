//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { Item, DocumentModel, Space } from '@dxos/client';

import { NumberRange, capitalize, getNumber } from '../util';

export enum TestType {
  Org = 'example:type/org',
  Project = 'example:type/project',
  Person = 'example:type/person',
  Task = 'example:type/task'
}

/*
// TODO(burdon): Experimental -- define graph shape via schemas.
const schemas = {
  types: [
    {
      type: TestType.Org,
      children: {
        type: TestType.Project
      }
    },
    {
      type: TestType.Project,
      children: {
        type: TestType.Task
      }
    },
    {
      type: TestType.Task
    }
  ]
};
*/

/**
 * Project
 */
export class ProjectBuilder {
  constructor(
    private readonly _builder: SpaceBuilder,
    private readonly _org: Item<DocumentModel>,
    private readonly _project: Item<DocumentModel>
  ) {}

  get project() {
    return this._project;
  }

  async createTasks(n: NumberRange = 1, people?: Item<DocumentModel>[]) {
    return await Promise.all(
      Array.from({ length: getNumber(n) }).map(async () => {
        await this._builder.createTask(this._project);
      })
    );
  }
}

/**
 * Org
 */
export class OrgBuilder {
  constructor(private readonly _builder: SpaceBuilder, private readonly _org: Item<DocumentModel>) {}

  get org() {
    return this._org;
  }

  async createPeople(n: NumberRange = 1) {
    return await Promise.all(
      Array.from({ length: getNumber(n) }).map(async () => {
        return await this._builder.createPerson(this._org);
      })
    );
  }

  async createProjects(n: NumberRange = 1, callback?: (buidler: ProjectBuilder) => Promise<void>) {
    return await Promise.all(
      Array.from({ length: getNumber(n) }).map(async () => {
        const project = await this._builder.createProject(this._org);
        await callback?.(new ProjectBuilder(this._builder, this._org, project));
        return project;
      })
    );
  }
}

/**
 * Space builder.
 */
// TODO(burdon): Rename generator.
// TODO(burdon): Configure generator to treat all references as links (e.g., for table).
export class SpaceBuilder {
  constructor(private readonly _space: Space) {}

  get space() {
    return this._space;
  }

  async createOrgs(n: NumberRange = 1, callback?: (buidler: OrgBuilder) => Promise<void>) {
    return await Promise.all(
      Array.from({ length: getNumber(n) }).map(async () => {
        const org = await this.createOrg();
        await callback?.(new OrgBuilder(this, org));
        return org;
      })
    );
  }

  async createOrg() {
    return this._space.database.createItem({
      model: DocumentModel,
      type: TestType.Org,
      props: {
        name: faker.company.companyName(),
        description: faker.internet.url()
      }
    });
  }

  async createPerson(org: Item<DocumentModel>) {
    return this._space.database.createItem({
      model: DocumentModel,
      type: TestType.Person,
      parent: org.id,
      props: {
        name: faker.name.findName(),
        description: faker.name.jobDescriptor()
      }
    });
  }

  async createProject(org: Item<DocumentModel>) {
    return this._space.database.createItem({
      model: DocumentModel,
      type: TestType.Project,
      parent: org.id,
      props: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription() + '.'
      }
    });
  }

  async createTask(project: Item<DocumentModel>) {
    return this._space.database.createItem({
      model: DocumentModel,
      type: TestType.Task,
      parent: project.id,
      props: {
        name: capitalize(faker.git.commitMessage()) + '.',
        description: faker.hacker.phrase()
      }
    });
  }

  // TODO(burdon): ???
  async createSpace() {}

  async createRandomItem(parent?: Item<DocumentModel>) {
    if (parent) {
      switch (parent.type) {
        case TestType.Org: {
          const type = faker.random.arrayElement([TestType.Project, TestType.Person]);
          switch (type) {
            case TestType.Project: {
              const project = await this.createProject(parent);
              const projectBuilder = new ProjectBuilder(this, parent, project);
              await projectBuilder.createTasks([2, 5]);
              break;
            }

            case TestType.Person: {
              await this.createPerson(parent);
              break;
            }
          }
          break;
        }

        case TestType.Project: {
          await this.createTask(parent);
          break;
        }
      }

      return;
    }

    if (Math.random() < 0.4) {
      // New org.
      const org = await this.createOrg();
      const orgBuilder = new OrgBuilder(this, org);
      await orgBuilder.createProjects([2, 3]);
      await orgBuilder.createPeople([2, 4]);
    } else {
      // Random parent.
      const result = this.space
        .select()
        .filter((item) => item.type === TestType.Org || item.type === TestType.Project)
        .exec();

      parent = faker.random.arrayElement(result.entities);
      if (parent) {
        await this.createRandomItem(parent);
      }
    }
  }
}

export type Options = {
  numOrgs?: NumberRange;
  numProjects?: NumberRange;
  numPeople?: NumberRange;
  numTasks?: NumberRange;
};

export const defaultTestOptions: Options = {
  numOrgs: [3, 7],
  numProjects: [2, 7],
  numPeople: [3, 10],
  numTasks: [2, 5]
};

/**
 * Create populated test space.
 * @param builder
 * @param options
 */
export const buildTestSpace = async (builder: SpaceBuilder, options: Options = defaultTestOptions) => {
  await builder.createOrgs(options.numOrgs, async (orgBuilder: OrgBuilder) => {
    await orgBuilder.createPeople(options.numPeople);
    await orgBuilder.createProjects(options.numProjects, async (projectBuilder: ProjectBuilder) => {
      const result = await orgBuilder.org.select().children().filter({ type: TestType.Person }).exec();

      await projectBuilder.createTasks(options.numTasks, result.entities);
    });
  });
};
