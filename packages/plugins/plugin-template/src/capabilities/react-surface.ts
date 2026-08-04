//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TemplatePanel } from '#components';
import { Template } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'root',
        filter: AppSurface.object(AppSurface.Article, Template.Data),
        component: TemplatePanel,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ),
  ),
);
