//
// Copyright 2025 DXOS.org
//

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
import { Obj, Filter } from '@dxos/echo';
import { type JsonPath, setValue } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Card } from '@dxos/react-ui-stack';
import { TableType } from '@dxos/react-ui-table';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { ContactCard, OrganizationCard, ProjectCard } from '../components';
import { PREVIEW_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    //
    // Specific schema types.
    //
    createSurface({
      id: `${PREVIEW_PLUGIN}/schema-popover--contact`,
      role: ['popover', 'card--intrinsic', 'transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Person } => Obj.instanceOf(DataType.Person, data.subject),
      component: ({ data, role }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const handleOrgClick = useCallback(
          async (org: DataType.Organization) => {
            const space = getSpace(org);
            const tablesQuery = await space?.db.query(Filter.type(TableType)).run();
            const currentSpaceOrgTable = tablesQuery?.objects.find((table) => {
              return table.view?.target?.query?.typename === DataType.Organization.typename;
            });
            await dispatch(
              createIntent(LayoutAction.UpdatePopover, {
                part: 'popover',
                options: {
                  state: false,
                  anchorId: '',
                },
              }),
            );
            if (currentSpaceOrgTable) {
              return dispatch(
                createIntent(LayoutAction.Open, {
                  part: 'main',
                  subject: [fullyQualifiedId(currentSpaceOrgTable)],
                  options: { workspace: space?.id },
                }),
              );
            }
          },
          [dispatch],
        );
        return (
          <ContactCard role={role} subject={data.subject} onOrgClick={handleOrgClick}>
            {role === 'popover' && <Surface role='related' data={data} />}
          </ContactCard>
        );
      },
    }),
    createSurface({
      id: `${PREVIEW_PLUGIN}/schema-popover--organization`,
      role: ['popover', 'card--intrinsic', 'transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Organization } => Obj.instanceOf(DataType.Organization, data.subject),
      component: ({ data, role }) => (
        <OrganizationCard role={role} subject={data.subject}>
          {role === 'popover' && <Surface role='related' data={data} />}
        </OrganizationCard>
      ),
    }),
    createSurface({
      id: `${PREVIEW_PLUGIN}/schema-popover--project`,
      role: ['popover', 'card--intrinsic', 'transclusion', 'card--extrinsic', 'card'],
      filter: (data): data is { subject: DataType.Project } => Obj.instanceOf(DataType.Project, data.subject),
      component: ({ data, role }) => <ProjectCard subject={data.subject} role={role} />,
    }),

    //
    // Fallback for any object.
    //
    createSurface({
      id: `${PREVIEW_PLUGIN}/fallback-popover`,
      role: ['popover', 'card--intrinsic', 'transclusion', 'card--extrinsic', 'card'],
      position: 'fallback',
      filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
      component: ({ data, role }) => {
        const schema = getSchema(data.subject);
        const { t } = useTranslation(PREVIEW_PLUGIN);
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
              values={data.subject}
              readonly={role === 'popover'}
              onSave={handleSave}
              autoSave
              {...(role === 'card--intrinsic' && { outerSpacing: 'blockStart-0' })}
            />
          </Card.SurfaceRoot>
        );
      },
    }),
  ]);
