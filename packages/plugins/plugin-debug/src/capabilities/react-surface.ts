//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Space, isSpace } from '@dxos/react-client/echo';
import { Position } from '@dxos/util';

import { DebugStatus, LogStatus, StatsPanel, Wireframe } from '#containers';
import { meta } from '#meta';
import { DebugCapabilities, DebugNodes, DebugSurface } from '#types';

import {
  DebugSettingsSurface,
  LoggerSurface,
  ObjectDebugSurface,
  SpaceGeneratorSurface,
  SpaceObjectsSurface,
} from './DebugSurfaces';

type SpaceDebug = {
  type: string;
  space: Space;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data?.type === DebugNodes.SpaceType && isSpace(data.space);

type ReactSurfaceOptions = {
  logStore?: IdbLogStore;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ logStore }: ReactSurfaceOptions) {
    const capabilities = yield* Capability.Service;
    const registry = capabilities.get(Capabilities.AtomRegistry);
    const settingsAtom = capabilities.get(DebugCapabilities.Settings);
    const fileUploader = capabilities.getAll(AppCapabilities.FileUploader)[0];

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: DebugSettingsSurface,
        props: ({ data: { subject } }) => ({ subject, logStore, onUpload: fileUploader }),
      }),
      Surface.create({
        id: 'space',
        filter: AppSurface.subject(AppSurface.Article, isSpaceDebug),
        component: SpaceGeneratorSurface,
        props: ({ role, data: { subject } }) => ({ role, space: subject.space }),
      }),
      Surface.create({
        id: 'wireframe',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
          AppSurface.subject(AppSurface.Section, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
        ),
        position: Position.first,
        component: Wireframe,
        props: ({ role, name, data: { subject } }) => ({
          label: `${role}:${name}`,
          object: subject,
          classNames: 'row-span-2 overflow-hidden',
        }),
      }),
      Surface.create({
        id: 'objectDebug',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'debug'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ObjectDebugSurface,
        props: ({ role, data: { companionTo } }) => ({ role, companionTo }),
      }),
      Surface.create({
        id: 'spaceObjects',
        filter: Surface.makeFilter(AppSurface.deckCompanion('spaceObjects')),
        component: SpaceObjectsSurface,
      }),
      Surface.create({
        id: 'debugStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        position: Position.first,
        component: DebugStatus,
      }),
      Surface.create({
        id: 'logs',
        filter: Surface.makeFilter(AppSurface.deckCompanion('logs')),
        component: LoggerSurface,
      }),
      Surface.create({
        id: 'logStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: LogStatus,
      }),
      Surface.create({
        id: 'statsPanel',
        filter: Surface.makeFilter(DebugSurface.Stats),
        component: StatsPanel,
      }),
    ]);
  }),
);
