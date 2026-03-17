# Dream Sequences Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `sequences` array to the `Dream` ECHO type and make `Mixer` accept and mutate a `Dream` object directly instead of managing local state.

**Architecture:** `Dream.sequences` is a plain `Schema.Array(Sequence)` embedded in the ECHO object. `Mixer` becomes a controlled component driven by `dream.sequences`, using `Obj.change()` for all mutations. `ZenArticle` passes its Dream subject down to Mixer.

**Tech Stack:** Effect Schema, DXOS ECHO (`Obj.change`, `Obj.make`), React, `@dxos/react-client/testing` for stories.

---

### Task 1: Add `sequences` field to Dream schema

**Files:**
- Modify: `packages/plugins/plugin-zen/src/types/Dream.ts`

- [ ] **Step 1: Add `sequences` field to Dream schema**

  In `Dream.ts`, import `Sequence` and add a `sequences` field:

  ```typescript
  import { Sequence } from './Sequence';

  export const Dream = Schema.Struct({
    name: Schema.optional(Schema.String),
    duration: Schema.optional(
      Schema.Number.annotations({
        description: 'Playback duration in seconds.',
        default: 30,
      }),
    ),
    sequences: Schema.optional(Schema.Array(Sequence)),
  }).pipe(
    Type.object({
      typename: 'dxos.org.type.Dream',
      version: '0.1.0',
    }),
    LabelAnnotation.set(['name']),
  );

  export interface Dream extends Schema.Schema.Type<typeof Dream> {}
  ```

- [ ] **Step 2: Update `make()` factory to accept sequences**

  ```typescript
  export const make = ({ name, duration, sequences }: Partial<Schema.Schema.Type<typeof Dream>> = {}) => {
    return Obj.make(Dream, { name, duration, sequences });
  };
  ```

- [ ] **Step 3: Build to verify types compile**

  Run: `moon run plugin-zen:build`
  Expected: No type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/plugins/plugin-zen/src/types/Dream.ts
  git commit -m "feat(plugin-zen): add sequences array to Dream schema"
  ```

---

### Task 2: Update Mixer to accept and mutate a Dream prop

**Files:**
- Modify: `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx`

- [ ] **Step 1: Add `dream` prop and remove local sequences state**

  Replace:
  ```typescript
  export type MixerProps = ThemedClassName<{
    engine: MixerEngine;
  }>;

  export const Mixer = ({ classNames, engine }: MixerProps) => {
    const [playing, setPlaying] = useState(false);
    const [layers, setLayers] = useState<Sequence.Sequence[]>([Sequence.makeSampleSequence('rain')]);
    const [selected, setSelected] = useState<string | undefined>();
  ```

  With:
  ```typescript
  import { Obj } from '@dxos/echo';
  import { Dream, Sequence } from '../../types'; // Dream is a namespace; Sequence retained for existing usages

  export type MixerProps = ThemedClassName<{
    dream: Dream.Dream;
    engine: MixerEngine;
  }>;

  export const Mixer = ({ classNames, dream, engine }: MixerProps) => {
    const [playing, setPlaying] = useState(false);
    const layers: Sequence.Sequence[] = dream.sequences ?? [];
    const [selected, setSelected] = useState<string | undefined>();
  ```

- [ ] **Step 2: Update `handleAdd` to use `Obj.change`**

  Replace:
  ```typescript
  const handleAdd = useCallback(() => {
    const sequence = Sequence.makeSequence();
    setLayers((prev) => [...prev, sequence]);
    setSelected(sequence.id);
  }, []);
  ```

  With:
  ```typescript
  const handleAdd = useCallback(() => {
    const sequence = Sequence.makeSequence();
    Obj.change(dream, (d) => {
      d.sequences = [...(d.sequences ?? []), sequence];
    });
    setSelected(sequence.id);
  }, [dream]);
  ```

- [ ] **Step 3: Update `handleDelete` to use `Obj.change`**

  Replace:
  ```typescript
  const handleDelete = useCallback(
    (id: string) => {
      setLayers((prev) => prev.filter((layer) => layer.id !== id));
      if (selected === id) {
        setSelected(undefined);
      }
      if (playing) {
        void engine.removeLayer(id);
      }
    },
    [selected, playing, engine],
  );
  ```

  With:
  ```typescript
  const handleDelete = useCallback(
    (id: string) => {
      Obj.change(dream, (d) => {
        d.sequences = (d.sequences ?? []).filter((layer) => layer.id !== id);
      });
      if (selected === id) {
        setSelected(undefined);
      }
      if (playing) {
        void engine.removeLayer(id);
      }
    },
    [dream, selected, playing, engine],
  );
  ```

- [ ] **Step 4: Update `handleChange` to use `Obj.change`**

  Replace:
  ```typescript
  const handleChange = useCallback(
    (updated: Sequence.Sequence) => {
      setLayers((prev) => prev.map((layer) => (layer.id === updated.id ? updated : layer)));
      if (playing) {
        void engine.updateLayer(updated);
      }
    },
    [playing, engine],
  );
  ```

  With:
  ```typescript
  const handleChange = useCallback(
    (updated: Sequence.Sequence) => {
      Obj.change(dream, (d) => {
        d.sequences = (d.sequences ?? []).map((layer) => (layer.id === updated.id ? updated : layer));
      });
      if (playing) {
        void engine.updateLayer(updated);
      }
    },
    [dream, playing, engine],
  );
  ```

- [ ] **Step 5: Update `handleMove` to use `Obj.change`**

  Replace:
  ```typescript
  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);
  ```

  With:
  ```typescript
  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      Obj.change(dream, (d) => {
        const next = [...(d.sequences ?? [])];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        d.sequences = next;
      });
    },
    [dream],
  );
  ```

- [ ] **Step 6: Verify `handlePlay` dependency array**

  No body change needed. `layers` is declared in the same render scope as `dream.sequences ?? []`, so including `layers` in the dep array is correct and sufficient:

  ```typescript
  const handlePlay = useCallback(async () => {
    if (playing) {
      await engine.stop();
      setPlaying(false);
    } else {
      await engine.play(layers);
      setPlaying(true);
    }
  }, [playing, layers, engine]);
  ```

- [ ] **Step 7: Build to verify types compile**

  Run: `moon run plugin-zen:build`
  Expected: No type errors.

- [ ] **Step 8: Commit**

  ```bash
  git add packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx
  git commit -m "feat(plugin-zen): Mixer accepts Dream prop and mutates sequences via Obj.change"
  ```

---

### Task 3: Wire Dream into ZenArticle → Mixer

**Files:**
- Modify: `packages/plugins/plugin-zen/src/containers/ZenArticle/ZenArticle.tsx`

- [ ] **Step 1: Pass `dream` to `<Mixer>`**

  Replace:
  ```typescript
  <Mixer engine={engine} />
  ```

  With:
  ```typescript
  <Mixer dream={dream} engine={engine} />
  ```

- [ ] **Step 2: Build to verify**

  Run: `moon run plugin-zen:build`
  Expected: No type errors.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/plugins/plugin-zen/src/containers/ZenArticle/ZenArticle.tsx
  git commit -m "feat(plugin-zen): pass dream object from ZenArticle to Mixer"
  ```

---

### Task 4: Update Mixer story to use an ECHO-backed Dream

**Files:**
- Modify: `packages/plugins/plugin-zen/src/components/Mixer/Mixer.stories.tsx`
- Modify: `packages/plugins/plugin-zen/package.json` (add devDependency)

- [ ] **Step 1: Add `@dxos/react-client` to the pnpm catalog**

  Run:
  ```bash
  pnpm add --filter "@dxos/plugin-zen" --save-catalog "@dxos/react-client"
  ```

  This adds `@dxos/react-client` to `dependencies` in `package.json` by default.

- [ ] **Step 2: Move `@dxos/react-client` to `devDependencies`**

  In `packages/plugins/plugin-zen/package.json`, move `"@dxos/react-client"` from `dependencies` to `devDependencies` since it is only needed for stories.

- [ ] **Step 3: Rewrite story with `withClientProvider` and ECHO Dream**

  The canonical pattern for ECHO-backed stories is to create objects inside a `useEffect` once the space is available, and return the ECHO-backed proxy from `db.add()`.

  Replace the entire story file with:

  ```typescript
  //
  // Copyright 2026 DXOS.org
  //

  import React from 'react';
  import { type Meta, type StoryObj } from '@storybook/react-vite';

  import { useSpaces } from '@dxos/react-client/echo';
  import { withClientProvider } from '@dxos/react-client/testing';
  import { withLayout, withTheme } from '@dxos/react-ui/testing';
  import { Oscilloscope } from '@dxos/react-ui-sfx';

  import { useMixerEngine } from '../../hooks';
  import { Dream, Sequence } from '../../types';

  import { Mixer } from './Mixer';

  const DefaultStory = () => {
    const { engine, playing, outputNode } = useMixerEngine();
    const spaces = useSpaces();
    const space = spaces[0];
    const [dream, setDream] = React.useState<Dream.Dream | undefined>();

    React.useEffect(() => {
      if (space && !dream) {
        setDream(
          space.db.add(
            Dream.make({
              name: 'Test Dream',
              sequences: [Sequence.makeSampleSequence('rain')],
            }),
          ),
        );
      }
    }, [space, dream]);

    if (!dream) {
      return null;
    }

    return (
      <div className='dx-container grid grid-cols-[1fr_1fr] gap-8 px-8'>
        <Mixer dream={dream} engine={engine} />
        <div className='flex flex-col justify-center'>
          <Oscilloscope classNames='h-[400px] border-green-500' mode='waveform' active={playing} source={outputNode} />
        </div>
      </div>
    );
  };

  const meta = {
    title: 'plugins/plugin-zen/components/Mixer',
    render: DefaultStory,
    decorators: [
      withClientProvider({ createIdentity: true, createSpace: true, types: [Dream.Dream] }),
      withTheme(),
      withLayout({ layout: 'fullscreen' }),
    ],
    parameters: {
      layout: 'fullscreen',
    },
  } satisfies Meta;

  export default meta;

  type Story = StoryObj;

  export const Default: Story = {};
  ```

- [ ] **Step 4: Build to verify**

  Run: `moon run plugin-zen:build`
  Expected: No type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/plugins/plugin-zen/src/components/Mixer/Mixer.stories.tsx packages/plugins/plugin-zen/package.json
  git commit -m "feat(plugin-zen): update Mixer story to use ECHO-backed Dream object"
  ```

---

### Task 5: Final lint and verify

- [ ] **Step 1: Run linter**

  Run: `moon run plugin-zen:lint -- --fix`
  Expected: No errors.

- [ ] **Step 2: Run storybook to visually verify**

  Run: `moon run storybook-react:serve`
  Navigate to `plugins/plugin-zen/components/Mixer` story.
  Expected: Mixer renders with initial rain layer, add/delete/reorder all work.

- [ ] **Step 3: Final commit if linter made fixes**

  ```bash
  git add -p
  git commit -m "fix(plugin-zen): apply lint fixes"
  ```
