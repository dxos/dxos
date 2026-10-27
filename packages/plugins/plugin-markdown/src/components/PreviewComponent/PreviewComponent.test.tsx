//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import React from 'react';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { createTestApp } from '@dxos/app-framework/testing';
import { render } from '@dxos/app-framework/testing/react';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { fromHost } from '@dxos/client/local';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

import { PreviewComponent } from './PreviewComponent.tsx';

const SectionPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.previewSection'), name: 'PreviewSectionTest' }),
).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({
            id: 'section',
            filter: AppSurface.object(AppSurface.Section, Markdown.Document),
            component: ({ data: { subject } }) => (
              <span data-testid='section'>{Obj.isSnapshot(subject) ? 'snapshot' : 'live'}</span>
            ),
          }),
        ]),
      ]),
  }),
  Plugin.make,
);

describe('PreviewComponent', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([Markdown.Document, Text.Text]);
    space = await client.spaces.create();
  });

  afterEach(async () => {
    await client.destroy();
  });

  test('a section embed receives the live object', async ({ expect }) => {
    const doc = space.db.add(Markdown.make({ name: 'embedded', content: 'hello' }));
    await space.db.flush({ indexes: true });

    await using harness = await createTestApp({ plugins: [SectionPlugin()] });
    const view = render(
      harness,
      <PreviewComponent
        _tag='image'
        range={{ from: 0, to: 0 }}
        id='embed'
        db={space.db}
        eid={`echo:/${doc.id}`}
        label='embedded'
      />,
    );
    expect((await view.findByTestId('section')).textContent).toBe('live');
    view.unmount();
  });
});
