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
import { Filter, fullyQualifiedId, getSchema, getSpace, isEchoObject, type AnyLiveObject } from '@dxos/client/echo';
import { isInstanceOf, type JsonPath, setValue } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { TableType } from '@dxos/react-ui-table';
import { descriptionMessage } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { ContactCard, OrganizationCard, ProjectCard } from '../components';
import { PREVIEW_PLUGIN } from '../meta';
import { kanbanCardWithoutPoster } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    //
    // Specific schema types.
    //
    createSurface({
      id: `${PREVIEW_PLUGIN}/schema-popover--contact`,
      role: ['popover', 'card--kanban', 'card'],
      filter: (data): data is { subject: DataType.Person } => isInstanceOf(DataType.Person, data.subject),
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
          <ContactCard subject={data.subject} onOrgClick={handleOrgClick} role={role}>
            {role === 'popover' && <Surface role='related' data={data} />}
          </ContactCard>
        );
      },
    }),
    createSurface({
      id: `${PREVIEW_PLUGIN}/schema-popover--organization`,
      role: ['popover', 'card--kanban', 'card'],
      filter: (data): data is { subject: DataType.Organization } => isInstanceOf(DataType.Organization, data.subject),
      component: ({ data, role }) => (
        <OrganizationCard subject={data.subject} role={role}>
          {role === 'popover' && <Surface role='related' data={data} />}
        </OrganizationCard>
      ),
    }),
    createSurface({
      id: `${PREVIEW_PLUGIN}/schema-popover--project`,
      role: ['popover', 'card--kanban', 'card'],
      filter: (data): data is { subject: DataType.Project } => isInstanceOf(DataType.Project, data.subject),
      component: ({ data, role }) => <ProjectCard subject={data.subject} role={role} />,
    }),

    //
    // Fallback for any object.
    //
    createSurface({
      id: `${PREVIEW_PLUGIN}/fallback-popover`,
      role: ['popover', 'card--kanban', 'card'],
      position: 'fallback',
      filter: (data): data is { subject: AnyLiveObject<any> } => isEchoObject(data.subject),
      component: ({ data, role }) => {
        const schema = getSchema(data.subject);
        const { t } = useTranslation(PREVIEW_PLUGIN);
        if (!schema) {
          return <p className={descriptionMessage}>{t('unable to create preview message')}</p>;
        }

        const handleSave = useCallback((values: any, { changed }: { changed: Record<string, boolean> }) => {
          const changedPaths = Object.keys(changed).filter((path) => changed[path]);
          for (const path of changedPaths) {
            const value = values[path];
            setValue(data.subject, path as JsonPath, value);
          }
        }, []);

        return (
          <Form
            schema={schema}
            values={data.subject}
            readonly={role === 'popover'}
            onSave={handleSave}
            autoSave
            {...(role === 'card--kanban' && { classNames: kanbanCardWithoutPoster })}
          />
        );
      },
    }),
  ]);
