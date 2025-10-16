//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import {
  Capabilities,
  Surface,
  contributes,
  createSurface,
  useCapabilities,
  useCapability,
  useLayout,
} from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { SettingsStore } from '@dxos/local-storage';
import { ClientCapabilities } from '@dxos/plugin-client';
import { useClient } from '@dxos/react-client';
import {
  type Space,
  SpaceState,
  fullyQualifiedId,
  getSpace,
  isLiveObject,
  isSpace,
  parseId,
  useSpace,
} from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { type InputProps, SelectInput } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { DataType, type TypenameAnnotation, TypenameAnnotationId } from '@dxos/schema';
import { type JoinPanelProps } from '@dxos/shell/react';

import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  CollectionMain,
  CollectionSection,
  CreateObjectDialog,
  type CreateObjectDialogProps,
  CreateSpaceDialog,
  InlineSyncStatus,
  JOIN_DIALOG,
  JoinDialog,
  MembersContainer,
  MenuFooter,
  ObjectDetailsPanel,
  ObjectSettingsContainer,
  POPOVER_RENAME_OBJECT,
  POPOVER_RENAME_SPACE,
  PopoverRenameObject,
  PopoverRenameSpace,
  RecordMain,
  SchemaContainer,
  SmallPresenceLive,
  SpacePluginSettings,
  SpacePresence,
  SpaceSettingsContainer,
  SyncStatus,
  ViewEditor,
} from '../components';
import { meta } from '../meta';
import { HueAnnotationId, IconAnnotationId, type SpaceSettingsProps } from '../types';

import { SpaceCapabilities } from './capabilities';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

const OMIT = [DataType.Collection.typename, Type.getTypename(DataType.QueryCollection)];

export default ({ createInvitationUrl }: ReactSurfaceOptions) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/article`,
      role: 'article',
      filter: (data): data is { subject: Space } =>
        // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
        isSpace(data.subject) && data.subject.state.get() === SpaceState.SPACE_READY,
      component: ({ data, role, ...rest }) => (
        <Surface
          data={{
            id: data.subject.id,
            subject: data.subject.properties[DataType.Collection.typename]?.target,
          }}
          role={role}
          {...rest}
        />
      ),
    }),
    createSurface({
      id: `${meta.id}/record-article`,
      role: 'article',
      position: 'fallback',
      filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
      component: ({ data }) => <RecordMain record={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/collection-fallback`,
      role: 'article',
      position: 'fallback',
      filter: (data): data is { subject: DataType.Collection } => Obj.instanceOf(DataType.Collection, data.subject),
      component: ({ data }) => <CollectionMain collection={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SpaceSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <SpacePluginSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/companion/object-settings`,
      role: 'article',
      filter: (data): data is { companionTo: Obj.Any } => Obj.isObject(data.companionTo) && data.subject === 'settings',
      component: ({ data, role }) => <ObjectSettingsContainer object={data.companionTo} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/space-settings-properties`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/properties`,
      component: () => {
        const layout = useLayout();
        const { spaceId } = parseId(layout.workspace);
        const space = useSpace(spaceId);
        if (!space || !spaceId) {
          return null;
        }

        return <SpaceSettingsContainer space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/space-settings-members`,
      role: 'article',
      position: 'hoist',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/members`,
      component: () => {
        const layout = useLayout();
        const { spaceId } = parseId(layout.workspace);
        const space = useSpace(spaceId);
        if (!space || !spaceId) {
          return null;
        }

        return <MembersContainer space={space} createInvitationUrl={createInvitationUrl} />;
      },
    }),
    createSurface({
      id: `${meta.id}/space-settings-schema`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/schema`,
      component: () => {
        const layout = useLayout();
        const { spaceId } = parseId(layout.workspace);
        const space = useSpace(spaceId);
        if (!space || !spaceId) {
          return null;
        }

        return <SchemaContainer space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/selected-objects`,
      role: 'article',
      filter: (data): data is { companionTo: DataType.View; subject: 'selected-objects' } =>
        Obj.instanceOf(DataType.View, data.companionTo) && data.subject === 'selected-objects',
      component: ({ data }) => (
        <ObjectDetailsPanel
          key={fullyQualifiedId(data.companionTo)}
          objectId={fullyQualifiedId(data.companionTo)}
          view={data.companionTo}
        />
      ),
    }),
    createSurface({
      id: JOIN_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: JoinPanelProps } => data.component === JOIN_DIALOG,
      component: ({ data }) => <JoinDialog {...data.props} />,
    }),
    createSurface({
      id: CREATE_SPACE_DIALOG,
      role: 'dialog',
      filter: (data): data is any => data.component === CREATE_SPACE_DIALOG,
      component: () => <CreateSpaceDialog />,
    }),
    createSurface({
      id: CREATE_OBJECT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: CreateObjectDialogProps } => data.component === CREATE_OBJECT_DIALOG,
      component: ({ data }) => <CreateObjectDialog {...data.props} />,
    }),
    createSurface({
      id: `${meta.id}/create-initial-space-form-[hue]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: Schema.Schema<any> } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, HueAnnotationId);
        return !!annotation;
      },
      component: ({ data: _, ...inputProps }) => {
        const { label, readonly, type, getValue, onValueChange } = inputProps as any as InputProps;
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange]);
        return (
          <Input.Root>
            <Input.Label>{label}</Input.Label>
            <HuePicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
          </Input.Root>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/create-initial-space-form-[icon]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: Schema.Schema<any> } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, IconAnnotationId);
        return !!annotation;
      },
      component: ({ data: _, ...inputProps }) => {
        const { label, readonly, type, getValue, onValueChange } = inputProps as any as InputProps;
        const handleChange = useCallback((nextIcon: string) => onValueChange(type, nextIcon), [onValueChange]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange]);
        return (
          <Input.Root>
            <Input.Label>{label}</Input.Label>
            <IconPicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
          </Input.Root>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/typename-form-input`,
      role: 'form-input',
      filter: (
        data,
      ): data is { prop: string; schema: Schema.Schema<any>; target: Space | DataType.Collection | undefined } => {
        if (data.prop !== 'typename') {
          return false;
        }

        const annotation = findAnnotation((data.schema as Schema.Schema.All).ast, TypenameAnnotationId);
        return !!annotation;
      },
      component: ({ data: { schema, target }, ...inputProps }) => {
        const { t } = useTranslation();
        const client = useClient();
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }

        const annotation = findAnnotation<TypenameAnnotation[]>(schema.ast, TypenameAnnotationId)!;

        const schemaWhitelists = useCapabilities(ClientCapabilities.SchemaWhiteList);
        const whitelistedTypenames = useMemo(
          () => new Set(schemaWhitelists.flatMap((typeArray) => typeArray.map((type) => Type.getTypename(type)))),
          [schemaWhitelists],
        );

        const objectForms = useCapabilities(SpaceCapabilities.ObjectForm);
        const objectFormTypenames = useMemo(
          () =>
            new Set(
              objectForms
                .map((form) => Type.getTypename(form.objectSchema))
                // TODO(wittjosiah): Remove.
                .filter((typename) => !OMIT.includes(typename) && !typename.endsWith('View')),
            ),
          [objectForms],
        );

        const fixed = client.graph.schemaRegistry.schemas.filter((schema) => {
          const limitedStatic =
            annotation.includes('limited-static') && whitelistedTypenames.has(Type.getTypename(schema));
          const unusedStatic =
            annotation.includes('unused-static') &&
            whitelistedTypenames.has(Type.getTypename(schema)) &&
            !space.properties.staticRecords?.includes(Type.getTypename(schema));
          const usedStatic =
            annotation.includes('used-static') &&
            whitelistedTypenames.has(Type.getTypename(schema)) &&
            space.properties.staticRecords?.includes(Type.getTypename(schema));
          const objectForm = annotation.includes('object-form') && objectFormTypenames.has(Type.getTypename(schema));
          return annotation.includes('static') || limitedStatic || unusedStatic || usedStatic || objectForm;
        });
        const dynamic = space?.db.schemaRegistry.query().runSync();
        const typenames = Array.from(
          new Set<string>([
            ...(annotation.includes('limited-static') ||
            annotation.includes('unused-static') ||
            annotation.includes('used-static') ||
            annotation.includes('static') ||
            annotation.includes('object-form')
              ? fixed.map((schema) => Type.getTypename(schema))
              : []),
            ...(annotation.includes('dynamic') ? dynamic.map((schema) => schema.typename) : []),
          ]),
        ).sort();

        const options = useMemo(
          () =>
            typenames
              .map((typename) => ({
                value: typename,
                label: t('typename label', { ns: typename, defaultValue: typename }),
              }))
              .toSorted((a, b) => a.label.localeCompare(b.label)),
          [t, typenames],
        );

        return <SelectInput {...props} options={options} />;
      },
    }),
    createSurface({
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: DataType.View } => Obj.instanceOf(DataType.View, data.subject),
      component: ({ data }) => <ViewEditor view={data.subject} />,
    }),
    createSurface({
      id: POPOVER_RENAME_SPACE,
      role: 'card--popover',
      filter: (data): data is { props: Space } => data.component === POPOVER_RENAME_SPACE && isSpace(data.props),
      component: ({ data }) => <PopoverRenameSpace space={data.props} />,
    }),
    createSurface({
      id: POPOVER_RENAME_OBJECT,
      role: 'card--popover',
      filter: (data): data is { props: Obj.Any } =>
        data.component === POPOVER_RENAME_OBJECT && isLiveObject(data.props),
      component: ({ data }) => <PopoverRenameObject object={data.props} />,
    }),
    createSurface({
      id: `${meta.id}/menu-footer`,
      role: 'menu-footer',
      filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
      component: ({ data }) => <MenuFooter object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/navtree-presence`,
      role: 'navtree-item-end',
      filter: (data): data is { id: string; subject: Obj.Any; open?: boolean } =>
        typeof data.id === 'string' && Obj.isObject(data.subject),
      component: ({ data }) => {
        // TODO(wittjosiah): Doesn't need to be mutable but readonly type messes with ComplexMap.
        const state = useCapability(SpaceCapabilities.MutableState);
        return <SmallPresenceLive id={data.id} open={data.open} viewers={state.viewersByObject[data.id]} />;
      },
    }),
    // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
    createSurface({
      id: `${meta.id}/navtree-presence-fallback`,
      role: 'navtree-item-end',
      position: 'fallback',
      filter: (data): data is { id: string; open?: boolean } => typeof data.id === 'string',
      component: ({ data }) => <SmallPresenceLive id={data.id} open={data.open} />,
    }),
    // TODO(wittjosiah): Broken?
    createSurface({
      id: `${meta.id}/navtree-sync-status`,
      role: 'navtree-item-end',
      filter: (data): data is { subject: Space; open?: boolean } => isSpace(data.subject),
      component: ({ data }) => <InlineSyncStatus space={data.subject} open={data.open} />,
    }),
    createSurface({
      id: `${meta.id}/navbar-presence`,
      role: 'navbar-end',
      position: 'hoist',
      filter: (data): data is { subject: Space | Obj.Any } => isSpace(data.subject) || Obj.isObject(data.subject),
      component: ({ data }) => {
        const space = isSpace(data.subject) ? data.subject : getSpace(data.subject);
        const object = isSpace(data.subject)
          ? data.subject.state.get() === SpaceState.SPACE_READY
            ? (space?.properties[DataType.Collection.typename]?.target as DataType.Collection)
            : undefined
          : data.subject;

        return object ? <SpacePresence object={object} /> : null;
      },
    }),
    createSurface({
      id: `${meta.id}/collection-section`,
      role: 'section',
      filter: (data): data is { subject: DataType.Collection } => Obj.instanceOf(DataType.Collection, data.subject),
      component: ({ data }) => <CollectionSection collection={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/status`,
      role: 'status',
      component: () => <SyncStatus />,
    }),
  ]);
