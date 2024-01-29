//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { showTooltip, type TooltipView, type EditorView } from '@codemirror/view';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { getFormatting } from './formatting';
import { Toolbar } from '../../components/Toolbar/Toolbar';
import { useActionHandler } from '../../hooks';

export const toolbar = (): Extension =>
  showTooltip.compute(['selection'], (state) => {
    const { main } = state.selection;
    if (main.empty) {
      return null;
    }
    return {
      pos: main.from,
      end: main.to,
      create: createToolbarTooltip,
      above: true,
    };
  });

const createToolbarTooltip = (view: EditorView): TooltipView => {
  const wrapper = document.createElement('div');
  // TODO: Use a portal
  const root = createRoot(wrapper);
  const render = () => {
    root.render(
      <Toolbar.Root onAction={useActionHandler(view)} state={getFormatting(view.state)}>
        <Toolbar.Markdown />
        <Toolbar.Separator />
        <Toolbar.Extended />
      </Toolbar.Root>,
    );
  };
  render();
  return {
    dom: wrapper,
    update: (update) => {
      if (update.docChanged || update.selectionSet) {
        render();
      }
    },
    destroy: () => root.unmount(),
  };
};
