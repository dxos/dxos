//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks or must
// render nothing until an ambient value (the active space, a backing view) resolves.

import * as Option from 'effect/Option';
import React, { type Ref } from 'react';

import { useAtomCapability, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppAnnotation, type AppCapabilities } from '@dxos/app-toolkit';
import { useActiveSpace, useHomeVisibility } from '@dxos/app-toolkit/ui';
import { Annotation, Obj, Type } from '@dxos/echo';
import { useType } from '@dxos/echo-react';
import { type Space, SpaceState, getSpace, isSpace, useSpaces } from '@dxos/react-client/echo';
import { ViewAnnotation, getTypeURIFromQuery } from '@dxos/schema';

import {
  MembersContainer,
  MergePreview,
  ObjectCardStack,
  SchemaContainer,
  SmallPresenceLive,
  SpaceHomeDashboard,
  SpaceHomeRecent,
  SpacePresence,
  SpaceSettings,
  SpaceSettingsContainer,
  TypeArticle,
  ViewEditor,
} from '#containers';
import { SpaceOperation } from '#operations';
import { type Settings, SpaceCapabilities } from '#types';

export type SpaceHomeSectionProps = {
  space: Space;
};

/** Home sections are individually dismissible per space, which is durable UI state. */
export const SpaceHomeRecentSurface = ({ space }: SpaceHomeSectionProps) => {
  const { visible, hide } = useHomeVisibility(space, 'spaceHomeRecent');

  return visible ? <SpaceHomeRecent space={space} onClose={hide} /> : null;
};

export const SpaceHomeDashboardSurface = ({ space }: SpaceHomeSectionProps) => {
  const { visible, hide } = useHomeVisibility(space, 'spaceHomeDashboard');

  return visible ? <SpaceHomeDashboard space={space} onClose={hide} /> : null;
};

export type TypeArticleSurfaceProps = {
  role: string;
  attendableId: string;
  type: Type.AnyEntity;
  /** The navtree node's properties bag, which carries the space for a type collection. */
  properties?: Record<string, unknown>;
};

export const TypeArticleSurface = ({ role, attendableId, type, properties }: TypeArticleSurfaceProps) => {
  const space = isSpace(properties?.space) ? properties.space : undefined;
  if (!space) {
    return null;
  }

  return <TypeArticle role={role} space={space} type={type} attendableId={attendableId} />;
};

export type SpaceSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
};

export const SpaceSettingsSurface = ({ subject }: SpaceSettingsSurfaceProps) => {
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
};

/** The space-settings articles are scoped to the active space rather than to a subject. */
export const SpaceSettingsPropertiesSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <SpaceSettingsContainer space={space} />;
};

export type SpaceMembersSurfaceProps = {
  createInvitationUrl: (invitationCode: string) => string;
};

export const SpaceMembersSurface = ({ createInvitationUrl }: SpaceMembersSurfaceProps) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <MembersContainer space={space} createInvitationUrl={createInvitationUrl} />;
};

export const SpaceSchemaSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <SchemaContainer space={space} />;
};

export type SelectedObjectsSurfaceProps = {
  companionTo: Type.AnyEntity | Obj.Unknown;
  ref?: Ref<HTMLDivElement>;
};

// TODO(burdon): Replace with mosaic.
export const SelectedObjectsSurface = ({ companionTo, ref }: SelectedObjectsSurfaceProps) => {
  const activeSpace = useActiveSpace();
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

  // A staged merge takes over the companion: the panel's job is to show what the user is
  // about to select, and during a review that is the proposed merged object, not the inputs.
  const { mergePreview } = useAtomCapability(SpaceCapabilities.EphemeralState);

  // Type/schema companion (e.g. a TypeArticle plank): the type IS the subject, no view lookup needed.
  if (isTypeCompanion) {
    if (!activeSpace) {
      return null;
    }

    if (mergePreview?.typeUri === Type.getURI(companionTo)) {
      return <MergePreview type={companionTo} spaceId={activeSpace.id} preview={mergePreview} ref={ref} />;
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
};

export type ViewEditorSurfaceProps = {
  subject: Obj.Unknown;
};

/** Resolves the view backing the object; the filter has already established that one exists. */
export const ViewEditorSurface = ({ subject }: ViewEditorSurfaceProps) => {
  const type = Obj.getType(subject);
  const path = type ? Option.getOrElse(ViewAnnotation.get(Type.getSchema(type)), () => [] as readonly string[]) : [];
  const view = path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(subject, path) : undefined;
  if (!view) {
    return null;
  }

  return <ViewEditor view={view} />;
};

export type NavtreePresenceSurfaceProps = {
  id: string;
  open?: boolean;
};

export const NavtreePresenceSurface = ({ id, open }: NavtreePresenceSurfaceProps) => {
  const ephemeral = useAtomCapability(SpaceCapabilities.EphemeralState);

  return <SmallPresenceLive id={id} open={open} viewers={ephemeral.viewersByObject[id]} />;
};

export type NavbarPresenceSurfaceProps = {
  subject: Space | Obj.Unknown;
};

/** For a space the presence target is its root collection; for an object it is the object itself. */
export const NavbarPresenceSurface = ({ subject }: NavbarPresenceSurfaceProps) => {
  const space = isSpace(subject) ? subject : getSpace(subject);
  const object = isSpace(subject)
    ? subject.state.get() === SpaceState.SPACE_READY
      ? space &&
        Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)?.target
      : undefined
    : subject;

  return object ? <SpacePresence object={object} /> : null;
};
