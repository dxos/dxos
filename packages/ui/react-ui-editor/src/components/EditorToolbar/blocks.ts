//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { addBlockquote, addCodeblock, insertTable, removeBlockquote, removeCodeblock } from '@dxos/ui-editor';

import { translationKey } from '../../translations';

import { type EditorToolbarState } from './useEditorToolbar';

const blockTypes = {
  blockquote: 'ph--quotes--regular',
  codeblock: 'ph--code-block--regular',
  table: 'ph--table--regular',
};

/** Add block actions to the builder. */
export const addBlocks =
  (state: EditorToolbarState, getView: () => EditorView): ActionGroupBuilderFn =>
  (builder) => {
    const value = state?.blockQuote ? 'blockquote' : (state.blockType ?? '');
    builder.group(
      'block',
      {
        label: ['block.label', { ns: translationKey }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [type, icon] of Object.entries(blockTypes)) {
          const checked = type === value;
          group.action(
            type,
            {
              label: [`block.${type}.label`, { ns: translationKey }],
              checked,
              ...(type === 'table' && { disabled: !!state.blankLine }),
              icon,
            },
            () => {
              const view = getView();
              if (!view) {
                return;
              }

              switch (type) {
                case 'blockquote':
                  checked ? removeBlockquote(view) : addBlockquote(view);
                  break;
                case 'codeblock':
                  checked ? removeCodeblock(view) : addCodeblock(view);
                  break;
                case 'table':
                  insertTable(view);
                  break;
              }
            },
          );
        }
      },
    );
  };
