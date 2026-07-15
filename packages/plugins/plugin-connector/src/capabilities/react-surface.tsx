//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps, useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';

import {
  ConnectionArticle,
  ConnectionSettingsArticle,
  ConnectorCompanion,
  CustomTokenDialog,
  SyncTargetsDialog,
} from '#containers';
import { Connection, Connector, ConnectorAnnotationId, SyncBinding } from '#types';

import { CONNECTIONS_SECTION_TYPE, PROVIDER_FORM_DIALOG, SYNC_TARGETS_DIALOG } from '../constants';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'connectionsSectionArticle',
        filter: AppSurface.literal(AppSurface.Article, CONNECTIONS_SECTION_TYPE),
        component: () => <ConnectionSettingsArticle />,
      }),
      Surface.create({
        id: 'connectionArticle',
        filter: AppSurface.object(AppSurface.Article, Connection.Connection),
        component: ({ data, role }) => (
          <ConnectionArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'connectorCompanion',
        filter: AppSurface.allOf(
          AppSurface.object(AppSurface.Article, SyncBinding.SyncBinding),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data, role }) => <ConnectorCompanion {...data} role={role} />,
      }),
      Surface.create({
        id: 'syncTargetsDialog',
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsDialog>>(AppSurface.Dialog, SYNC_TARGETS_DIALOG),
        component: ({ data }) => <SyncTargetsDialog {...data.props} />,
      }),
      Surface.create({
        id: 'customTokenDialog',
        filter: AppSurface.component<ComponentProps<typeof CustomTokenDialog>>(AppSurface.Dialog, PROVIDER_FORM_DIALOG),
        component: ({ data }) => <CustomTokenDialog {...data.props} />,
      }),
      Surface.create({
        id: 'connectorSelector',
        filter: AppSurface.formInputByField((ast) => !!SchemaEx.findAnnotation<boolean>(ast, ConnectorAnnotationId)),
        component: ({ data: { fieldPropertyAst }, ...inputProps }) => {
          const connectors = useCapabilities(Connector).flat();
          const options = useMemo(
            () => connectors.map((connector) => ({ value: connector.id, label: connector.label ?? connector.id })),
            [connectors],
          );
          if (!fieldPropertyAst) {
            return null;
          }
          // Surface input props are erased to `unknown` at the form-input seam; re-attach the
          // field AST and assert the renderer contract (same pattern as plugin-kanban/-space).
          const props = { ...inputProps, type: fieldPropertyAst } as any as FormFieldRendererProps;
          return <SelectField {...props} options={options} />;
        },
      }),
    ]),
  ),
);
