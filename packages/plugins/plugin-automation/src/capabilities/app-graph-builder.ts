//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, LayoutOperation, createTypeSectionExtension } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation, Script } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SETTINGS_SECTION_TYPE, SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Automation } from '#types';

import { getAutomationsPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Dedicated "Automations" sidebar section listing the space's Automation objects (typeSection idiom).
      createTypeSectionExtension(Automation.Automation),
      GraphBuilder.createExtension({
        id: 'automationsSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === Type.getTypename(Automation.Automation) && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-automation',
              data: () =>
                Effect.gen(function* () {
                  const object = Automation.make({ triggers: [] });
                  const { subject } = yield* Operation.invoke(
                    SpaceOperation.AddObject,
                    { object, target: space.db, targetNodeId: getAutomationsPath(space.db.spaceId) },
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(LayoutOperation.Open, { subject: [...subject] }, { spaceId: space.db.spaceId });
                }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Automation.Automation) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'spaceSettingsAutomation',
        match: NodeMatcher.whenNodeType(SETTINGS_SECTION_TYPE),
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'automations',
              type: `${meta.id}.space-settings-automation`,
              label: ['automation-panel.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              iconHue: 'indigo',
              position: 'last',
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'spaceSettingsFunctions',
        match: NodeMatcher.whenNodeType(SETTINGS_SECTION_TYPE),
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'functions',
              type: `${meta.id}.space-settings-functions`,
              label: ['functions-panel.label', { ns: meta.id }],
              icon: 'ph--function--regular',
              iconHue: 'indigo',
              position: 'last',
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'automationsCompanion',
        match: NodeMatcher.whenEchoObjectMatches,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('automations'),
              label: ['automations-companion.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              data: 'automations',
              position: 'last',
            }),
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: 'scriptCompanion',
        type: Script.Script,
        connector: (script) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('automation'),
              label: ['script-automation.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              data: 'automation',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
