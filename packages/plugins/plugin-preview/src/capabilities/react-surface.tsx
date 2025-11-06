//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities, LayoutAction, contributes, createIntent, createSurface } from '@dxos/app-framework';
import { Surface, useIntentDispatcher } from '@dxos/app-framework/react';
import { fullyQualifiedId, getSchema, getSpace } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { type JsonPath, setValue } from '@dxos/echo/internal';
import { useActiveSpace } from '@dxos/plugin-space';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Card } from '@dxos/react-ui-stack';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';
import { DataType, type ProjectionModel } from '@dxos/schema';

import { OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import { meta } from '../meta';
import { type PreviewProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    //
    // Specific schema types.
    // TODO(burdon): Create helpers and factor out.
    //

    createSurface({
      id: `${meta.id}/schema-popover--contact`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Person.Person } =>
        Obj.instanceOf(DataType.Person.Person, data.subject),
      component: ({ data, role }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const space = getSpace(data.subject);
        const activeSpace = useActiveSpace(); // TODO(burdon): Disambiguate with space?
        const handleSelect = useCallback<NonNullable<PreviewProps['onSelect']>>(
          (object) =>
            dispatch(
              createIntent(LayoutAction.Open, {
                part: 'main',
                subject: [fullyQualifiedId(object)],
                options: {
                  workspace: space?.id,
                },
              }),
            ),
          [dispatch],
        );

        return (
          <PersonCard role={role} subject={data.subject} activeSpace={activeSpace} onSelect={handleSelect}>
            {role === 'card--popover' && <Surface role='related' data={data} />}
          </PersonCard>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--organization`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Organization.Organization } =>
        Obj.instanceOf(DataType.Organization.Organization, data.subject),
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
      filter: (data): data is { subject: DataType.Project.Project } =>
        Obj.instanceOf(DataType.Project.Project, data.subject),
      component: ({ data, role }) => {
        const activeSpace = useActiveSpace();
        return <ProjectCard subject={data.subject} role={role} activeSpace={activeSpace} />;
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--task`,
      role: ['card--popover', 'card--intrinsic', 'card--transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Task.Task } => Obj.instanceOf(DataType.Task.Task, data.subject),
      component: ({ data, role }) => {
        return <TaskCard subject={data.subject} role={role} />;
      },
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
              id={data.subject.id}
              schema={schema}
              projection={data.projection}
              values={data.subject}
              readonly={role === 'card--popover' ? 'static' : false}
              onSave={handleSave}
              autoSave
              {...(role === 'card--intrinsic' && {
                outerSpacing: 'blockStart-0',
              })}
            />
          </Card.SurfaceRoot>
        );
      },
    }),

    createSurface({
      id: `${meta.id}/section`,
      role: ['section'],
      position: 'fallback',
      filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
      component: ({ data }) => {
        return (
          <div role='none' className='flex is-full justify-center'>
            <div role='none' className='pbs-2 pbe-2 card-min-width card-max-width'>
              <Surface role='card' data={data} limit={1} />
            </div>
          </div>
        );
      },
    }),
  ]);
