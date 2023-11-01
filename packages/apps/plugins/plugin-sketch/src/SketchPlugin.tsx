//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Sketch as SketchType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';

import { SketchMain, SketchSection, SketchSlide } from './components';
import translations from './translations';
import { SKETCH_PLUGIN, SketchAction, type SketchPluginProvides, isSketch } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SketchType.name] = SketchType;

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  return {
    meta: {
      id: SKETCH_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          [SketchType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: (props: IconProps) => <CompassTool {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${SKETCH_PLUGIN}/create`,
            label: ['create object label', { ns: SKETCH_PLUGIN }],
            icon: (props) => <CompassTool {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: SKETCH_PLUGIN,
                  action: SketchAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_TO_FOLDER,
                  data: { folder: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'sketchPlugin.createObject',
            },
          });
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-sketch',
            testId: 'sketchPlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: {
              plugin: SKETCH_PLUGIN,
              action: SketchAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isSketch(data.active) ? <SketchMain sketch={data.active} /> : null;
            case 'section':
              return isSketch(data.object) ? <SketchSection sketch={data.object} /> : null;
            case 'slide':
              return isSketch(data.slide) ? <SketchSlide sketch={data.slide} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SketchAction.CREATE: {
              return { object: new SketchType() };
            }
          }
        },
      },
    },
  };
};
