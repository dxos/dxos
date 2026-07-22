//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { type ComponentProps, useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppAnnotation } from '@dxos/app-toolkit';
import { AppSurface, useActiveSpace, useHomeVisibility, useTypeOptions } from '@dxos/app-toolkit/ui';
import { Annotation, Collection, Database, Obj, Type } from '@dxos/echo';
import { useType } from '@dxos/echo-react';
import { SchemaEx } from '@dxos/effect';
import { type Space, SpaceState, getSpace, isSpace, useSpaces } from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { ViewAnnotation, getTypeURIFromQuery } from '@dxos/schema';
import { Position } from '@dxos/util';

import {
  CollectionArticle,
  CollectionSection,
  CreateObjectDialog,
  CreateSpaceDialog,
  DefaultProperties,
  ImportSpaceDialog,
  InlineSyncStatus,
  JoinDialog,
  MembersContainer,
  ObjectCardStack,
  ObjectHistory,
  RecordArticle,
  RelatedArticle,
  RenamePopover,
  type RenameSubject,
  SchemaContainer,
  SmallPresenceLive,
  SpaceHomeArticle,
  SpaceHomeDashboard,
  SpaceHomeRecent,
  SpacePresence,
  SpaceSettings,
  SpaceSettingsContainer,
  SyncStatus,
  TypeArticle,
  ViewEditor,
} from '#containers';
import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import {
  HueAnnotationId,
  IconAnnotationId,
  Settings,
  SPACE_HOME_NODE_TYPE,
  SpaceCapabilities,
  SpaceHomeContent,
  type TypeInputOptions,
  TypeInputOptionsAnnotationId,
} from '#types';

import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  IMPORT_SPACE_DIALOG,
  JOIN_DIALOG,
  RENAME_POPOVER,
} from '../constants';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl }: ReactSurfaceOptions) {
    return Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'spaceHome',
        filter: AppSurface.literal(AppSurface.Article, SPACE_HOME_NODE_TYPE),
        component: ({ data, role }) => (
          <SpaceHomeArticle role={role} attendableId={data.attendableId} space={data.properties?.space} />
        ),
      }),
      Surface.create({
        id: 'spaceHomeRecent',
        filter: Surface.makeFilter(SpaceHomeContent),
        component: ({ data }) => {
          const { visible, hide } = useHomeVisibility(data.space, 'spaceHomeRecent');
          return visible ? <SpaceHomeRecent space={data.space} onClose={hide} /> : null;
        },
      }),
      Surface.create({
        id: 'spaceHomeDashboard',
        filter: Surface.makeFilter(SpaceHomeContent),
        component: ({ data }) => {
          const { visible, hide } = useHomeVisibility(data.space, 'spaceHomeDashboard');
          return visible ? <SpaceHomeDashboard space={data.space} onClose={hide} /> : null;
        },
      }),
      Surface.create({
        id: 'collectionFallback',
        position: Position.last,
        filter: AppSurface.object(AppSurface.Article, Collection.Collection),
        component: ({ data }) => <CollectionArticle attendableId={data.attendableId} subject={data.subject} />,
      }),
      Surface.create({
        id: 'recordArticle',
        position: Position.last,
        filter: AppSurface.subject(AppSurface.Article, Obj.isObject),
        component: ({ data }) => <RecordArticle subject={data.subject} />,
      }),
      Surface.create({
        id: 'typeCollection',
        filter: AppSurface.subject(AppSurface.Article, Type.isType),
        component: ({ data, role }) => {
          const space = isSpace(data.properties?.space) ? data.properties.space : undefined;
          if (!space) {
            return null;
          }

          return <TypeArticle role={role} space={space} type={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const spaces = useSpaces();
          const { invokePromise } = useOperationInvoker();
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return (
            <SpaceSettings
              spaces={spaces}
              onOpenSpaceSettings={(space: Space) => invokePromise(SpaceOperation.OpenSettings, { space })}
              settings={settings}
              onSettingsChange={updateSettings}
            />
          );
        },
      }),
      Surface.create({
        id: 'companion.objectProperties',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'settings'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ ref, data, role }) => <DefaultProperties role={role} subject={data.companionTo} ref={ref} />,
      }),
      Surface.create({
        id: 'companion.related',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'related'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data, role }) => <RelatedArticle role={role} companionTo={data.companionTo} />,
      }),
      Surface.create({
        id: 'companion.objectHistory',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'history'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data, role, ref }) => (
          <ObjectHistory role={role} attendableId={data.attendableId} subject={data.companionTo} ref={ref} />
        ),
      }),
      Surface.create({
        id: 'spaceSettingsProperties',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.general`),
        component: ({ ref }) => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <SpaceSettingsContainer space={space} />;
        },
      }),
      Surface.create({
        id: 'spaceSettingsMembers',
        position: Position.first,
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.members`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <MembersContainer space={space} createInvitationUrl={createInvitationUrl} />;
        },
      }),
      Surface.create({
        id: 'spaceSettingsSchema',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.schema`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <SchemaContainer space={space} />;
        },
      }),
      Surface.create({
        id: 'selectedObjects',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'selected-objects'),
          AppSurface.companion(
            AppSurface.Article,
            (value): value is Type.AnyEntity | Obj.Unknown => Type.isType(value) || Obj.isObject(value),
          ),
        ),
        // TODO(burdon): Replace with mosaic.
        component: ({ data, ref }) => {
          const activeSpace = useActiveSpace();
          const companionTo = data.companionTo;
          const isTypeCompanion = Type.isType(companionTo);

          // Object companion (e.g. a Table.Table): resolve its type via the view backing it.
          const objectType = !isTypeCompanion ? Obj.getType(companionTo) : undefined;
          const path = objectType
            ? Option.getOrElse(ViewAnnotation.get(Type.getSchema(objectType)), () => [] as readonly string[])
            : [];
          const view =
            !isTypeCompanion && path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(companionTo, path) : undefined;
          const viewDb = view ? Obj.getDatabase(view) : undefined;
          const viewTypeUri = view?.query ? getTypeURIFromQuery(view.query.ast) : undefined;
          const resolvedViewType = useType(viewDb, viewTypeUri);

          // Type/schema companion (e.g. a TypeArticle plank): the type IS the subject, no view lookup needed.
          if (isTypeCompanion) {
            if (!activeSpace) {
              return null;
            }

            return (
              <ObjectCardStack
                key={Type.getURI(companionTo)}
                objectId={Type.getURI(companionTo)}
                db={activeSpace.db}
                type={companionTo}
                ref={ref}
              />
            );
          }

          if (!view || !viewDb || !resolvedViewType) {
            return null;
          }

          return (
            <ObjectCardStack
              key={Obj.getURI(companionTo)}
              objectId={Obj.getURI(companionTo)}
              db={viewDb}
              type={resolvedViewType}
              ref={ref}
            />
          );
        },
      }),
      Surface.create({
        id: JOIN_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof JoinDialog>>(AppSurface.Dialog, JOIN_DIALOG),
        component: ({ data }) => <JoinDialog {...data.props} />,
      }),
      Surface.create({
        id: CREATE_SPACE_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, CREATE_SPACE_DIALOG),
        component: () => <CreateSpaceDialog />,
      }),
      Surface.create({
        id: IMPORT_SPACE_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, IMPORT_SPACE_DIALOG),
        component: () => <ImportSpaceDialog />,
      }),
      Surface.create({
        id: CREATE_OBJECT_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof CreateObjectDialog>>(
          AppSurface.Dialog,
          CREATE_OBJECT_DIALOG,
        ),
        component: ({ data }) => <CreateObjectDialog {...data.props} />,
      }),
      Surface.create({
        id: 'createInitialSpaceFormHue',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, HueAnnotationId)),
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const { label, readonly, getValue, onValueChange } = inputProps as any as FormFieldRendererProps;
          const handleChange = useCallback((nextHue: string) => onValueChange(ast, nextHue), [ast, onValueChange]);
          const handleReset = useCallback(() => onValueChange(ast, undefined), [ast, onValueChange]);
          return (
            <Input.Root>
              <Input.Label>{label}</Input.Label>
              <HuePicker disabled={!!readonly} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
            </Input.Root>
          );
        },
      }),
      Surface.create({
        id: 'createInitialSpaceFormIcon',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, IconAnnotationId)),
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const { label, readonly, getValue, onValueChange } = inputProps as any as FormFieldRendererProps;
          const handleChange = useCallback((nextIcon: string) => onValueChange(ast, nextIcon), [ast, onValueChange]);
          const handleReset = useCallback(() => onValueChange(ast, undefined), [ast, onValueChange]);
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
      Surface.create({
        id: 'typenameFormInput',
        filter: AppSurface.formInput(
          (data) =>
            data.prop === 'typename' && !!SchemaEx.findAnnotation(data.schema.ast, TypeInputOptionsAnnotationId),
        ),
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldRendererProps;
          const target = data.target;
          const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
          const annotation = SchemaEx.findAnnotation<TypeInputOptions>(data.schema.ast, TypeInputOptionsAnnotationId)!;
          const options = useTypeOptions({ db, annotation });

          return <SelectField {...props} options={options} />;
        },
      }),
      Surface.create({
        id: 'objectProperties',
        filter: Surface.makeFilter(AppSurface.ObjectProperties, (data) => {
          if (!Obj.isObject(data.subject)) {
            return false;
          }
          const type = Obj.getType(data.subject);
          const path = type
            ? Option.getOrElse(ViewAnnotation.get(Type.getSchema(type)), () => [] as readonly string[])
            : [];
          const viewTarget = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(data.subject, path) : undefined;
          return !!viewTarget;
        }),
        component: ({ data }) => {
          const type = Obj.getType(data.subject);
          const path = type
            ? Option.getOrElse(ViewAnnotation.get(Type.getSchema(type)), () => [] as readonly string[])
            : [];
          const view = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(data.subject, path) : undefined;
          if (!view) {
            return null;
          }

          return <ViewEditor view={view} />;
        },
      }),
      Surface.create({
        id: RENAME_POPOVER,
        filter: AppSurface.component<RenameSubject>(AppSurface.Popover, RENAME_POPOVER),
        component: ({ data }) => <RenamePopover subject={data.props} />,
      }),
      Surface.create({
        id: 'navtreePresence',
        filter: AppSurface.subject(AppSurface.NavtreeItemEnd, Obj.isObject),
        component: ({ data }) => {
          const ephemeral = useAtomCapability(SpaceCapabilities.EphemeralState);
          return <SmallPresenceLive id={data.id} open={data.open} viewers={ephemeral.viewersByObject[data.id]} />;
        },
      }),
      // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
      Surface.create({
        id: 'navtreePresenceFallback',
        position: Position.last,
        filter: Surface.makeFilter(AppSurface.NavtreeItemEnd),
        component: ({ data }) => <SmallPresenceLive id={data.id} open={data.open} />,
      }),
      // TODO(wittjosiah): Broken?
      Surface.create({
        id: 'navtreeSyncStatus',
        filter: AppSurface.subject(AppSurface.NavtreeItemEnd, isSpace),
        component: ({ data }) => <InlineSyncStatus space={data.subject} open={data.open} />,
      }),
      Surface.create({
        id: 'navbarPresence',
        position: Position.first,
        filter: AppSurface.subject(
          AppSurface.NavbarEnd,
          (value): value is Space | Obj.Unknown => isSpace(value) || Obj.isObject(value),
        ),
        component: ({ data }) => {
          const space = isSpace(data.subject) ? data.subject : getSpace(data.subject);
          const object = isSpace(data.subject)
            ? data.subject.state.get() === SpaceState.SPACE_READY
              ? space &&
                Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)
                  ?.target
              : undefined
            : data.subject;

          return object ? <SpacePresence object={object} /> : null;
        },
      }),
      Surface.create({
        id: 'collectionSection',
        filter: AppSurface.object(AppSurface.Section, Collection.Collection),
        component: ({ data }) => <CollectionSection subject={data.subject} />,
      }),
      Surface.create({
        id: 'syncStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <SyncStatus />,
      }),
    ]);
  }),
);
