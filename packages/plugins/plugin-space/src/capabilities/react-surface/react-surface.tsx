//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Surface, useAtomCapability, useLayout, useSettingsState } from '@dxos/app-framework/react';
import { Database, Obj, type Ref } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type Space, SpaceState, getSpace, isSpace, parseId, useSpace } from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { type FormFieldComponentProps, SelectField } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { Collection, type View, ViewAnnotation } from '@dxos/schema';
import { type JoinPanelProps } from '@dxos/shell/react';

import {
  CollectionArticle,
  CollectionSection,
  CreateObjectDialog,
  type CreateObjectDialogProps,
  CreateSpaceDialog,
  InlineSyncStatus,
  JoinDialog,
  MembersContainer,
  MenuFooter,
  ObjectCardStack,
  ObjectDetails,
  ObjectRenamePopover,
  RecordArticle,
  SchemaContainer,
  SmallPresenceLive,
  SpacePluginSettings,
  SpacePresence,
  SpaceRenamePopover,
  SpaceSettingsContainer,
  SyncStatus,
  ViewEditor,
} from '../../components';
import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  JOIN_DIALOG,
  OBJECT_RENAME_POPOVER,
  SPACE_RENAME_POPOVER,
} from '../../constants';
import { useTypeOptions } from '../../hooks';
import { meta } from '../../meta';
import {
  HueAnnotationId,
  IconAnnotationId,
  SpaceCapabilities,
  type SpaceSettingsProps,
  type TypeInputOptions,
  TypeInputOptionsAnnotationId,
} from '../../types';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: ReactSurfaceOptions) {
    const { createInvitationUrl } = props!;

    return Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/article`,
        role: 'article',
        filter: (data): data is { subject: Space } =>
          // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
          isSpace(data.subject) && data.subject.state.get() === SpaceState.SPACE_READY,
        component: ({ data, role, ...rest }) => (
          <Surface
            data={{
              id: data.subject.id,
              subject: data.subject.properties[Collection.Collection.typename]?.target,
            }}
            role={role}
            {...rest}
          />
        ),
      }),
      Common.createSurface({
        id: `${meta.id}/record-article`,
        role: 'article',
        position: 'fallback',
        filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
        component: ({ data }) => <RecordArticle subject={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/collection-fallback`,
        role: 'article',
        position: 'fallback',
        filter: (data): data is { subject: Collection.Collection } =>
          Obj.instanceOf(Collection.Collection, data.subject),
        component: ({ data }) => <CollectionArticle subject={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<SpaceSettingsProps>(subject.atom);
          return <SpacePluginSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/companion/object-settings`,
        role: 'article',
        filter: (data): data is { companionTo: Obj.Any } =>
          Obj.isObject(data.companionTo) && data.subject === 'settings',
        component: ({ ref, data, role }) => <ObjectDetails object={data.companionTo} role={role} ref={ref} />,
      }),
      Common.createSurface({
        id: `${meta.id}/space-settings-properties`,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === `${meta.id}/properties`,
        component: ({ ref }) => {
          const layout = useLayout();
          const { spaceId } = parseId(layout.workspace);
          const space = useSpace(spaceId);
          if (!space || !spaceId) {
            return null;
          }

          return <SpaceSettingsContainer space={space} ref={ref} />;
        },
      }),
      Common.createSurface({
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
      Common.createSurface({
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
      Common.createSurface({
        id: `${meta.id}/selected-objects`,
        role: 'article',
        filter: (data): data is { companionTo: Obj.Obj<{ view: Ref.Ref<View.View> }>; subject: 'selected-objects' } => {
          if (data.subject !== 'selected-objects' || !Obj.isObject(data.companionTo)) {
            return false;
          }

          // TODO(burdon): Check companionTo.view.target is valid.
          const schema = Obj.getSchema(data.companionTo);
          return Option.fromNullable(schema).pipe(
            Option.flatMap((schema) => ViewAnnotation.get(schema)),
            Option.getOrElse(() => false),
          );
        },
        component: ({ data, ref }) => (
          <ObjectCardStack
            key={Obj.getDXN(data.companionTo).toString()}
            objectId={Obj.getDXN(data.companionTo).toString()}
            view={data.companionTo.view.target!}
            ref={ref}
          />
        ),
      }),
      Common.createSurface({
        id: JOIN_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: JoinPanelProps } => data.component === JOIN_DIALOG,
        component: ({ data }) => <JoinDialog {...data.props} />,
      }),
      Common.createSurface({
        id: CREATE_SPACE_DIALOG,
        role: 'dialog',
        filter: (data): data is any => data.component === CREATE_SPACE_DIALOG,
        component: () => <CreateSpaceDialog />,
      }),
      Common.createSurface({
        id: CREATE_OBJECT_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: CreateObjectDialogProps } => data.component === CREATE_OBJECT_DIALOG,
        component: ({ data }) => <CreateObjectDialog {...data.props} />,
      }),
      Common.createSurface({
        id: `${meta.id}/create-initial-space-form-[hue]`,
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema<any> } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, HueAnnotationId);
          return !!annotation;
        },
        component: ({ data: _, ...inputProps }) => {
          const { label, readonly, type, getValue, onValueChange } = inputProps as any as FormFieldComponentProps;
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
      Common.createSurface({
        id: `${meta.id}/create-initial-space-form-[icon]`,
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema<any> } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, IconAnnotationId);
          return !!annotation;
        },
        component: ({ data: _, ...inputProps }) => {
          const { label, readonly, type, getValue, onValueChange } = inputProps as any as FormFieldComponentProps;
          const handleChange = useCallback((nextIcon: string) => onValueChange(type, nextIcon), [onValueChange]);
          const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange]);
          return (
            <Input.Root>
              <Input.Label>{label}</Input.Label>
              <IconPicker
                disabled={!!readonly}
                value={getValue() ?? ''}
                onChange={handleChange}
                onReset={handleReset}
              />
            </Input.Root>
          );
        },
      }),
      Common.createSurface({
        id: `${meta.id}/typename-form-input`,
        role: 'form-input',
        filter: (
          data,
        ): data is {
          prop: string;
          schema: Schema.Schema.Any;
          target: Database.Database | Collection.Collection | undefined;
        } => {
          if (data.prop !== 'typename') {
            return false;
          }

          const annotation = findAnnotation((data.schema as Schema.Schema.All).ast, TypeInputOptionsAnnotationId);
          return !!annotation;
        },
        component: ({ data: { schema, target }, ...inputProps }) => {
          const props = inputProps as any as FormFieldComponentProps;
          const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
          const space = useSpace(db?.spaceId);
          const annotation = findAnnotation<TypeInputOptions>(schema.ast, TypeInputOptionsAnnotationId)!;
          const options = useTypeOptions({ space, annotation });

          return <SelectField {...props} options={options} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/object-settings`,
        role: 'object-settings',
        filter: (data): data is { subject: { view: Ref.Ref<View.View> } } => {
          if (!Obj.isObject(data.subject)) {
            return false;
          }

          const schema = Obj.getSchema(data.subject);
          return Option.fromNullable(schema).pipe(
            Option.flatMap((schema) => ViewAnnotation.get(schema)),
            Option.getOrElse(() => false),
          );
        },
        component: ({ data }) => {
          const view = data.subject.view.target;
          if (!view) {
            return null;
          }

          return <ViewEditor view={view} />;
        },
      }),
      Common.createSurface({
        id: SPACE_RENAME_POPOVER,
        role: 'popover',
        filter: (data): data is { props: Space } => data.component === SPACE_RENAME_POPOVER && isSpace(data.props),
        component: ({ data }) => <SpaceRenamePopover space={data.props} />,
      }),
      Common.createSurface({
        id: OBJECT_RENAME_POPOVER,
        role: 'popover',
        filter: (data): data is { props: Obj.Any } =>
          data.component === OBJECT_RENAME_POPOVER && Obj.isObject(data.props),
        component: ({ data }) => <ObjectRenamePopover object={data.props} />,
      }),
      Common.createSurface({
        id: `${meta.id}/menu-footer`,
        role: 'menu-footer',
        filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
        component: ({ data }) => <MenuFooter object={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/navtree-presence`,
        role: 'navtree-item-end',
        filter: (data): data is { id: string; subject: Obj.Any; open?: boolean } =>
          typeof data.id === 'string' && Obj.isObject(data.subject),
        component: ({ data }) => {
          const ephemeral = useAtomCapability(SpaceCapabilities.EphemeralState);
          return <SmallPresenceLive id={data.id} open={data.open} viewers={ephemeral.viewersByObject[data.id]} />;
        },
      }),
      // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
      Common.createSurface({
        id: `${meta.id}/navtree-presence-fallback`,
        role: 'navtree-item-end',
        position: 'fallback',
        filter: (data): data is { id: string; open?: boolean } => typeof data.id === 'string',
        component: ({ data }) => <SmallPresenceLive id={data.id} open={data.open} />,
      }),
      // TODO(wittjosiah): Broken?
      Common.createSurface({
        id: `${meta.id}/navtree-sync-status`,
        role: 'navtree-item-end',
        filter: (data): data is { subject: Space; open?: boolean } => isSpace(data.subject),
        component: ({ data }) => <InlineSyncStatus space={data.subject} open={data.open} />,
      }),
      Common.createSurface({
        id: `${meta.id}/navbar-presence`,
        role: 'navbar-end',
        position: 'hoist',
        filter: (data): data is { subject: Space | Obj.Any } => isSpace(data.subject) || Obj.isObject(data.subject),
        component: ({ data }) => {
          const space = isSpace(data.subject) ? data.subject : getSpace(data.subject);
          const object = isSpace(data.subject)
            ? data.subject.state.get() === SpaceState.SPACE_READY
              ? (space?.properties[Collection.Collection.typename]?.target as Collection.Collection)
              : undefined
            : data.subject;

          return object ? <SpacePresence object={object} /> : null;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/collection-section`,
        role: 'section',
        filter: (data): data is { subject: Collection.Collection } =>
          Obj.instanceOf(Collection.Collection, data.subject),
        component: ({ data }) => <CollectionSection subject={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/status`,
        role: 'status',
        component: () => <SyncStatus />,
      }),
    ]);
  }),
);
