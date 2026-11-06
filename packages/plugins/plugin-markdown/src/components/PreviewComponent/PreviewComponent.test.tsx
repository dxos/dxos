//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';
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
import { RootAttentionProvider } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';
import { objectEmbedFocus } from '@dxos/ui-editor';

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

/**
 * A section whose field mounts a while after the section, as one from a module still loading does, and gets its text
 * a microtask after it mounts, as a field bound to a document does.
 */
const LateSection = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timeout);
  }, []);
  return ready ? (
    <input data-testid='field' ref={(input) => void (input && queueMicrotask(() => (input.value = 'New feature')))} />
  ) : null;
};

const LateSectionPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.previewLateSection'), name: 'PreviewLateSectionTest' }),
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
            component: () => <LateSection />,
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
        url={`echo:/${doc.id}`}
        label='embedded'
        block
        suggest={false}
      />,
    );
    expect((await view.findByTestId('section')).textContent).toBe('live');
    view.unmount();
  });

  test('a claimed field takes the focus, its text selected, when it mounts after the embed is attended', async ({
    expect,
  }) => {
    const doc = space.db.add(Markdown.make({ name: 'embedded', content: 'hello' }));
    await space.db.flush({ indexes: true });
    const editor = new EditorView({
      state: EditorState.create({
        extensions: [objectEmbedFocus.of((id) => (id === doc.id ? '[data-testid="field"]' : undefined))],
      }),
    });

    await using harness = await createTestApp({ plugins: [LateSectionPlugin()] });
    const view = render(
      harness,
      <RootAttentionProvider>
        <PreviewComponent
          _tag='image'
          range={{ from: 0, to: 0 }}
          id='embed'
          db={space.db}
          view={editor}
          eid={`echo:/${doc.id}`}
          url={`echo:/${doc.id}`}
          label='embedded'
          block
          suggest={false}
        />
      </RootAttentionProvider>,
    );
    const field = (await view.findByTestId('field')) as HTMLInputElement;
    await expect.poll(() => document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'New feature'.length]);
    view.unmount();
    editor.destroy();
  });
});
