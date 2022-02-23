//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { useMemo } from 'react';

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

export enum TestType {
  Org = 'example:type.org',
  Project = 'example:type.project',
  Person = 'example:type.person',
  Task = 'example:type.task'
}

// TODO(burdon): Util.
export function enumFromString<T> (enm: { [s: string]: T}, value: string): T | undefined {
  return (Object.values(enm) as unknown as string[]).includes(value) ? value as unknown as T : undefined;
}

type Num = [min: number, max: number] | number

const num = (n: Num) => typeof n === 'number' ? n : faker.datatype.number({ min: n[0], max: n[1] });

const capitalize = (text: string) => text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/*
// TODO(burdon): Experimental -- define graph shape.
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

export class ProjectBuilder {
  constructor (
    private readonly _builder: PartyBuilder,
    private readonly _org: Item<ObjectModel>,
    private readonly _project: Item<ObjectModel>
  ) {}

  get project () {
    return this._project;
  }

  async createTasks (n: Num = 1, people?: Item<ObjectModel>[]) {
    return await Promise.all(Array.from({ length: num(n) }).map(async () => {
      const task = await this._builder.createTask(this._project);
      if (people) {
        await this._builder.createLink(task, faker.random.arrayElement(people));
      }
    }));
  }
}

export class OrgBuilder {
  constructor (
    private readonly _builder: PartyBuilder,
    private readonly _org: Item<ObjectModel>
  ) {}

  get org () {
    return this._org;
  }

  async createPeople (n: Num = 1) {
    return await Promise.all(Array.from({ length: num(n) }).map(async () => {
      return await this._builder.createPerson(this._org);
    }));
  }

  async createProjects (n: Num = 1, callback?: (buidler: ProjectBuilder) => Promise<void>) {
    return await Promise.all(Array.from({ length: num(n) }).map(async () => {
      const project = await this._builder.createProject(this._org);
      await callback?.(new ProjectBuilder(this._builder, this._org, project));
      return project;
    }));
  }
}

/**
 * Party builder.
 */
// TODO(burdon): Configure generator to treat all references as links (e.g., for table).
export class PartyBuilder {
  constructor (
    private readonly _party: Party
  ) {}

  get party () {
    return this._party;
  }

  async createOrgs (n: Num = 1, callback?: (buidler: OrgBuilder) => Promise<void>) {
    return await Promise.all(Array.from({ length: num(n) }).map(async () => {
      const org = await this.createOrg();
      await callback?.(new OrgBuilder(this, org));
      return org;
    }));
  }

  async createLink (source: Item<ObjectModel>, target: Item<ObjectModel>) {
    await this._party.database.createLink({ source, target });
  }

  async createOrg () {
    return this._party.database.createItem({
      model: ObjectModel,
      type: TestType.Org,
      props: {
        title: faker.company.companyName(),
        description: faker.internet.url()
      }
    });
  }

  async createPerson (org: Item<ObjectModel>) {
    return this._party.database.createItem({
      model: ObjectModel,
      type: TestType.Person,
      parent: org.id,
      props: {
        title: faker.name.findName(),
        description: faker.name.jobDescriptor()
      }
    });
  }

  async createProject (org: Item<ObjectModel>) {
    return this._party.database.createItem({
      model: ObjectModel,
      type: TestType.Project,
      parent: org.id,
      props: {
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription() + '.'
      }
    });
  }

  async createTask (project: Item<ObjectModel>) {
    return this._party.database.createItem({
      model: ObjectModel,
      type: TestType.Task,
      parent: project.id,
      props: {
        title: capitalize(faker.git.commitMessage()) + '.',
        description: faker.hacker.phrase()
      }
    });
  }

  async createRandomItem (parent?: Item<ObjectModel>) {
    if (!parent) {
      const { result: items } = this.party
        .select()
        .filter(item => item.type === TestType.Org || item.type === TestType.Project)
        .query();
      const parent = faker.random.arrayElement(items);
      if (parent) {
        await this.createRandomItem(parent);
      }
    } else {
      switch (parent.type) {
        case TestType.Org: {
          const type = faker.random.arrayElement([TestType.Project, TestType.Person]);
          switch (type) {
            case TestType.Project: {
              await this.createProject(parent);
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
    }
  }
}

/**
 * @param party
 */
export const usePartyBuilder = (party?: Party) => {
  return useMemo(() => party ? new PartyBuilder(party) : undefined, [party?.key]);
};
