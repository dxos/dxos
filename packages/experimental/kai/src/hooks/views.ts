//
// Copyright 2022 DXOS.org
//

import { Article, Graph, Kanban, ListChecks, Sword, Table, TreeStructure, Users, Wall } from 'phosphor-react';

export enum AppView {
  DASHBOARD = 'dashboard',
  PROJECTS = 'projects',
  CONTACTS = 'contacts',
  ORGS = 'org',
  KANBAN = 'kanban',
  TASKS = 'tasks',
  EDITOR = 'documents',
  GRAPH = 'graph',
  GAME = 'game'
}

// TODO(burdon): Types?
export const viewConfig: { [key: string]: { Icon: any } } = {
  [AppView.DASHBOARD]: { Icon: Wall },
  [AppView.PROJECTS]: { Icon: Table },
  [AppView.CONTACTS]: { Icon: Users },
  [AppView.ORGS]: { Icon: TreeStructure },
  [AppView.KANBAN]: { Icon: Kanban },
  [AppView.TASKS]: { Icon: ListChecks },
  [AppView.EDITOR]: { Icon: Article },
  [AppView.GRAPH]: { Icon: Graph },
  [AppView.GAME]: { Icon: Sword }
};
