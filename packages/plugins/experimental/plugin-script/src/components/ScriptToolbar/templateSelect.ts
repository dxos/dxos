//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { FUNCTIONS_PRESET_META_KEY, type ScriptType } from '@dxos/functions';
import { getMeta } from '@dxos/live-object';
import { createMenuItemGroup, createMenuAction } from '@dxos/react-ui-menu';

import { SCRIPT_PLUGIN } from '../../meta';
import { templates } from '../../templates';

export type TemplateActionProperties = { type: 'template'; value: string };

const createTemplateSelectGroup = () => {
  return createMenuItemGroup('template-select', {
    label: ['template select group label', { ns: SCRIPT_PLUGIN }],
    variant: 'dropdownMenu',
  });
};

const createTemplateSelectActions = () => {
  return templates.map((template) => {
    return createMenuAction<TemplateActionProperties>(`template--${template.id}`, {
      label: template.name,
      value: template.id,
      type: 'template',
    });
  });
};

export const createTemplateSelect = () => {
  const templateSelectGroup = createTemplateSelectGroup();
  const templateSelectActions = createTemplateSelectActions();
  return {
    nodes: [templateSelectGroup, ...templateSelectActions],
    edges: [
      { source: 'root', target: 'template-select' },
      ...templateSelectActions.map((action) => ({ source: 'template-select', target: action.id })),
    ],
  };
};

export const useTemplateSelectHandler = ({ script }: { script: ScriptType }) => {
  return useCallback(
    (templateId: string) => {
      const template = templates.find((template) => template.id === templateId);
      if (template) {
        script.name = template.name;
        script.source!.target!.content = template.source;
        const metaKeys = getMeta(script).keys;
        const oldPresetIndex = metaKeys.findIndex((key) => key.source === FUNCTIONS_PRESET_META_KEY);
        if (oldPresetIndex >= 0) {
          metaKeys.splice(oldPresetIndex, 1);
        }
        if (template.presetId) {
          metaKeys.push({ source: FUNCTIONS_PRESET_META_KEY, id: template.presetId });
        }
      }
    },
    [script],
  );
};
