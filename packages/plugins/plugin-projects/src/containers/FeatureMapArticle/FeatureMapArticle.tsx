//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { FeatureBoard } from '#components';
import { meta } from '#meta';
import { type FeatureMap, FeatureMapView } from '#types';

// Not in the components barrel: the canvas engine is large, and the barrel is also loaded by capabilities at boot.
import { FeatureCanvas } from '../../components/FeatureCanvas/index.ts';
import { useFeatureModels } from './useFeatureModels.ts';

export type FeatureMapArticleProps = AppSurface.ObjectArticleProps<FeatureMap.FeatureMap>;

const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'cards', icon: 'ph--cards--regular' },
  { mode: 'canvas', icon: 'ph--graph--regular' },
];

/** Article surface for a {@link FeatureMap.FeatureMap}: its features as cards (the default) or on a canvas. */
export const FeatureMapArticle = ({ role, subject, attendableId }: FeatureMapArticleProps) => {
  const { mode } = useViewState(FeatureMapView.aspect, subject.id);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, subject.id);
  const features = useFeatureModels(subject);

  const menu = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .group(
          'mode',
          {
            label: ['feature-map.mode.label', { ns: meta.profile.key }],
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: mode,
          },
          (group) =>
            MODES.forEach(({ mode, icon }) =>
              group.action(
                mode,
                {
                  label: [`feature-map.mode.${mode}.label`, { ns: meta.profile.key }],
                  icon,
                  testId: `projectsPlugin.featureMap.${mode}`,
                },
                () => updateView((prev) => ({ ...prev, mode })),
              ),
            ),
        )
        .build(),
    [mode, updateView],
  );

  const handlePositionsChange = useCallback(
    (positions: FeatureMap.FeatureMap['positions']) =>
      Obj.update(subject, (subject) => {
        subject.positions = { ...positions };
      }),
    [subject],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menu} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        {mode === 'canvas' ? (
          <div className='dx-cover relative' data-testid='feature-map.canvas'>
            <FeatureCanvas
              features={features}
              positions={subject.positions}
              onPositionsChange={handlePositionsChange}
            />
          </div>
        ) : (
          <ScrollArea.Root orientation='vertical' classNames='dx-cover'>
            <ScrollArea.Viewport>
              <FeatureBoard features={features} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
