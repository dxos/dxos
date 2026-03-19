# Plugin Sleep Phase 2: Sequencer & Mixer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Sequencer data model with a form-based editor, and a Mixer component that manages an ordered collection of sequencer layers with add/delete/play/stop controls.

**Architecture:** A `Sequence` is a plain Effect Schema struct representing a single audio source — either a bundled sample (m4a) or a binaural generator config. The `Mixer` component manages a local array of sequences as layers, renders them with `react-ui-list` (drag-to-reorder, delete button per layer), provides a toolbar to add layers and play/stop all. Each layer expands to show its `SequenceEditor` form. Audio playback is handled by composing existing `BinauralGenerator` instances and `HTMLAudioElement` for samples.

**Tech Stack:** Effect Schema, React, `@dxos/react-ui` (Toolbar, Panel), `@dxos/react-ui-form` (Form), `@dxos/react-ui-list` (List), Web Audio API, existing `BinauralGenerator`

---

## File Structure

```
src/
├── types/
│   ├── Sequence.ts          # NEW - Sequence Effect Schema + factory
│   └── index.ts             # MODIFY - add Sequence export
├── generator/
│   ├── binaural-generator.ts # EXISTING - no changes
│   ├── sample-player.ts      # NEW - HTMLAudioElement wrapper for m4a playback
│   ├── mixer-engine.ts       # NEW - orchestrates multiple audio sources
│   └── index.ts              # MODIFY - add new exports
├── components/
│   ├── SequenceEditor/
│   │   ├── SequenceEditor.tsx         # NEW - form for one sequence
│   │   ├── SequenceEditor.stories.tsx # NEW - storybook
│   │   └── index.ts                   # NEW
│   ├── Mixer/
│   │   ├── Mixer.tsx                  # NEW - layer list + toolbar + play/stop
│   │   ├── MixerLayer.tsx             # NEW - single layer row in list
│   │   ├── Mixer.stories.tsx          # NEW - storybook
│   │   └── index.ts                   # NEW
│   └── index.ts              # MODIFY - add exports
├── containers/
│   └── SleepArticle/
│       └── SleepArticle.tsx  # MODIFY - replace BinauralPlayer with Mixer
```

---

## Chunk 1: Data Model & Audio Engine

### Task 1: Sequence Schema

**Files:**

- Create: `src/types/Sequence.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create the Sequence schema**

The Sequence schema defines a single audio layer. It has a `sourceType` discriminator (`'sample'` or `'generator'`) and properties for each source type. Using a flat schema with optional fields per source type keeps the form integration simple.

```typescript
// src/types/Sequence.ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BinauralConfigSchema, DEFAULT_CONFIG } from '../generator';

export const SourceType = Schema.Literal('sample', 'generator');

export type SourceType = Schema.Schema.Type<typeof SourceType>;

export const SampleName = Schema.Literal('fireplace', 'ocean', 'rain', 'stream');

export type SampleName = Schema.Schema.Type<typeof SampleName>;

export const SAMPLE_NAMES: SampleName[] = ['fireplace', 'ocean', 'rain', 'stream'];

/** Schema for a single audio layer in the mixer. */
export const SequenceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String.annotations({ description: 'Layer name.' })),
  sourceType: SourceType.annotations({ description: 'Audio source type.' }),
  /** Sample source properties. */
  sample: Schema.optional(SampleName.annotations({ description: 'Bundled sample.' })),
  /** Generator source properties (binaural config). */
  generator: Schema.optional(BinauralConfigSchema),
  /** Layer volume (0-1). */
  volume: Schema.Number.annotations({ description: 'Layer volume (0-1).' }),
  /** Mute this layer. */
  muted: Schema.Boolean.annotations({ description: 'Muted.' }),
});

export type Sequence = Schema.Schema.Type<typeof SequenceSchema>;

/** Create a sample-based sequence. */
export const makeSampleSequence = (sample: SampleName = 'rain'): Sequence => ({
  id: crypto.randomUUID(),
  name: sample,
  sourceType: 'sample',
  sample,
  volume: 0.5,
  muted: false,
});

/** Create a generator-based sequence. */
export const makeGeneratorSequence = (): Sequence => ({
  id: crypto.randomUUID(),
  name: 'Binaural',
  sourceType: 'generator',
  generator: { ...DEFAULT_CONFIG },
  volume: 0.5,
  muted: false,
});
```

- [ ] **Step 2: Export from types index**

Modify `src/types/index.ts`:

```typescript
export * as Dream from './Dream';
export * as Sequence from './Sequence';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds with no errors (ignore DEPOT_TOKEN warning).

- [ ] **Step 4: Commit**

```bash
git add src/types/Sequence.ts src/types/index.ts
git commit -m "feat(plugin-sleep): add Sequence schema for mixer layers"
```

---

### Task 2: Sample Player

**Files:**

- Create: `src/generator/sample-player.ts`
- Modify: `src/generator/index.ts`

- [ ] **Step 1: Create the SamplePlayer class**

Wraps `HTMLAudioElement` with the same start/stop interface as `BinauralGenerator`. Uses the bundled m4a files from `media/nature/`.

```typescript
// src/generator/sample-player.ts
//
// Copyright 2026 DXOS.org
//

import type { SampleName } from '../types/Sequence';

// Bundled sample URLs resolved via import.
// NOTE: These are relative paths that vite/esbuild will resolve at build time.
// For now we construct the URL at runtime from a base path.

/** Audio player for bundled m4a samples. */
export class SamplePlayer {
  private _audio: HTMLAudioElement | undefined;
  private _playing = false;
  private _volume = 0.5;
  private _muted = false;
  private _sample: SampleName;

  constructor(sample: SampleName, volume = 0.5) {
    this._sample = sample;
    this._volume = volume;
  }

  get playing(): boolean {
    return this._playing;
  }

  get sample(): SampleName {
    return this._sample;
  }

  set volume(value: number) {
    this._volume = value;
    if (this._audio) {
      this._audio.volume = this._muted ? 0 : value;
    }
  }

  set muted(value: boolean) {
    this._muted = value;
    if (this._audio) {
      this._audio.volume = this._muted ? 0 : this._volume;
    }
  }

  /** Start playing the sample in a loop. */
  async start(): Promise<void> {
    if (this._playing) {
      return;
    }

    // Resolve sample URL. The m4a files are in the media/nature/ directory
    // which must be served by the app's asset pipeline.
    const url = new URL(`../media/nature/${this._sample}.m4a`, import.meta.url).href;
    this._audio = new Audio(url);
    this._audio.loop = true;
    this._audio.volume = this._muted ? 0 : this._volume;

    await this._audio.play();
    this._playing = true;
  }

  /** Stop playback and release resources. */
  async stop(): Promise<void> {
    if (!this._playing || !this._audio) {
      return;
    }

    this._audio.pause();
    this._audio.src = '';
    this._audio = undefined;
    this._playing = false;
  }
}
```

- [ ] **Step 2: Export from generator index**

Add to `src/generator/index.ts`:

```typescript
export { SamplePlayer } from './sample-player';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/generator/sample-player.ts src/generator/index.ts
git commit -m "feat(plugin-sleep): add SamplePlayer for m4a playback"
```

---

### Task 3: Mixer Engine

**Files:**

- Create: `src/generator/mixer-engine.ts`
- Modify: `src/generator/index.ts`

- [ ] **Step 1: Create the MixerEngine class**

Orchestrates multiple audio sources (BinauralGenerator or SamplePlayer) corresponding to a list of Sequences. Provides a single play/stop interface.

```typescript
// src/generator/mixer-engine.ts
//
// Copyright 2026 DXOS.org
//

import type { Sequence } from '../types/Sequence';

import { BinauralGenerator } from './binaural-generator';
import { SamplePlayer } from './sample-player';

type LayerSource = BinauralGenerator | SamplePlayer;

/** Manages playback of multiple audio layers. */
export class MixerEngine {
  private _sources = new Map<string, LayerSource>();
  private _playing = false;

  get playing(): boolean {
    return this._playing;
  }

  /** Start all non-muted layers. */
  async play(sequences: Sequence[]): Promise<void> {
    await this.stop();

    for (const sequence of sequences) {
      const source = this._createSource(sequence);
      if (source) {
        this._sources.set(sequence.id, source);
        if (!sequence.muted) {
          await source.start();
        }
      }
    }

    this._playing = true;
  }

  /** Stop all layers and release resources. */
  async stop(): Promise<void> {
    const stops = Array.from(this._sources.values()).map((source) => source.stop());
    await Promise.all(stops);
    this._sources.clear();
    this._playing = false;
  }

  /** Update a single layer's volume/mute without restarting everything. */
  updateLayer(sequence: Sequence): void {
    const source = this._sources.get(sequence.id);
    if (!source) {
      return;
    }

    if (source instanceof BinauralGenerator && sequence.generator) {
      source.setConfig({
        ...sequence.generator,
        volume: sequence.muted ? 0 : sequence.volume,
      });
    } else if (source instanceof SamplePlayer) {
      source.volume = sequence.volume;
      source.muted = sequence.muted;
    }
  }

  private _createSource(sequence: Sequence): LayerSource | undefined {
    if (sequence.sourceType === 'generator' && sequence.generator) {
      return new BinauralGenerator({
        ...sequence.generator,
        volume: sequence.muted ? 0 : sequence.volume,
      });
    } else if (sequence.sourceType === 'sample' && sequence.sample) {
      const player = new SamplePlayer(sequence.sample, sequence.volume);
      player.muted = sequence.muted;
      return player;
    }

    return undefined;
  }
}
```

- [ ] **Step 2: Export from generator index**

Add to `src/generator/index.ts`:

```typescript
export { MixerEngine } from './mixer-engine';
```

- [ ] **Step 3: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/generator/mixer-engine.ts src/generator/index.ts
git commit -m "feat(plugin-sleep): add MixerEngine to orchestrate audio layers"
```

---

## Chunk 2: Sequencer Component

### Task 4: SequenceEditor Component

**Files:**

- Create: `src/components/SequenceEditor/SequenceEditor.tsx`
- Create: `src/components/SequenceEditor/index.ts`
- Create: `src/components/SequenceEditor/SequenceEditor.stories.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the SequenceEditor component**

Form-based editor for a single Sequence. Shows different fields depending on `sourceType`. Uses `onValuesChanged` for real-time updates (same pattern as BinauralPlayer).

```typescript
// src/components/SequenceEditor/SequenceEditor.tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { Form } from '@dxos/react-ui-form';

import { type Sequence, SequenceSchema } from '../../types/Sequence';

export type SequenceEditorProps = ThemedClassName<{
  sequence: Sequence;
  onChange: (sequence: Sequence) => void;
}>;

/** Form editor for a single sequence layer. */
export const SequenceEditor = ({ classNames, sequence, onChange }: SequenceEditorProps) => {
  const schema = useMemo(() => SequenceSchema, []);

  const handleValuesChanged = useCallback(
    (newValues: Partial<Sequence>, { changed }: { changed: Record<string, boolean> }) => {
      const changedKeys = Object.keys(changed).filter((key) => changed[key]);
      if (changedKeys.length === 0) {
        return;
      }
      onChange({ ...sequence, ...newValues });
    },
    [sequence, onChange],
  );

  return (
    <div className={mx('p-2', classNames)}>
      <Form.Root schema={schema} defaultValues={sequence} onValuesChanged={handleValuesChanged}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet
              sort={['name', 'sourceType', 'sample', 'generator', 'volume', 'muted']}
              exclude={(props) => props.filter((prop) => prop.name !== 'id')}
            />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </div>
  );
};
```

- [ ] **Step 2: Create index**

```typescript
// src/components/SequenceEditor/index.ts
//
// Copyright 2026 DXOS.org
//

export { SequenceEditor } from './SequenceEditor';
export type { SequenceEditorProps } from './SequenceEditor';
```

- [ ] **Step 3: Create storybook**

```typescript
// src/components/SequenceEditor/SequenceEditor.stories.tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { makeSampleSequence, makeGeneratorSequence } from '../../types/Sequence';

import { SequenceEditor } from './SequenceEditor';

const SampleStory = () => {
  const [sequence, setSequence] = useState(makeSampleSequence('rain'));
  return <SequenceEditor sequence={sequence} onChange={setSequence} />;
};

const GeneratorStory = () => {
  const [sequence, setSequence] = useState(makeGeneratorSequence());
  return <SequenceEditor sequence={sequence} onChange={setSequence} />;
};

const meta = {
  title: 'plugins/plugin-sleep/components/SequenceEditor',
  decorators: [withTheme(), withLayout({ classNames: 'w-document-max-width' })],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Sample: Story = {
  render: () => <SampleStory />,
};

export const Generator: Story = {
  render: () => <GeneratorStory />,
};
```

- [ ] **Step 4: Export from components index**

Update `src/components/index.ts` to add:

```typescript
export * from './SequenceEditor';
```

- [ ] **Step 5: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/SequenceEditor/ src/components/index.ts
git commit -m "feat(plugin-sleep): add SequenceEditor form component with storybook"
```

---

## Chunk 3: Mixer Component

### Task 5: Add react-ui-list dependency

**Files:**

- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Add dependency**

Run: `pnpm add --filter "@dxos/plugin-sleep" --save-catalog "@dxos/react-ui-list"`

- [ ] **Step 2: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add package.json ../../pnpm-lock.yaml
git commit -m "chore(plugin-sleep): add react-ui-list dependency"
```

---

### Task 6: MixerLayer Component

**Files:**

- Create: `src/components/Mixer/MixerLayer.tsx`

- [ ] **Step 1: Create MixerLayer**

Renders a single layer row within the List. Shows drag handle, name, source type indicator, and delete button. Clicking expands to show the SequenceEditor.

```typescript
// src/components/Mixer/MixerLayer.tsx
//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { Icon, Toolbar } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/ui-theme';

import { type Sequence } from '../../types/Sequence';
import { SequenceEditor } from '../SequenceEditor';

export type MixerLayerProps = {
  sequence: Sequence;
  onChange: (sequence: Sequence) => void;
  onDelete: (id: string) => void;
};

const sourceIcon: Record<string, string> = {
  sample: 'ph--music-note--regular',
  generator: 'ph--wave-sine--regular',
};

/** Single layer row in the mixer list. */
export const MixerLayer = ({ sequence, onChange, onDelete }: MixerLayerProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        role='none'
        className='grid grid-cols-[min-content_min-content_1fr_min-content_min-content] items-center min-h-10'}
      >
        <List.ItemDragHandle />
        <Icon icon={sourceIcon[sequence.sourceType] ?? 'ph--question--regular'} classNames='mx-1' />
        <List.ItemTitle onClick={() => setExpanded(!expanded)}>
          {sequence.name ?? sequence.sourceType}
        </List.ItemTitle>
        <Toolbar.IconButton
          icon={sequence.muted ? 'ph--speaker-slash--regular' : 'ph--speaker-high--regular'}
          iconOnly
          label={sequence.muted ? 'Unmute' : 'Mute'}
          onClick={() => onChange({ ...sequence, muted: !sequence.muted })}
        />
        <List.ItemDeleteButton onClick={() => onDelete(sequence.id)} />
      </div>
      {expanded && (
        <SequenceEditor sequence={sequence} onChange={onChange} classNames='pl-8' />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

---

### Task 7: Mixer Component

**Files:**

- Create: `src/components/Mixer/Mixer.tsx`
- Create: `src/components/Mixer/index.ts`
- Create: `src/components/Mixer/Mixer.stories.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the Mixer component**

Manages an array of Sequence layers. Toolbar has add-sample, add-generator, and play/stop buttons. List renders MixerLayer rows with reorder support.

```typescript
// src/components/Mixer/Mixer.tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

import { MixerEngine } from '../../generator';
import { type Sequence, makeSampleSequence, makeGeneratorSequence } from '../../types/Sequence';

import { MixerLayer } from './MixerLayer';

export type MixerProps = ThemedClassName<{}>;

/** Multi-layer audio mixer with sequencer layers. */
export const Mixer = ({ classNames }: MixerProps) => {
  const engineRef = useRef(new MixerEngine());
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState<Sequence[]>([makeSampleSequence('rain')]);

  // Cleanup on unmount.
  useEffect(() => {
    const engine = engineRef.current;
    return () => {
      void engine.stop();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (playing) {
      await engineRef.current.stop();
      setPlaying(false);
    } else {
      await engineRef.current.play(layers);
      setPlaying(true);
    }
  }, [playing, layers]);

  const handleStop = useCallback(async () => {
    await engineRef.current.stop();
    setPlaying(false);
  }, []);

  const handleAddSample = useCallback(() => {
    setLayers((prev) => [...prev, makeSampleSequence()]);
  }, []);

  const handleAddGenerator = useCallback(() => {
    setLayers((prev) => [...prev, makeGeneratorSequence()]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
  }, []);

  const handleChange = useCallback(
    (updated: Sequence) => {
      setLayers((prev) => prev.map((layer) => (layer.id === updated.id ? updated : layer)));
      if (playing) {
        engineRef.current.updateLayer(updated);
      }
    },
    [playing],
  );

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const isSequence = useCallback((item: unknown): item is Sequence => {
    return typeof item === 'object' && item !== null && 'id' in item && 'sourceType' in item;
  }, []);

  return (
    <div className={mx(classNames)}>
      <Toolbar.Root>
        <Toolbar.IconButton
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          iconOnly
          label={playing ? 'Pause' : 'Play'}
          onClick={handlePlay}
        />
        <Toolbar.IconButton
          icon='ph--stop--regular'
          iconOnly
          label='Stop'
          disabled={!playing}
          onClick={handleStop}
        />
        <div className='grow' />
        <Toolbar.IconButton
          icon='ph--music-note--regular'
          iconOnly
          label='Add sample layer'
          onClick={handleAddSample}
        />
        <Toolbar.IconButton
          icon='ph--wave-sine--regular'
          iconOnly
          label='Add generator layer'
          onClick={handleAddGenerator}
        />
      </Toolbar.Root>

      <List.Root<Sequence>
        items={layers}
        getId={(item) => item.id}
        isItem={isSequence}
        onMove={handleMove}
      >
        {({ items }) =>
          items.map((layer) => (
            <List.Item key={layer.id} item={layer}>
              <MixerLayer
                sequence={layer}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            </List.Item>
          ))
        }
      </List.Root>
    </div>
  );
};
```

- [ ] **Step 2: Create index**

```typescript
// src/components/Mixer/index.ts
//
// Copyright 2026 DXOS.org
//

export { Mixer } from './Mixer';
export type { MixerProps } from './Mixer';
```

- [ ] **Step 3: Create storybook**

```typescript
// src/components/Mixer/Mixer.stories.tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Mixer } from './Mixer';

const meta = {
  title: 'plugins/plugin-sleep/components/Mixer',
  component: Mixer,
  decorators: [withTheme(), withLayout({ classNames: 'w-document-max-width' })],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Mixer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 4: Export from components index**

Update `src/components/index.ts` to add:

```typescript
export * from './Mixer';
```

- [ ] **Step 5: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/Mixer/ src/components/index.ts
git commit -m "feat(plugin-sleep): add Mixer component with layer list and storybook"
```

---

## Chunk 4: Integration

### Task 8: Wire Mixer into SleepArticle

**Files:**

- Modify: `src/containers/SleepArticle/SleepArticle.tsx`

- [ ] **Step 1: Replace BinauralPlayer with Mixer**

Update `SleepArticle.tsx` to render the Mixer below the Editor, replacing the standalone BinauralPlayer:

```typescript
// src/containers/SleepArticle/SleepArticle.tsx
//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { type Dream } from '../../types';
import { Editor, Mixer } from '../../components';

export type SleepArticleProps = SurfaceComponentProps<Dream.Dream>;

export const SleepArticle = ({ role, subject: dream }: SleepArticleProps) => {
  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Content>
        <Editor dream={dream} />
        <Mixer classNames='mt-4' />
      </Panel.Content>
    </Panel.Root>
  );
};
```

Note: The BinauralPlayer component is kept in the codebase (its functionality is now available as a generator layer in the Mixer) but removed from the article view.

- [ ] **Step 2: Build to verify**

Run: `moon run plugin-sleep:build`
Expected: Build succeeds.

- [ ] **Step 3: Update SPEC.md checkboxes**

Mark all Phase 2 items as complete in `SPEC.md`.

- [ ] **Step 4: Commit**

```bash
git add src/containers/SleepArticle/SleepArticle.tsx SPEC.md
git commit -m "feat(plugin-sleep): integrate Mixer into SleepArticle, complete Phase 2"
```

---

## Dependency Notes

- `@dxos/react-ui-list` must be added as a dependency (Task 5).
- The `media/nature/*.m4a` files must be servable by the app's asset pipeline. The `SamplePlayer` uses `import.meta.url` to resolve their paths, which works with Vite's asset handling.
- The `BinauralPlayer` component is retained for standalone use but replaced by the Mixer in the article view.
