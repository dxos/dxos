//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import {
  Capabilities,
  LayoutAction,
  Surface,
  contributes,
  createIntent,
  createSurface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { fullyQualifiedId, getSchema, getSpace } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { type JsonPath, setValue } from '@dxos/echo-schema';
import { AttentionAction } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Card } from '@dxos/react-ui-stack';
import { Table } from '@dxos/react-ui-table/types';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';
import { DataType, type ProjectionModel, getTypenameFromQuery } from '@dxos/schema';

import { ContactCard, OrganizationCard, ProjectCard } from '../components';
import { TaskCard } from '../components/TaskCard';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    //
    // Specific schema types.
    //
    createSurface({
      id: `${meta.id}/schema-popover--contact`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Person } => Obj.instanceOf(DataType.Person, data.subject),
      component: ({ data, role }) => {
        const { dispatch } = useIntentDispatcher();
        const space = getSpace(data.subject);
        const defaultSpace = useSpace();
        const activeSpace = useActiveSpace();

        const currentSpaceOrgs = useQuery(space, Filter.type(DataType.Organization));
        const currentSpaceViews = useQuery(space, Filter.type(DataType.View));
        const defaultSpaceViews = useQuery(defaultSpace, Filter.type(DataType.View));
        const currentSpaceOrgTable = currentSpaceViews.find(
          (view) =>
            getTypenameFromQuery(view.query.ast) === DataType.Organization.typename &&
            Obj.instanceOf(Table.Table, view.presentation.target),
        );
        const defaultSpaceOrgTable = defaultSpaceViews.find(
          (view) =>
            getTypenameFromQuery(view.query.ast) === DataType.Organization.typename &&
            Obj.instanceOf(Table.Table, view.presentation.target),
        );

        // TODO(wittjosiah): Generalized way of handling related objects navigation.
        const handleOrgClick = useCallback(
          (org: DataType.Organization) =>
            Effect.gen(function* () {
              const view = currentSpaceOrgs.includes(org) ? currentSpaceOrgTable : defaultSpaceOrgTable;
              yield* dispatch(
                createIntent(LayoutAction.UpdatePopover, {
                  part: 'popover',
                  options: {
                    state: false,
                    anchorId: '',
                  },
                }),
              );
              if (view) {
                const id = fullyQualifiedId(view);
                yield* dispatch(
                  createIntent(LayoutAction.Open, {
                    part: 'main',
                    subject: [id],
                    options: { workspace: space?.id },
                  }),
                );
                yield* dispatch(
                  createIntent(DeckAction.ChangeCompanion, {
                    primary: id,
                    companion: [id, 'selected-objects'].join(ATTENDABLE_PATH_SEPARATOR),
                  }),
                );
                yield* dispatch(
                  createIntent(AttentionAction.Select, {
                    contextId: id,
                    selection: { mode: 'multi', ids: [org.id] },
                  }),
                );
              }
            }).pipe(Effect.runPromise),
          [dispatch, currentSpaceOrgs, currentSpaceOrgTable, defaultSpaceOrgTable],
        );

        return (
          <ContactCard role={role} subject={data.subject} activeSpace={activeSpace} onOrgClick={handleOrgClick}>
            {role === 'card--popover' && <Surface role='related' data={data} />}
          </ContactCard>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--organization`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Organization } => Obj.instanceOf(DataType.Organization, data.subject),
      component: ({ data, role }) => {
        const activeSpace = useActiveSpace();

        return (
          <OrganizationCard role={role} subject={data.subject} activeSpace={activeSpace}>
            {role === 'card--popover' && <Surface role='related' data={data} />}
          </OrganizationCard>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--project`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Project } => Obj.instanceOf(DataType.Project, data.subject),
      component: ({ data, role }) => {
        const activeSpace = useActiveSpace();

        return <ProjectCard subject={data.subject} role={role} activeSpace={activeSpace} />;
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--task`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Task } => Obj.instanceOf(DataType.Task, data.subject),
      component: ({ data, role }) => <TaskCard subject={data.subject} role={role} />,
    }),

    //
    // Fallback for any object.
    //
    createSurface({
      id: `${meta.id}/fallback-popover`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      position: 'fallback',
      filter: (data): data is { subject: Obj.Any; projection?: ProjectionModel } => Obj.isObject(data.subject),
      component: ({ data, role }) => {
        const schema = getSchema(data.subject);
        const { t } = useTranslation(meta.id);
        if (!schema) {
          // TODO(burdon): Use Alert.
          return <p className={mx(descriptionMessage)}>{t('unable to create preview message')}</p>;
        }

        const handleSave = useCallback((values: any, { changed }: { changed: Record<string, boolean> }) => {
          const changedPaths = Object.keys(changed).filter((path) => changed[path]);
          for (const path of changedPaths) {
            const value = values[path];
            setValue(data.subject, path as JsonPath, value);
          }
        }, []);

        return (
          <Card.SurfaceRoot role={role}>
            <Form
              schema={schema}
              projection={data.projection}
              values={data.subject}
              readonly={role === 'card--popover' ? 'static' : false}
              onSave={handleSave}
              autoSave
              {...(role === 'card--intrinsic' && { outerSpacing: 'blockStart-0' })}
            />
          </Card.SurfaceRoot>
        );
      },
    }),
  ]);
