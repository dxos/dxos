//
// Copyright 2025 DXOS.org
//

import { FUNCTIONS_PRESET_META_KEY, type ScriptType } from '@dxos/functions';
import { getMeta } from '@dxos/live-object';
import { createMenuItemGroup, createMenuAction } from '@dxos/react-ui-menu';

import { SCRIPT_PLUGIN } from '../meta';
import { templates } from '../templates';

export type TemplateActionProperties = { type: 'template'; value: string };

const createTemplateSelectGroup = () => {
  return createMenuItemGroup('template-select', {
    label: ['template select group label', { ns: SCRIPT_PLUGIN }],
    variant: 'dropdownMenu',
  });
};

const createTemplateSelectActions = (script: ScriptType) => {
  return templates.map((template) => {
    return createMenuAction<TemplateActionProperties>(
      `template--${template.id}`,
      () => {
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
      },
      {
        label: template.name,
        value: template.id,
        type: 'template',
      },
    );
  });
};

export const createTemplateSelect = (script: ScriptType) => {
  const templateSelectGroup = createTemplateSelectGroup();
  const templateSelectActions = createTemplateSelectActions(script);
  return {
    nodes: [templateSelectGroup, ...templateSelectActions],
    edges: [
      { source: 'root', target: 'template-select' },
      ...templateSelectActions.map((action) => ({ source: 'template-select', target: action.id })),
    ],
  };
};
