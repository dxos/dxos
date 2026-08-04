//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { type ComponentProps } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Obj, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { type Space, isSpace } from '@dxos/react-client/echo';
import { ViewAnnotation } from '@dxos/schema';
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
  RecordArticle,
  RelatedArticle,
  RenamePopover,
  type RenameSubject,
  SmallPresenceLive,
  SpaceHomeArticle,
  SyncStatus,
} from '#containers';
import { meta } from '#meta';
import {
  HueAnnotationId,
  IconAnnotationId,
  SPACE_HOME_NODE_TYPE,
  SpaceHomeContent,
  TypeInputOptionsAnnotationId,
} from '#types';

import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  IMPORT_SPACE_DIALOG,
  JOIN_DIALOG,
  RENAME_POPOVER,
} from '../constants';
import { HueField, IconField, TypenameField } from './SpaceFormFields';
import {
  NavbarPresenceSurface,
  NavtreePresenceSurface,
  SelectedObjectsSurface,
  SpaceHomeDashboardSurface,
  SpaceHomeRecentSurface,
  SpaceMembersSurface,
  SpaceSchemaSurface,
  SpaceSettingsPropertiesSurface,
  SpaceSettingsSurface,
  TypeArticleSurface,
  ViewEditorSurface,
} from './SpaceSurfaces';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl }: ReactSurfaceOptions) {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'spaceHome',
        filter: AppSurface.literal(AppSurface.Article, SPACE_HOME_NODE_TYPE),
        component: SpaceHomeArticle,
        props: ({ role, data: { attendableId, properties } }) => ({
          role,
          attendableId,
          space: properties?.space,
        }),
      }),
      Surface.create({
        id: 'spaceHomeRecent',
        filter: Surface.makeFilter(SpaceHomeContent),
        component: SpaceHomeRecentSurface,
        props: ({ data: { space } }) => ({ space }),
      }),
      Surface.create({
        id: 'spaceHomeDashboard',
        filter: Surface.makeFilter(SpaceHomeContent),
        component: SpaceHomeDashboardSurface,
        props: ({ data: { space } }) => ({ space }),
      }),
      Surface.create({
        id: 'collectionFallback',
        position: Position.last,
        filter: AppSurface.object(AppSurface.Article, Collection.Collection),
        component: CollectionArticle,
        props: ({ data: { subject, attendableId } }) => ({ subject, attendableId }),
      }),
      Surface.create({
        id: 'recordArticle',
        position: Position.last,
        filter: AppSurface.subject(AppSurface.Article, Obj.isObject),
        component: RecordArticle,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'typeCollection',
        filter: AppSurface.subject(AppSurface.Article, Type.isType),
        component: TypeArticleSurface,
        props: ({ role, data: { subject, attendableId, properties } }) => ({
          role,
          type: subject,
          attendableId,
          properties,
        }),
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: SpaceSettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'companion.objectProperties',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'settings'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: DefaultProperties,
        props: ({ role, ref, data: { companionTo } }) => ({ role, subject: companionTo, ref }),
      }),
      Surface.create({
        id: 'companion.related',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'related'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: RelatedArticle,
        props: ({ role, data: { companionTo } }) => ({ role, companionTo }),
      }),
      Surface.create({
        id: 'spaceSettingsProperties',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.general`),
        component: SpaceSettingsPropertiesSurface,
      }),
      Surface.create({
        id: 'spaceSettingsMembers',
        position: Position.first,
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.members`),
        component: SpaceMembersSurface,
        props: () => ({ createInvitationUrl }),
      }),
      Surface.create({
        id: 'spaceSettingsSchema',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.schema`),
        component: SpaceSchemaSurface,
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
        component: SelectedObjectsSurface,
        props: ({ ref, data: { companionTo } }) => ({ companionTo, ref }),
      }),
      Surface.create({
        id: JOIN_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof JoinDialog>>(AppSurface.Dialog, JOIN_DIALOG),
        component: JoinDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: CREATE_SPACE_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, CREATE_SPACE_DIALOG),
        component: CreateSpaceDialog,
      }),
      Surface.create({
        id: IMPORT_SPACE_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, IMPORT_SPACE_DIALOG),
        component: ImportSpaceDialog,
      }),
      Surface.create({
        id: CREATE_OBJECT_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof CreateObjectDialog>>(
          AppSurface.Dialog,
          CREATE_OBJECT_DIALOG,
        ),
        component: CreateObjectDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: 'createInitialSpaceFormHue',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, HueAnnotationId)),
        component: HueField,
      }),
      Surface.create({
        id: 'createInitialSpaceFormIcon',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, IconAnnotationId)),
        component: IconField,
      }),
      Surface.create({
        id: 'typenameFormInput',
        filter: AppSurface.formInput(
          (data) =>
            data.prop === 'typename' && !!SchemaEx.findAnnotation(data.schema.ast, TypeInputOptionsAnnotationId),
        ),
        component: TypenameField,
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
        component: ViewEditorSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: RENAME_POPOVER,
        filter: AppSurface.component<RenameSubject>(AppSurface.Popover, RENAME_POPOVER),
        component: RenamePopover,
        props: ({ data: { props } }) => ({ subject: props }),
      }),
      Surface.create({
        id: 'navtreePresence',
        filter: AppSurface.subject(AppSurface.NavtreeItemEnd, Obj.isObject),
        component: NavtreePresenceSurface,
        props: ({ data: { id, open } }) => ({ id, open }),
      }),
      // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
      Surface.create({
        id: 'navtreePresenceFallback',
        position: Position.last,
        filter: Surface.makeFilter(AppSurface.NavtreeItemEnd),
        component: SmallPresenceLive,
        props: ({ data: { id, open } }) => ({ id, open }),
      }),
      // TODO(wittjosiah): Broken?
      Surface.create({
        id: 'navtreeSyncStatus',
        filter: AppSurface.subject(AppSurface.NavtreeItemEnd, isSpace),
        component: InlineSyncStatus,
        props: ({ data: { subject, open } }) => ({ space: subject, open }),
      }),
      Surface.create({
        id: 'navbarPresence',
        position: Position.first,
        filter: AppSurface.subject(
          AppSurface.NavbarEnd,
          (value): value is Space | Obj.Unknown => isSpace(value) || Obj.isObject(value),
        ),
        component: NavbarPresenceSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'collectionSection',
        filter: AppSurface.object(AppSurface.Section, Collection.Collection),
        component: CollectionSection,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'syncStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: SyncStatus,
      }),
    ]);
  }),
);
