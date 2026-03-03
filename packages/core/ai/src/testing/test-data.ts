//
// Copyright 2024 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { Contact, Organization, Project, Task } from './test-schema';

// TODO(burdon): Remove and use standard test data.

export const seedTestData = (db: Database.Database) => {
  const contactRich = db.add(
    Obj.make(Contact, {
      name: 'Rich',
    }),
  );
  const contactJosiah = db.add(
    Obj.make(Contact, {
      name: 'Josiah',
    }),
  );
  const contactDima = db.add(
    Obj.make(Contact, {
      name: 'Dima',
    }),
  );
  const contactFred = db.add(
    Obj.make(Contact, {
      name: 'Fred',
    }),
  );

  const projectComposer = db.add(
    Obj.make(Project, {
      name: 'Composer',
    }),
  );
  const projectEcho = db.add(
    Obj.make(Project, {
      name: 'ECHO',
    }),
  );
  const projectDoodles = db.add(
    Obj.make(Project, {
      name: 'Doodles',
    }),
  );

  const _taskComposer1 = db.add(
    Obj.make(Task, {
      name: 'Optimize startup performance',
      project: Ref.make(projectComposer),
      assignee: Ref.make(contactJosiah),
    }),
  );
  const _taskComposer2 = db.add(
    Obj.make(Task, {
      name: 'Create form builder',
      project: Ref.make(projectComposer),
      assignee: Ref.make(contactRich),
    }),
  );
  const _taskComposer3 = db.add(
    Obj.make(Task, {
      name: 'Add support for custom themes',
      project: Ref.make(projectComposer),
      assignee: Ref.make(contactJosiah),
    }),
  );
  const _taskComposer5 = db.add(
    Obj.make(Task, {
      name: 'Implement community plugin',
      project: Ref.make(projectComposer),
      assignee: Ref.make(contactFred),
    }),
  );
  const _taskComposer4 = db.add(
    Obj.make(Task, {
      name: 'Implement dark mode',
      project: Ref.make(projectComposer),
      assignee: Ref.make(contactRich),
    }),
  );
  const _taskEcho1 = db.add(
    Obj.make(Task, {
      name: 'Implement cypher query engine',
      project: Ref.make(projectEcho),
      assignee: Ref.make(contactDima),
    }),
  );
  const _taskEcho2 = db.add(
    Obj.make(Task, {
      name: 'Add schema editor',
      project: Ref.make(projectEcho),
      assignee: Ref.make(contactRich),
    }),
  );
  const _taskDoodles1 = db.add(
    Obj.make(Task, {
      name: 'Add support for custom themes',
      project: Ref.make(projectDoodles),
      assignee: Ref.make(contactFred),
    }),
  );
  const _taskDoodles2 = db.add(
    Obj.make(Task, {
      name: 'Implement dark mode',
      project: Ref.make(projectDoodles),
      assignee: Ref.make(contactJosiah),
    }),
  );

  const _orgDxos = db.add(
    Obj.make(Organization, {
      name: 'DXOS',
      employees: [Ref.make(contactRich), Ref.make(contactJosiah), Ref.make(contactDima)],
      projects: [Ref.make(projectEcho)],
    }),
  );
  const _orgBraneframe = db.add(
    Obj.make(Organization, {
      name: 'Braneframe',
      employees: [Ref.make(contactJosiah), Ref.make(contactRich)],
      projects: [Ref.make(projectComposer)],
    }),
  );
};
