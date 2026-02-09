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
        Obj.change(script, (s) => {
          s.name = template.name;
          const meta = Obj.getMeta(s);
          const oldPresetIndex = meta.keys.findIndex((key) => key.source === FUNCTIONS_PRESET_META_KEY);
          if (oldPresetIndex >= 0) {
            meta.keys.splice(oldPresetIndex, 1);
          }
          if ('presetId' in template) {
            meta.keys.push({ source: FUNCTIONS_PRESET_META_KEY, id: template.presetId });
          }
        });
        if (script.source?.target) {
          Obj.change(script.source.target, (s) => {
            s.content = template.source;
          });
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
