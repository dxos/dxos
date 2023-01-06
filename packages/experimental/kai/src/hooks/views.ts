//
// Copyright 2022 DXOS.org
//

import { Article, Flask, Kanban, ListChecks, Wall } from 'phosphor-react';

export enum AppView {
  CARDS = 'cards',
  PROJECTS = 'projects',
  TASKS = 'tasks',
  EDITOR = 'editor',
  TEST = 'test'
}

// TODO(burdon): Types?
export const viewConfig: { [key: string]: { Icon: any } } = {
  [AppView.CARDS]: { Icon: Wall },
  [AppView.PROJECTS]: { Icon: Kanban },
  [AppView.TASKS]: { Icon: ListChecks },
  [AppView.EDITOR]: { Icon: Article },
  [AppView.TEST]: { Icon: Flask }
};
