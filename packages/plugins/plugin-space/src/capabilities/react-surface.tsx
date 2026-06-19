//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { type ComponentProps, useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppAnnotation } from '@dxos/app-toolkit';
import { AppSurface, useActiveSpace, useTypeOptions } from '@dxos/app-toolkit/ui';
import { Annotation, Collection, Database, Entity, Obj, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { type Space, SpaceState, getSpace, isSpace, useSpaces } from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { ViewAnnotation } from '@dxos/schema';

import { SpaceSettings } from '#components';
import {
  CollectionArticle,
  CollectionSection,
  CreateObjectDialog,
  CreateSpaceDialog,
  ImportSpaceDialog,
  InlineSyncStatus,
  JoinDialog,
  MembersContainer,
  MenuFooter,
  EntityRenamePopover,
  ObjectCardStack,
  ObjectProperties,
  RecordArticle,
  RelatedArticle,
  SchemaContainer,
  SmallPresenceLive,
  SpaceHomeArticle,
  SpaceHomeRecent,
  SpacePresence,
  SpaceRenamePopover,
  SpaceSettingsContainer,
  SyncStatus,
  ViewEditor,
} from '#containers';
import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import {
  HueAnnotationId,
  IconAnnotationId,
  SpaceCapabilities,
  SpaceHomeContent,
  SPACE_HOME_NODE_TYPE,
  type TypeInputOptions,
  TypeInputOptionsAnnotationId,
} from '#types';

import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  IMPORT_SPACE_DIALOG,
  JOIN_DIALOG,
  ENTITY_RENAME_POPOVER,
  SPACE_RENAME_POPOVER,
} from '../constants';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl }: ReactSurfaceOptions) {
    return Capability.contributes(Capabilities.ReactSurface, [
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
        component: ({ data }) => <SpaceHomeRecent space={data.space} />,
      }),
      Surface.create({
        id: 'collectionFallback',
        position: 'last',
        filter: AppSurface.object(AppSurface.Article, Collection.Collection),
        component: ({ data }) => <CollectionArticle attendableId={data.attendableId} subject={data.subject} />,
      }),
      Surface.create({
        id: 'recordArticle',
        position: 'last',
        filter: AppSurface.subject(AppSurface.Article, Obj.isObject),
        component: ({ data }) => <RecordArticle subject={data.subject} />,
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: () => {
          const spaces = useSpaces();
          const { invokePromise } = useOperationInvoker();
          return (
            <SpaceSettings
              spaces={spaces}
              onOpenSpaceSettings={(space: Space) => invokePromise(SpaceOperation.OpenSettings, { space })}
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
        component: ({ ref, data, role }) => <ObjectProperties role={role} subject={data.companionTo} ref={ref} />,
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
        id: 'spaceSettingsProperties',
        filter: AppSurface.literal(AppSurface.Article, `${meta.id}.general`),
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
        position: 'first',
        filter: AppSurface.literal(AppSurface.Article, `${meta.id}.members`),
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
        filter: AppSurface.literal(AppSurface.Article, `${meta.id}.schema`),
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
          AppSurface.companion(AppSurface.Article, Obj.isObject),
        ),
        // TODO(burdon): Replace with mosaic.
        component: ({ data, ref }) => {
          const type = Obj.getType(data.companionTo);
          const path = type
            ? Option.getOrElse(ViewAnnotation.get(Type.getSchema(type)), () => [] as readonly string[])
            : [];
          const view = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(data.companionTo, path) : undefined;
          if (!view) {
            return null;
          }

          return (
            <ObjectCardStack
              key={Obj.getURI(data.companionTo)}
              objectId={Obj.getURI(data.companionTo)}
              view={view}
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
        id: SPACE_RENAME_POPOVER,
        filter: AppSurface.component<Space>(AppSurface.Popover, SPACE_RENAME_POPOVER),
        component: ({ data }) => <SpaceRenamePopover space={data.props} />,
      }),
      Surface.create({
        id: ENTITY_RENAME_POPOVER,
        filter: AppSurface.component<Entity.Unknown>(AppSurface.Popover, ENTITY_RENAME_POPOVER),
        component: ({ data }) => <EntityRenamePopover entity={data.props} />,
      }),
      Surface.create({
        id: 'menuFooter',
        filter: AppSurface.subject(AppSurface.MenuFooter, Obj.isObject),
        component: ({ data }) => <MenuFooter object={data.subject} />,
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
        position: 'last',
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
        position: 'first',
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
