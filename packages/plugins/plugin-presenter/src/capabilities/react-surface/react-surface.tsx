//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';

import {
  CollectionPresenterContainer,
  DocumentPresenterContainer,
  MarkdownSlide,
  PresenterSettings,
} from '../../components';
import { meta } from '../../meta';
import { type PresenterSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/document`,
        role: 'article',
        position: 'hoist',
        filter: (data): data is { subject: { type: typeof meta.id; object: Markdown.Document } } =>
          !!data.subject &&
          typeof data.subject === 'object' &&
          'type' in data.subject &&
          'object' in data.subject &&
          data.subject.type === meta.id &&
          Obj.instanceOf(Markdown.Document, data.subject.object),
        component: ({ data }) => <DocumentPresenterContainer document={data.subject.object} />,
      }),
      Common.createSurface({
        id: `${meta.id}/collection`,
        role: 'article',
        position: 'hoist',
        filter: (data): data is { subject: { type: typeof meta.id; object: Collection.Collection } } =>
          !!data.subject &&
          typeof data.subject === 'object' &&
          'type' in data.subject &&
          'object' in data.subject &&
          data.subject.type === meta.id &&
          Obj.instanceOf(Collection.Collection, data.subject.object),
        component: ({ data }) => <CollectionPresenterContainer collection={data.subject.object} />,
      }),
      Common.createSurface({
        id: `${meta.id}/slide`,
        role: 'slide',
        filter: (data): data is { subject: Markdown.Document } => Obj.instanceOf(Markdown.Document, data.subject),
        component: ({ data }) => <MarkdownSlide document={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const registry = useCapability(Common.Capability.AtomRegistry);
          const settings = useAtomValue(subject.atom, { registry }) as PresenterSettingsProps;
          return <PresenterSettings settings={settings} />;
        },
      }),
    ]),
  ),
);
