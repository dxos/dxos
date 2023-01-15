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

// TODO(burdon): Rename views.
import {
  CalendarView,
  ChessView,
  Dashboard,
  MetaTable,
  MapView,
  OrganizationHierarchy,
  ProjectEditor,
  ProjectGraph,
  ProjectKanban,
  TaskList
} from '../containers';
import { ManageSpacePage } from '../pages';

// TODO(burdon): Co-locate with routes.

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

export const viewConfig: { [key: string]: { Icon: any; Component: any } } = {
  [AppView.SETTINGS]: { Icon: Gear, Component: ManageSpacePage },
  [AppView.DASHBOARD]: { Icon: Wall, Component: Dashboard },
  [AppView.META]: { Icon: Table, Component: MetaTable },
  [AppView.KANBAN]: { Icon: Kanban, Component: ProjectKanban },
  [AppView.TASKS]: { Icon: ListChecks, Component: TaskList },
  [AppView.ORGS]: { Icon: TreeStructure, Component: OrganizationHierarchy },
  [AppView.CALENDAR]: { Icon: Calendar, Component: CalendarView },
  [AppView.EDITOR]: { Icon: Article, Component: ProjectEditor },
  [AppView.GRAPH]: { Icon: Graph, Component: ProjectGraph },
  [AppView.MAP]: { Icon: Compass, Component: MapView },
  [AppView.GAME]: { Icon: Sword, Component: ChessView }
};
