//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Ref } from '@dxos/echo';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import { UmlSkill } from '@dxos/plugin-illustrator';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { type Space } from '@dxos/react-client/echo';
import { Cell } from '@dxos/storybook-testing';
import { trim } from '@dxos/util';

import { StoryRole } from '../modules/index.ts';
import {
  ModuleContainer,
  addToRootCollection,
  createDecorators,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';

type StoryArgs = {
  /** Name of the seeded document. */
  name?: string;
  /** Markdown content of the seeded document; empty when the document is the diagram's target. */
  source?: string;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/Uml',
  // Args feed the decorator's seeding, not the container (its layout arrives via StoryLayout.Atom).
  render: () => <ModuleContainer />,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** Source the agent is asked to analyze: a small class hierarchy with every relation kind. */
const SOURCE_CODE = trim`
  # Media Library

  Analyze this TypeScript module:

  \`\`\`ts
  interface Playable {
    play(): void;
  }

  abstract class MediaItem {
    constructor(readonly title: string, protected duration: number) {}
    abstract describe(): string;
  }

  class Track extends MediaItem implements Playable {
    constructor(title: string, duration: number, readonly artist: Artist) {
      super(title, duration);
    }
    play(): void {}
    describe(): string {
      return \`\${this.title} — \${this.artist.name}\`;
    }
  }

  class Album extends MediaItem {
    readonly tracks: Track[] = [];
    add(track: Track): void {
      this.tracks.push(track);
    }
    describe(): string {
      return \`\${this.title} (\${this.tracks.length} tracks)\`;
    }
  }

  class Artist {
    constructor(readonly name: string) {}
  }

  class Library {
    readonly albums: Album[] = [];
    find(query: string): MediaItem[] {
      return this.albums.filter((album) => album.title.includes(query));
    }
  }
  \`\`\`
`;

// Captured by `onInit` so play functions can assert on the live canvas records.
let storySpace: Space | undefined;

const decorators = createDecorators<StoryArgs>(({ args }) => ({
  skills: [AssistantSkill.key, MarkdownSkill.key, UmlSkill.key],
  lazyPlugins: async () => {
    // SpacePlugin contributes the `versioning-state` capability the markdown article reads.
    const [{ Drawing }, IllustratorPlugin, MarkdownPlugin, SpacePlugin, TldrawPlugin] = await Promise.all([
      import('@dxos/plugin-illustrator'),
      import('@dxos/plugin-illustrator/IllustratorPlugin'),
      import('@dxos/plugin-markdown/MarkdownPlugin'),
      import('@dxos/plugin-space/SpacePlugin'),
      import('@dxos/plugin-tldraw/TldrawPlugin'),
    ]);
    return {
      plugins: [IllustratorPlugin.make(), MarkdownPlugin.make(), SpacePlugin.make({}), TldrawPlugin.make()],
      types: [Drawing.Drawing, Drawing.Canvas],
    };
  },
  onInit: async ({ space }) => {
    storySpace = space;
    const [{ Drawing }, { Tldraw }] = await Promise.all([
      import('@dxos/plugin-illustrator'),
      import('@dxos/plugin-tldraw'),
    ]);
    const document = space.db.add(Markdown.make({ name: args.name ?? 'Media Library', content: args.source }));
    const drawing = space.db.add(
      Drawing.make({ name: 'Class Diagram', canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA }) }),
    );
    addToRootCollection(space, [document, drawing]);
    return [[StoryRole.Chat], [Cell.article(document)], [Cell.article(drawing)]];
  },
  onChatCreated: async ({ db, binder }) => {
    const [{ Drawing }] = await Promise.all([import('@dxos/plugin-illustrator')]);
    const documents = await db.query(Filter.type(Markdown.Document)).run();
    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    await binder.bind({ objects: [...documents, ...drawings].map((object) => Ref.make(object)) });
  },
}));

/** Count canvas shape records belonging to a world object (`meta.object`), or all managed shapes. */
const countObjectRecords = async (objectId?: string): Promise<number> => {
  if (!storySpace) {
    return 0;
  }
  const { Drawing } = await import('@dxos/plugin-illustrator');
  const canvases = await storySpace.db.query(Filter.type(Drawing.Canvas)).run();
  return canvases.reduce((count, canvas) => {
    const records = Object.values(canvas.content ?? {}) as any[];
    return (
      count +
      records.filter(
        (record) => record?.typeName === 'shape' && (objectId ? record.meta?.object === objectId : record.meta?.object),
      ).length
    );
  }, 0);
};

/** Poll until the named document's text contains `needle`. */
const waitForDocumentContent = async (name: string, needle: string, timeout = 240_000): Promise<void> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const documents = (await storySpace?.db.query(Filter.type(Markdown.Document)).run()) ?? [];
    const document = documents.find((doc) => doc.name === name);
    const text = await document?.content.tryLoad();
    if (text?.content.includes(needle)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for "${needle}" in document "${name}"`);
};

/** Poll until the canvas contains at least `min` managed shape records. */
const waitForObjectRecords = async (objectId: string | undefined, min = 1, timeout = 240_000): Promise<number> => {
  const deadline = Date.now() + timeout;
  let count = 0;
  while (Date.now() < deadline) {
    count = await countObjectRecords(objectId);
    if (count >= min) {
      return count;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for shapes of object "${objectId ?? '*'}" (last=${count})`);
};

/**
 * Code-to-diagram over a live AI stack: the chat (left) reads the source in the markdown document
 * (middle) and generates a UML class diagram onto the canvas (right) via the mermaid classDiagram
 * dialect — the dialect owns the layout. Try: "Create a UML class diagram of the code in the
 * Media Library document", then "Add a Playlist class that aggregates Tracks".
 */
export const Default: Story = {
  decorators,
  args: {
    source: SOURCE_CODE,
  },
};

/**
 * End-to-end test: the agent analyzes the bound document's TypeScript and generates the diagram.
 * Asserts that class world objects land on the canvas — `Track` must exist and the diagram must
 * span several classes.
 *
 * Live AI and slow, so excluded from CI test runs (`tags: ['!test']`); run manually in storybook
 * against a reachable EDGE AI service.
 */
export const GenerateFromDocumentTest: Story = {
  decorators,
  args: {
    source: SOURCE_CODE,
  },
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(
      canvasElement,
      'Create a UML class diagram of the code in the Media Library document, on the Class Diagram drawing.',
    );
    await waitForObjectRecords('Track', 1);
    await waitForObjectRecords(undefined, 6, 60_000);
  },
};

/**
 * As above, but the source is a GitHub reference rather than inline code: the agent fetches the
 * file with its research/fetch tools, writes the mermaid classDiagram into the (empty) bound
 * document, and renders it onto the canvas. Needs network access in addition to a live AI
 * service, so it is manual-only.
 */
export const GenerateFromGithubTest: Story = {
  decorators,
  args: {
    name: 'Diagram',
  },
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(
      canvasElement,
      trim`
        Create a UML class diagram of https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-illustrator/src/model/scene.ts.
        Write the mermaid classDiagram source into the empty Diagram document (as a fenced mermaid block),
        then render it on the Class Diagram drawing.
      `.replace(/\s*\n\s*/g, ' '),
    );
    await waitForDocumentContent('Diagram', 'classDiagram');
    await waitForObjectRecords(undefined, 4, 60_000);
  },
};
