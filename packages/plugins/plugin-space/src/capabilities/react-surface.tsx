//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { createSurface } from '@dxos/app-framework';
import {
  contributes,
  Capabilities,
  Surface,
  useCapability,
  useCapabilities,
  usePluginManager,
} from '@dxos/app-framework/next';
import { ClientCapabilities } from '@dxos/plugin-client';
import {
  getSpace,
  isEchoObject,
  isReactiveObject,
  isSpace,
  SpaceState,
  type ReactiveEchoObject,
  type Space,
} from '@dxos/react-client/echo';
import { type JoinPanelProps } from '@dxos/shell/react';

import { SpaceCapabilities } from './capabilities';
import {
  CollectionMain,
  CollectionSection,
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  CreateObjectDialog,
  CreateSpaceDialog,
  DefaultObjectSettings,
  InlineSyncStatus,
  JOIN_DIALOG,
  JoinDialog,
  MenuFooter,
  POPOVER_RENAME_OBJECT,
  POPOVER_RENAME_SPACE,
  PopoverRenameObject,
  PopoverRenameSpace,
  ShareSpaceButton,
  SmallPresenceLive,
  SPACE_SETTINGS_DIALOG,
  SpacePluginSettings,
  SpacePresence,
  SpaceSettingsDialog,
  SpaceSettingsPanel,
  SyncStatus,
  type CreateObjectDialogProps,
  type SpaceSettingsDialogProps,
} from '../components';
import { SPACE_PLUGIN } from '../meta';
import { CollectionType, type SpaceSettingsProps } from '../types';
import { COMPOSER_SPACE_LOCK } from '../util';

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
      disposition: 'fallback',
      filter: (data): data is { subject: CollectionType } => data.subject instanceof CollectionType,
      component: ({ data }) => <CollectionMain collection={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/settings-panel`,
      // TODO(burdon): Add role name syntax to minimal plugin docs.
      role: 'complementary--settings',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data }) => <SpaceSettingsPanel space={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/object-settings-panel-fallback`,
      role: 'complementary--settings',
      disposition: 'fallback',
      filter: (data): data is { subject: ReactiveEchoObject<any> } => isEchoObject(data.subject),
      component: ({ data }) => <DefaultObjectSettings object={data.subject} />,
    }),
    createSurface({
      id: SPACE_SETTINGS_DIALOG,
      role: 'dialog',
      filter: (data): data is { subject: SpaceSettingsDialogProps } => data.component === SPACE_SETTINGS_DIALOG,
      component: ({ data }) => <SpaceSettingsDialog {...data.subject} createInvitationUrl={createInvitationUrl} />,
    }),
    createSurface({
      id: JOIN_DIALOG,
      role: 'dialog',
      filter: (data): data is { subject: JoinPanelProps } => data.component === JOIN_DIALOG,
      component: ({ data }) => <JoinDialog {...data.subject} />,
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
      filter: (data): data is { subject: Partial<CreateObjectDialogProps> } => data.component === CREATE_OBJECT_DIALOG,
      component: ({ data }) => {
        const schemas = useCapabilities(ClientCapabilities.Schema).flat();
        const manager = usePluginManager();

        const resolve = useCallback(
          (typename: string) => {
            return (
              manager.context.requestCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ??
              {}
            );
          },
          [manager],
        );

        return <CreateObjectDialog schemas={schemas} resolve={resolve} {...data.subject} />;
      },
    }),
    createSurface({
      id: POPOVER_RENAME_SPACE,
      role: 'popover',
      filter: (data): data is { subject: Space } => data.component === POPOVER_RENAME_SPACE && isSpace(data.subject),
      component: ({ data }) => <PopoverRenameSpace space={data.subject} />,
    }),
    createSurface({
      id: POPOVER_RENAME_OBJECT,
      role: 'popover',
      filter: (data): data is { subject: ReactiveEchoObject<any> } =>
        data.component === POPOVER_RENAME_OBJECT && isReactiveObject(data.subject),
      component: ({ data }) => <PopoverRenameObject object={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/navtree-presence`,
      role: 'navtree-item-end',
      filter: (data): data is { id: string; subject: ReactiveEchoObject<any>; open?: boolean } =>
        typeof data.id === 'string' && isEchoObject(data.subject),
      component: ({ data }) => {
        // TODO(wittjosiah): Doesn't need to be mutable but readonly type messes with ComplexMap.
        const state = useCapability(SpaceCapabilities.MutableState);
        return <SmallPresenceLive id={data.id} open={data.open} viewers={state.viewersByObject[data.id]} />;
      },
    }),
    createSurface({
      // TODO(wittjosiah): Attention glyph for non-echo items should be handled elsewhere.
      id: `${SPACE_PLUGIN}/navtree-presence-fallback`,
      role: 'navtree-item-end',
      disposition: 'fallback',
      filter: (data): data is { id: string; open?: boolean } => typeof data.id === 'string',
      component: ({ data }) => <SmallPresenceLive id={data.id} open={data.open} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/navtree-sync-status`,
      role: 'navtree-item-end',
      filter: (data): data is { subject: Space; open?: boolean } => isSpace(data.subject),
      component: ({ data }) => <InlineSyncStatus space={data.subject} open={data.open} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/navbar-presence`,
      role: 'navbar-end',
      disposition: 'hoist',
      filter: (data): data is { subject: Space | ReactiveEchoObject<any> } =>
        isSpace(data.subject) || isEchoObject(data.subject),
      component: ({ data }) => {
        const space = isSpace(data.subject) ? data.subject : getSpace(data.subject);
        const object = isSpace(data.subject)
          ? data.subject.state.get() === SpaceState.SPACE_READY
            ? (space?.properties[CollectionType.typename]?.target as CollectionType)
            : undefined
          : data.subject;

        return space && object ? (
          <>
            <SpacePresence object={object} />
            {space.properties[COMPOSER_SPACE_LOCK] ? null : <ShareSpaceButton space={space} />}
          </>
        ) : null;
      },
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/collection-section`,
      role: 'section',
      filter: (data): data is { subject: CollectionType } => data.subject instanceof CollectionType,
      component: ({ data }) => <CollectionSection collection={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === SPACE_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SpaceSettingsProps>(SPACE_PLUGIN)!.value;
        return <SpacePluginSettings settings={settings} />;
      },
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/menu-footer`,
      role: 'menu-footer',
      filter: (data): data is { subject: ReactiveEchoObject<any> } => isEchoObject(data.subject),
      component: ({ data }) => <MenuFooter object={data.subject} />,
    }),
    createSurface({
      id: `${SPACE_PLUGIN}/status`,
      role: 'status',
      component: () => <SyncStatus />,
    }),
  ]);
