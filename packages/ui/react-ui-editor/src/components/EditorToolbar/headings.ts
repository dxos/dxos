//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { setHeading } from '@dxos/ui-editor';

import { translationKey } from '../../translations';
import { type EditorToolbarState } from './useEditorToolbar';

const headingIcons: Record<string, string> = {
  0: 'ph--paragraph--regular',
  1: 'ph--text-h-one--regular',
  2: 'ph--text-h-two--regular',
  3: 'ph--text-h-three--regular',
  4: 'ph--text-h-four--regular',
  5: 'ph--text-h-five--regular',
  6: 'ph--text-h-six--regular',
};

const computeHeadingValue = (state: EditorToolbarState) => {
  const blockType = state ? state.blockType : 'paragraph';
  const heading = blockType && /heading(\d)/.exec(blockType);
  return heading ? heading[1] : blockType === 'paragraph' || !blockType ? '0' : '';
};

/** Add heading actions to the builder. */
export const addHeadings =
  (state: EditorToolbarState, getView: () => EditorView): ActionGroupBuilderFn =>
  (builder) => {
    const headingValue = computeHeadingValue(state);
    builder.group(
      'heading',
      {
        label: ['heading.label', { ns: translationKey }],
        icon: 'ph--text-h--regular',
        iconOnly: true,
        variant: 'dropdownMenu',
        applyActive: true,
        selectCardinality: 'single',
        // TODO(wittjosiah): Remove? Not sure this does anything.
        value: headingValue,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [levelStr, icon] of Object.entries(headingIcons)) {
          const level = parseInt(levelStr);
          group.action(
            `heading--${levelStr}`,
            {
              label: ['heading-level.label', { count: level, ns: translationKey }],
              icon,
              checked: levelStr === headingValue,
            },
            () => setHeading(level)(getView()),
          );
        }
      },
    );
  };
