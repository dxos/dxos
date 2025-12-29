//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { Diagram } from '@dxos/plugin-sketch/types';

import { SketchContainer, SketchSettings } from '../../components';
import { meta } from '../../meta';
import { EXCALIDRAW_SCHEMA, type SketchSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/sketch`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: Diagram.Diagram } => Diagram.isDiagram(data.subject, EXCALIDRAW_SCHEMA),
      component: ({ data, role }) => {
        const settings = useCapability(Common.Capability.SettingsStore).getStore<SketchSettingsProps>(meta.id)!.value;

        return (
          <SketchContainer
            key={Obj.getDXN(data.subject).toString()} // Force instance per sketch object. Otherwise, sketch shares the same instance.
            sketch={data.subject}
            role={role}
            settings={settings}
          />
        );
      },
    }),
    Common.createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SketchSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <SketchSettings settings={subject.value} />,
    }),
  ]),
);
