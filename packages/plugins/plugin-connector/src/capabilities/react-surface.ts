//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Connection, Cursor } from '@dxos/link';

import {
  ConnectionArticle,
  ConnectionSettingsArticle,
  ConnectorCompanion,
  CustomTokenDialog,
  SyncTargetsDialog,
} from '#containers';

import { CONNECTIONS_SECTION_TYPE, PROVIDER_FORM_DIALOG, SYNC_TARGETS_DIALOG } from '../constants.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'connectionsSectionArticle',
        filter: AppSurface.literal(AppSurface.Article, CONNECTIONS_SECTION_TYPE),
        component: ConnectionSettingsArticle,
      }),
      Surface.create({
        id: 'connectionArticle',
        filter: AppSurface.object(AppSurface.Article, Connection.Connection),
        component: ConnectionArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'connectorCompanion',
        filter: AppSurface.allOf(
          AppSurface.object(AppSurface.Article, Cursor.Cursor),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ConnectorCompanion,
        props: ({ role, data }) => ({ ...data, role }),
      }),
      Surface.create({
        id: 'syncTargetsDialog',
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsDialog>>(AppSurface.Dialog, SYNC_TARGETS_DIALOG),
        component: SyncTargetsDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: 'customTokenDialog',
        filter: AppSurface.component<ComponentProps<typeof CustomTokenDialog>>(AppSurface.Dialog, PROVIDER_FORM_DIALOG),
        component: CustomTokenDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
