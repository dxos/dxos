//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, LayoutOperation, TypeSection } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SETTINGS_SECTION_TYPE } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Automation, AutomationOperation } from '#types';

import { blank } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Automation.Automation),
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
                  const { subject } = yield* Operation.invoke(
                    AutomationOperation.CreateAutomation,
                    { db: space.db, templateId: blank.id },
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(
                    LayoutOperation.Open,
                    { subject: [...subject] },
                    { spaceId: space.db.spaceId },
                  );
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
              type: `${meta.profile.key}.space-settings-automation`,
              label: ['automation-panel.label', { ns: meta.profile.key }],
              icon: 'ph--lightning--regular',
              iconHue: 'indigo',
              position: 'last',
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'automationCompanion',
        match: NodeMatcher.whenEchoObjectMatches,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('automation'),
              label: ['automation-companion.label', { ns: meta.profile.key }],
              icon: 'ph--lightning--regular',
              data: 'automation',
              position: 'last',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
