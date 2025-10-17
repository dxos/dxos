//
// Copyright 2024 DXOS.org
//

import { Ref as RefImpl, live } from '@dxos/echo/internal';
import type { EchoDatabase } from '@dxos/echo-db';

import { Contact, Organization, Project, Task } from './test-schema';

export const seedTestData = (db: EchoDatabase) => {
  const contactRich = db.add(
    live(Contact, {
      name: 'Rich',
    }),
  );
  const contactJosiah = db.add(
    live(Contact, {
      name: 'Josiah',
    }),
  );
  const contactDima = db.add(
    live(Contact, {
      name: 'Dima',
    }),
  );
  const contactFred = db.add(
    live(Contact, {
      name: 'Fred',
    }),
  );

  const projectComposer = db.add(
    live(Project, {
      name: 'Composer',
    }),
  );
  const projectEcho = db.add(
    live(Project, {
      name: 'ECHO',
    }),
  );
  const projectDoodles = db.add(
    live(Project, {
      name: 'Doodles',
    }),
  );

  const _taskComposer1 = db.add(
    live(Task, {
      name: 'Optimize startup performance',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactJosiah),
    }),
  );
  const _taskComposer2 = db.add(
    live(Task, {
      name: 'Create form builder',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskComposer3 = db.add(
    live(Task, {
      name: 'Add support for custom themes',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactJosiah),
    }),
  );
  const _taskComposer5 = db.add(
    live(Task, {
      name: 'Implement community plugin',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactFred),
    }),
  );
  const _taskComposer4 = db.add(
    live(Task, {
      name: 'Implement dark mode',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskEcho1 = db.add(
    live(Task, {
      name: 'Implement cypher query engine',
      project: RefImpl.make(projectEcho),
      assignee: RefImpl.make(contactDima),
    }),
  );
  const _taskEcho2 = db.add(
    live(Task, {
      name: 'Add schema editor',
      project: RefImpl.make(projectEcho),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskDoodles1 = db.add(
    live(Task, {
      name: 'Add support for custom themes',
      project: RefImpl.make(projectDoodles),
      assignee: RefImpl.make(contactFred),
    }),
  );
  const _taskDoodles2 = db.add(
    live(Task, {
      name: 'Implement dark mode',
      project: RefImpl.make(projectDoodles),
      assignee: RefImpl.make(contactJosiah),
    }),
  );

  const _orgDxos = db.add(
    live(Organization, {
      name: 'DXOS',
      employees: [RefImpl.make(contactRich), RefImpl.make(contactJosiah), RefImpl.make(contactDima)],
      projects: [RefImpl.make(projectEcho)],
    }),
  );
  const _orgBraneframe = db.add(
    live(Organization, {
      name: 'Braneframe',
      employees: [RefImpl.make(contactJosiah), RefImpl.make(contactRich)],
      projects: [RefImpl.make(projectComposer)],
    }),
  );
};
