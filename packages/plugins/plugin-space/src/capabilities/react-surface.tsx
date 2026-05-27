//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type ComponentProps, useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace, useTypeOptions } from '@dxos/app-toolkit/ui';
import { Collection, Database, Obj } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type Space, SpaceState, getSpace, isSpace, useSpaces } from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { type FormFieldComponentProps, SelectField } from '@dxos/react-ui-form';
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
  ObjectCardStack,
  ObjectProperties,
  ObjectRenamePopover,
  RecordArticle,
  RelatedArticle,
  SchemaContainer,
  SmallPresenceLive,
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
  type Settings,
  type TypeInputOptions,
  TypeInputOptionsAnnotationId,
} from '#types';

import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  IMPORT_SPACE_DIALOG,
  JOIN_DIALOG,
  OBJECT_RENAME_POPOVER,
  SPACE_RENAME_POPOVER,
} from '../constants';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl }: ReactSurfaceOptions) {
    return Capability.contributes(Capabilities.ReactSurface, [
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
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          const spaces = useSpaces({ all: settings.showHidden });
          const { invokePromise } = useOperationInvoker();
          return (
            <SpaceSettings
              settings={settings}
              onSettingsChange={updateSettings}
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
        role: 'article',
        filter: (data): data is { companionTo: Obj.Unknown; subject: 'selected-objects' } => {
          if (data.subject !== 'selected-objects' || !Obj.isObject(data.companionTo)) {
            return false;
          }

          const schema = Obj.getSchema(data.companionTo);
          const path = schema ? Option.getOrElse(ViewAnnotation.get(schema), () => [] as readonly string[]) : [];
          const viewTarget = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(data.companionTo, path) : undefined;
          return !!viewTarget;
        },
        // TODO(burdon): Replace with mosaic.
        component: ({ data, ref }) => {
          const schema = Obj.getSchema(data.companionTo);
          const path = schema ? Option.getOrElse(ViewAnnotation.get(schema), () => [] as readonly string[]) : [];
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
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema<any>; fieldPropertyAst?: SchemaAST.AST } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, HueAnnotationId);
          return !!annotation;
        },
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const { label, readonly, getValue, onValueChange } = inputProps as any as FormFieldComponentProps;
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
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema<any>; fieldPropertyAst?: SchemaAST.AST } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, IconAnnotationId);
          return !!annotation;
        },
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const { label, readonly, getValue, onValueChange } = inputProps as any as FormFieldComponentProps;
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
        role: 'form-input',
        filter: (
          data,
        ): data is {
          prop: string;
          schema: Schema.Schema.Any;
          target: Database.Database | Collection.Collection | undefined;
          fieldPropertyAst?: SchemaAST.AST;
        } => {
          if (data.prop !== 'typename') {
            return false;
          }

          const annotation = findAnnotation((data.schema as Schema.Schema.All).ast, TypeInputOptionsAnnotationId);
          return !!annotation;
        },
        component: ({ data: { schema, target, fieldPropertyAst }, ...inputProps }) => {
          const ast = fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldComponentProps;
          const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
          const annotation = findAnnotation<TypeInputOptions>(schema.ast, TypeInputOptionsAnnotationId)!;
          const options = useTypeOptions({ db, annotation });

          return <SelectField {...props} options={options} />;
        },
      }),
      Surface.create({
        id: 'objectProperties',
        role: 'object-properties',
        filter: (data): data is { subject: Obj.Unknown } => {
          if (!Obj.isObject(data.subject)) {
            return false;
          }

          const schema = Obj.getSchema(data.subject);
          const path = schema ? Option.getOrElse(ViewAnnotation.get(schema), () => [] as readonly string[]) : [];
          const viewTarget = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(data.subject, path) : undefined;
          return !!viewTarget;
        },
        component: ({ data }) => {
          const schema = Obj.getSchema(data.subject);
          const path = schema ? Option.getOrElse(ViewAnnotation.get(schema), () => [] as readonly string[]) : [];
          const view = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(data.subject, path) : undefined;

          if (!view) {
            return null;
          }

          return <ViewEditor view={view} />;
        },
      }),
      Surface.create({
        id: SPACE_RENAME_POPOVER,
        role: 'popover',
        filter: (data): data is { props: Space } => data.component === SPACE_RENAME_POPOVER && isSpace(data.props),
        component: ({ data }) => <SpaceRenamePopover space={data.props} />,
      }),
      Surface.create({
        id: OBJECT_RENAME_POPOVER,
        role: 'popover',
        filter: (data): data is { props: Obj.Unknown } =>
          data.component === OBJECT_RENAME_POPOVER && Obj.isObject(data.props),
        component: ({ data }) => <ObjectRenamePopover object={data.props} />,
      }),
      Surface.create({
        id: 'menuFooter',
        filter: AppSurface.subject(AppSurface.MenuFooter, Obj.isObject),
        component: ({ data }) => <MenuFooter object={data.subject} />,
      }),
      Surface.create({
        id: 'navtreePresence',
        role: 'navtree-item-end',
        filter: (data): data is { id: string; subject: Obj.Unknown; open?: boolean } =>
          typeof data.id === 'string' && Obj.isObject(data.subject),
        component: ({ data }) => {
          const ephemeral = useAtomCapability(SpaceCapabilities.EphemeralState);
          return <SmallPresenceLive id={data.id} open={data.open} viewers={ephemeral.viewersByObject[data.id]} />;
        },
      }),
      // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
      Surface.create({
        id: 'navtreePresenceFallback',
        role: 'navtree-item-end',
        position: 'last',
        filter: (data): data is { id: string; open?: boolean } => typeof data.id === 'string',
        component: ({ data }) => <SmallPresenceLive id={data.id} open={data.open} />,
      }),
      // TODO(wittjosiah): Broken?
      Surface.create({
        id: 'navtreeSyncStatus',
        role: 'navtree-item-end',
        filter: (data): data is { subject: Space; open?: boolean } => isSpace(data.subject),
        component: ({ data }) => <InlineSyncStatus space={data.subject} open={data.open} />,
      }),
      Surface.create({
        id: 'navbarPresence',
        role: 'navbar-end',
        position: 'first',
        filter: (data): data is { subject: Space | Obj.Unknown } => isSpace(data.subject) || Obj.isObject(data.subject),
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
      Surface.create({
        id: 'collectionSection',
        filter: AppSurface.object(AppSurface.Section, Collection.Collection),
        component: ({ data }) => <CollectionSection subject={data.subject} />,
      }),
      Surface.create({
        id: 'status',
        role: 'status-indicator',
        component: () => <SyncStatus />,
      }),
    ]);
  }),
);
