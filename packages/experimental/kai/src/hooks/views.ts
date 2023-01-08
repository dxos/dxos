//
// Copyright 2022 DXOS.org
//

import { Article, Graph, Kanban, ListChecks, Table, TreeStructure, Users, Wall } from 'phosphor-react';

export enum AppView {
  DASHBOARD = 'dashboard',
  PROJECTS = 'projects',
  CONTACTS = 'contacts',
  ORG = 'org',
  KANBAN = 'kanban',
  TASKS = 'tasks',
  EDITOR = 'editor',
  GRAPH = 'graph'
}

// TODO(burdon): Types?
export const viewConfig: { [key: string]: { Icon: any } } = {
  [AppView.DASHBOARD]: { Icon: Wall },
  [AppView.PROJECTS]: { Icon: Table },
  [AppView.CONTACTS]: { Icon: Users },
  [AppView.ORG]: { Icon: TreeStructure },
  [AppView.KANBAN]: { Icon: Kanban },
  [AppView.TASKS]: { Icon: ListChecks },
  [AppView.EDITOR]: { Icon: Article },
  [AppView.GRAPH]: { Icon: Graph }
};
