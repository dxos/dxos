//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { FUNCTIONS_PRESET_META_KEY, type Script } from '@dxos/functions';
import { createMenuAction } from '@dxos/react-ui-menu';

import { templates } from '../templates';

export type TemplateActionProperties = { type: 'template'; value: string };

const createTemplateSelectActions = (script: Script.Script) => {
  return templates.map((template) => {
    return createMenuAction<TemplateActionProperties>(
      `template--${template.id}`,
      () => {
        script.name = template.name;
        script.source!.target!.content = template.source;
        const metaKeys = Obj.getMeta(script).keys;
        const oldPresetIndex = metaKeys.findIndex((key) => key.source === FUNCTIONS_PRESET_META_KEY);
        if (oldPresetIndex >= 0) {
          metaKeys.splice(oldPresetIndex, 1);
        }
        if ('presetId' in template) {
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

export const createTemplateSelect = (script: Script.Script) => {
  const templateSelectActions = createTemplateSelectActions(script);
  return {
    nodes: [...templateSelectActions],
    edges: [
      { source: 'root', target: 'template-select' },
      ...templateSelectActions.map((action) => ({ source: 'template-select', target: action.id })),
    ],
  };
};
