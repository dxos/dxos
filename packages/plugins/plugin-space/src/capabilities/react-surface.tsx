//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { useCallback } from 'react';

import { Capabilities, contributes, createSurface, Surface, useCapability, useLayout } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { SettingsStore } from '@dxos/local-storage';
import {
  getSpace,
  isEchoObject,
  isLiveObject,
  isSpace,
  parseId,
  SpaceState,
  useSpace,
  type AnyLiveObject,
  type Space,
} from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { type InputProps } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { type JoinPanelProps } from '@dxos/shell/react';

import { SpaceCapabilities } from './capabilities';
import {
  CollectionMain,
  CollectionSection,
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  CreateObjectDialog,
  CreateSpaceDialog,
  InlineSyncStatus,
  JOIN_DIALOG,
  JoinDialog,
  MenuFooter,
  POPOVER_RENAME_OBJECT,
  POPOVER_RENAME_SPACE,
  PopoverRenameObject,
  PopoverRenameSpace,
  SmallPresenceLive,
  SpacePluginSettings,
  SpacePresence,
  SyncStatus,
  type CreateObjectDialogProps,
  MembersContainer,
  ObjectSettingsContainer,
  SpaceSettingsContainer,
  SchemaContainer,
} from '../components';
import { SPACE_PLUGIN } from '../meta';
import { CollectionType, HueAnnotationId, IconAnnotationId, type SpaceSettingsProps } from '../types';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default ({ createInvitationUrl }: ReactSurfaceOptions) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SPACE_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: Space } =>
        // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
        isSpace(data.subject) && data.subject.state.get() === SpaceState.SPACE_READY,
      component: ({ data, role, ...rest }) => (
        <Surface
          data={{ id: data.subject.id, subject: data.subject.properties[CollectionType.typename]?.target }}
          role={role}
          {...rest}
        />
      ),
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/collection-fallback`,
      role: 'article',
      position: 'fallback',
      filter: (data): data is { subject: CollectionType } => isInstanceOf(CollectionType, data.subject),
      component: ({ data }) => <CollectionMain collection={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SpaceSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === SPACE_PLUGIN,
      component: ({ data: { subject } }) => <SpacePluginSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/companion/object-settings`,
      role: 'article',
      filter: (data): data is { companionTo: AnyLiveObject<any> } =>
        isEchoObject(data.companionTo) && data.subject === 'settings',
      component: ({ data, role }) => <ObjectSettingsContainer object={data.companionTo} role={role} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/space-settings-properties`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${SPACE_PLUGIN}/properties`,
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
      id: `${SPACE_PLUGIN}/space-settings-members`,
      role: 'article',
      position: 'hoist',
      filter: (data): data is { subject: string } => data.subject === `${SPACE_PLUGIN}/members`,
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
      id: `${SPACE_PLUGIN}/space-settings-schema`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${SPACE_PLUGIN}/schema`,
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
      id: `${SPACE_PLUGIN}/create-initial-space-form-[hue]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: Schema.Schema<any> } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, HueAnnotationId);
        return !!annotation;
      },
      component: ({ data: _, ...inputProps }) => {
        const { label, disabled, type, getValue, onValueChange } = inputProps as any as InputProps;
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange]);
        return (
          <Input.Root>
            <Input.Label>{label}</Input.Label>
            <HuePicker disabled={disabled} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
          </Input.Root>
        );
      },
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/create-initial-space-form-[icon]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: Schema.Schema<any> } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, IconAnnotationId);
        return !!annotation;
      },
      component: ({ data: _, ...inputProps }) => {
        const { label, disabled, type, getValue, onValueChange } = inputProps as any as InputProps;
        const handleChange = useCallback((nextIcon: string) => onValueChange(type, nextIcon), [onValueChange]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange]);
        return (
          <Input.Root>
            <Input.Label>{label}</Input.Label>
            <IconPicker disabled={disabled} value={getValue() ?? ''} onChange={handleChange} onReset={handleReset} />
          </Input.Root>
        );
      },
    }),
    createSurface({
      id: POPOVER_RENAME_SPACE,
      role: 'popover',
      filter: (data): data is { props: Space } => data.component === POPOVER_RENAME_SPACE && isSpace(data.props),
      component: ({ data }) => <PopoverRenameSpace space={data.props} />,
    }),
    createSurface({
      id: POPOVER_RENAME_OBJECT,
      role: 'popover',
      filter: (data): data is { props: AnyLiveObject<any> } =>
        data.component === POPOVER_RENAME_OBJECT && isLiveObject(data.props),
      component: ({ data }) => <PopoverRenameObject object={data.props} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/menu-footer`,
      role: 'menu-footer',
      filter: (data): data is { subject: AnyLiveObject<any> } => isEchoObject(data.subject),
      component: ({ data }) => <MenuFooter object={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/navtree-presence`,
      role: 'navtree-item-end',
      filter: (data): data is { id: string; subject: AnyLiveObject<any>; open?: boolean } =>
        typeof data.id === 'string' && isEchoObject(data.subject),
      component: ({ data }) => {
        // TODO(wittjosiah): Doesn't need to be mutable but readonly type messes with ComplexMap.
        const state = useCapability(SpaceCapabilities.MutableState);
        return <SmallPresenceLive id={data.id} open={data.open} viewers={state.viewersByObject[data.id]} />;
      },
    }),
    // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
    createSurface({
      id: `${SPACE_PLUGIN}/navtree-presence-fallback`,
      role: 'navtree-item-end',
      position: 'fallback',
      filter: (data): data is { id: string; open?: boolean } => typeof data.id === 'string',
      component: ({ data }) => <SmallPresenceLive id={data.id} open={data.open} />,
    }),
    // TODO(wittjosiah): Broken?
    createSurface({
      id: `${SPACE_PLUGIN}/navtree-sync-status`,
      role: 'navtree-item-end',
      filter: (data): data is { subject: Space; open?: boolean } => isSpace(data.subject),
      component: ({ data }) => <InlineSyncStatus space={data.subject} open={data.open} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/navbar-presence`,
      role: 'navbar-end',
      position: 'hoist',
      filter: (data): data is { subject: Space | AnyLiveObject<any> } =>
        isSpace(data.subject) || isEchoObject(data.subject),
      component: ({ data }) => {
        const space = isSpace(data.subject) ? data.subject : getSpace(data.subject);
        const object = isSpace(data.subject)
          ? data.subject.state.get() === SpaceState.SPACE_READY
            ? (space?.properties[CollectionType.typename]?.target as CollectionType)
            : undefined
          : data.subject;

        return object ? <SpacePresence object={object} /> : null;
      },
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/collection-section`,
      role: 'section',
      filter: (data): data is { subject: CollectionType } => isInstanceOf(CollectionType, data.subject),
      component: ({ data }) => <CollectionSection collection={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/status`,
      role: 'status',
      component: () => <SyncStatus />,
    }),
  ]);
