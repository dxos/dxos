//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { Position } from '@dxos/util';

import { DebugPanelDrawer, DebugPanelStatus, DebugStatus, LoggerPanel, StatsPanel, Wireframe } from '#containers';
import { meta } from '#meta';
import { DebugNodes, DebugSurface } from '#types';

import { DebugCapabilities } from '../types/Debug.ts';
import {
  DebugConsoleArticle,
  DebugSettingsSurface,
  ObjectDebugSurface,
  SpaceGeneratorSurface,
  SpaceObjectsSurface,
} from './DebugSurfaces.tsx';

type ReactSurfaceOptions = {
  logStore?: IdbLogStore;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ logStore }: ReactSurfaceOptions) {
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* DebugCapabilities.Settings;
    const fileUploader = (yield* Capability.getAll(AppCapabilities.FileUploader))[0];

    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: DebugSettingsSurface,
        props: ({ data: { subject } }) => ({ subject, logStore, onUpload: fileUploader }),
      }),
      Surface.create({
        id: 'space',
        filter: AppSurface.literal(DebugSurface.Page, DebugNodes.SpaceType),
        component: SpaceGeneratorSurface,
        props: ({ role }) => ({ role }),
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
        id: 'console',
        filter: AppSurface.literal(DebugSurface.Page, DebugNodes.Console),
        component: DebugConsoleArticle,
      }),
      Surface.create({
        id: 'logsArticle',
        filter: AppSurface.literal(DebugSurface.Page, DebugNodes.Logs),
        component: LoggerPanel,
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
        id: 'debugPanelStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: DebugPanelStatus,
      }),
      Surface.create({
        id: 'debugDrawer',
        filter: Surface.makeFilter(AppSurface.Drawer),
        component: DebugPanelDrawer,
      }),
      Surface.create({
        id: 'statsPanel',
        filter: Surface.makeFilter(DebugSurface.Stats),
        component: StatsPanel,
      }),
      Surface.create({
        id: 'statsCards',
        filter: Surface.makeFilter(AppSurface.DevtoolsOverview),
        // After the devtools cards (0–12) and before contributors that sit last.
        position: 20,
        component: StatsPanel,
        props: () => ({ showEmpty: false }),
      }),
    ]);
  }),
);
