//
// Copyright 2022 DXOS.org
//

import {
  Article,
  Calendar,
  Compass,
  Gear,
  Graph,
  Kanban,
  ListChecks,
  Sword,
  Table,
  TreeStructure,
  Wall
} from 'phosphor-react';

export enum AppView {
  SETTINGS = 'settings',
  DASHBOARD = 'dashboard',
  META = 'data',
  KANBAN = 'kanban',
  TASKS = 'tasks',
  ORGS = 'org',
  CALENDAR = 'events',
  EDITOR = 'documents',
  GRAPH = 'graph',
  MAP = 'map',
  GAME = 'game'
}

// TODO(burdon): Types?
export const viewConfig: { [key: string]: { Icon: any } } = {
  [AppView.SETTINGS]: { Icon: Gear },
  [AppView.DASHBOARD]: { Icon: Wall },
  [AppView.META]: { Icon: Table },
  [AppView.KANBAN]: { Icon: Kanban },
  [AppView.TASKS]: { Icon: ListChecks },
  [AppView.ORGS]: { Icon: TreeStructure },
  [AppView.CALENDAR]: { Icon: Calendar },
  [AppView.EDITOR]: { Icon: Article },
  [AppView.GRAPH]: { Icon: Graph },
  [AppView.MAP]: { Icon: Compass },
  [AppView.GAME]: { Icon: Sword }
};
