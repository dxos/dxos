//
// Copyright 2022 DXOS.org
//

import { Article, ListChecks, Wall } from 'phosphor-react';
import React from 'react';

export const views: { key: string; Icon: React.FC<any> }[] = [
  { key: 'blocks', Icon: Wall },
  { key: 'tasks', Icon: ListChecks },
  { key: 'editor', Icon: Article }
];
