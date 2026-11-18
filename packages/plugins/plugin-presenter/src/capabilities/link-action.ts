//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as LinkAction from '@dxos/app-toolkit/LinkAction';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Obj } from '@dxos/echo';

import { Presentation, PresenterOperation } from '#types';

export const present: LinkAction.LinkAction = {
  id: DXN.make('org.dxos.linkAction.presenter.present'),
  links: ['public'],
  appliesTo: (data) => Obj.instanceOf(Presentation.Presentation, data),
  run: (data) =>
    Obj.instanceOf(Presentation.Presentation, data)
      ? Operation.invoke(PresenterOperation.SetPresenting, { object: data, state: true })
      : Effect.void,
};

const linkAction = () => Effect.succeed([Capability.contribute(AppCapabilities.LinkAction, present)]);

export default linkAction;
