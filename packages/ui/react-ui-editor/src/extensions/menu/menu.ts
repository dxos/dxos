//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Label } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

export type MenuGroup = {
  id: string;
  label?: Label;
  items: MenuItem[];
};

export type MenuItem = {
  id: string;
  label: Label;
  icon?: string;
  onSelect?: (view: EditorView, head: number) => MaybePromise<void>;
};
