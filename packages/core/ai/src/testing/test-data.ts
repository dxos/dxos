//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Ref as RefImpl } from '@dxos/echo/internal';
import { type EchoDatabase } from '@dxos/echo-db';

import { Contact, Organization, Project, Task } from './test-schema';

// TODO(burdon): Remove and use standard test data.

export const seedTestData = (db: EchoDatabase) => {
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
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactJosiah),
    }),
  );
  const _taskComposer2 = db.add(
    Obj.make(Task, {
      name: 'Create form builder',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskComposer3 = db.add(
    Obj.make(Task, {
      name: 'Add support for custom themes',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactJosiah),
    }),
  );
  const _taskComposer5 = db.add(
    Obj.make(Task, {
      name: 'Implement community plugin',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactFred),
    }),
  );
  const _taskComposer4 = db.add(
    Obj.make(Task, {
      name: 'Implement dark mode',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskEcho1 = db.add(
    Obj.make(Task, {
      name: 'Implement cypher query engine',
      project: RefImpl.make(projectEcho),
      assignee: RefImpl.make(contactDima),
    }),
  );
  const _taskEcho2 = db.add(
    Obj.make(Task, {
      name: 'Add schema editor',
      project: RefImpl.make(projectEcho),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskDoodles1 = db.add(
    Obj.make(Task, {
      name: 'Add support for custom themes',
      project: RefImpl.make(projectDoodles),
      assignee: RefImpl.make(contactFred),
    }),
  );
  const _taskDoodles2 = db.add(
    Obj.make(Task, {
      name: 'Implement dark mode',
      project: RefImpl.make(projectDoodles),
      assignee: RefImpl.make(contactJosiah),
    }),
  );

  const _orgDxos = db.add(
    Obj.make(Organization, {
      name: 'DXOS',
      employees: [RefImpl.make(contactRich), RefImpl.make(contactJosiah), RefImpl.make(contactDima)],
      projects: [RefImpl.make(projectEcho)],
    }),
  );
  const _orgBraneframe = db.add(
    Obj.make(Organization, {
      name: 'Braneframe',
      employees: [RefImpl.make(contactJosiah), RefImpl.make(contactRich)],
      projects: [RefImpl.make(projectComposer)],
    }),
  );
};
