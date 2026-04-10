//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { type Formatting, Inline, addLink, removeLink, setStyle } from '@dxos/ui-editor';

import { translationKey } from '../../translations';
import { type EditorToolbarState } from './useEditorToolbar';

const formats = {
  strong: 'ph--text-b--regular',
  emphasis: 'ph--text-italic--regular',
  strikethrough: 'ph--text-strikethrough--regular',
  code: 'ph--code--regular',
  link: 'ph--link--regular',
};

/** Add formatting actions to the builder. */
export const addFormatting =
  (state: EditorToolbarState, getView: () => EditorView): ActionGroupBuilderFn =>
  (builder) => {
    const formatting: Formatting = state;
    builder.group(
      'formatting',
      {
        label: ['formatting.label', { ns: translationKey }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'multiple',
        value: Object.keys(formats).filter((key) => !!formatting[key as keyof Formatting]),
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [type, icon] of Object.entries(formats)) {
          const checked = !!formatting[type as keyof Formatting];
          group.action(type, { label: [`formatting.${type}.label`, { ns: translationKey }], checked, icon }, () => {
            const view = getView();
            if (!view) {
              return;
            }

            if (type === 'link') {
              checked ? removeLink(view) : addLink()(view);
              return;
            }

            setStyle(
              type === 'strong'
                ? Inline.Strong
                : type === 'emphasis'
                  ? Inline.Emphasis
                  : type === 'strikethrough'
                    ? Inline.Strikethrough
                    : Inline.Code,
              !checked,
            )(view);
          });
        }
      },
    );
  };
