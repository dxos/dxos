# Tic-Tac-Toe Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fully-featured Tic-Tac-Toe plugin for DXOS Composer with configurable board sizes, multiplayer via ECHO, AI opponents (easy/medium/hard), blueprint integration, and playful animations.

**Architecture:** Standard Composer plugin following the `plugin-chess` exemplar. ECHO schema stores game state as a flat board string. Pure game logic functions handle win detection and AI. Operations expose Create, MakeMove, AiMove, Print for blueprint integration. Custom CSS Grid component with SVG markers and Tailwind animations.

**Tech Stack:** TypeScript, React, Effect-TS, ECHO Schema, TailwindCSS, Vitest

**Spec:** `packages/plugins/plugin-tictactoe/PLUGIN.mdl`

---

### Task 1: Package Skeleton

**Files:**

- Create: `packages/plugins/plugin-tictactoe/package.json`
- Create: `packages/plugins/plugin-tictactoe/moon.yml`
- Create: `packages/plugins/plugin-tictactoe/README.md`
- Create: `packages/plugins/plugin-tictactoe/src/meta.ts`
- Create: `packages/plugins/plugin-tictactoe/src/translations.ts`
- Create: `packages/plugins/plugin-tictactoe/src/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/TicTacToePlugin.tsx`
- Create: `packages/plugins/plugin-tictactoe/src/types/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/types/TicTacToe.ts`
- Create: `packages/plugins/plugin-tictactoe/src/capabilities/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-tictactoe/src/containers/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeArticle/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeArticle/TicTacToeArticle.tsx`
- Create: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeCard/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeCard/TicTacToeCard.tsx`
- Create: `packages/plugins/plugin-tictactoe/src/components/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/operations/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/operations/definitions.ts`
- Create: `packages/plugins/plugin-tictactoe/src/blueprints/index.ts`
- Modify: `packages/apps/composer-app/package.json` (add dependency)
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx` (add import)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@dxos/plugin-tictactoe",
  "version": "0.8.3",
  "description": "Tic-Tac-Toe game plugin for Composer",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "MIT",
  "author": "DXOS.org",
  "private": true,
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#blueprints": "./src/blueprints/index.ts",
    "#capabilities": "./src/capabilities/index.ts",
    "#components": "./src/components/index.ts",
    "#containers": "./src/containers/index.ts",
    "#meta": "./src/meta.ts",
    "#operations": "./src/operations/index.ts",
    "#types": "./src/types/index.ts"
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs",
      "node": "./dist/lib/node-esm/index.mjs"
    },
    "./operations": {
      "source": "./src/operations/index.ts",
      "types": "./dist/types/src/operations/index.d.ts",
      "browser": "./dist/lib/browser/operations/index.mjs",
      "node": "./dist/lib/node-esm/operations/index.mjs"
    },
    "./types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "browser": "./dist/lib/browser/types/index.mjs",
      "node": "./dist/lib/node-esm/types/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "typesVersions": {
    "*": {
      "types": ["dist/types/src/types/index.d.ts"]
    }
  },
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/blueprints": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/echo-react": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/operation": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/react-client": "workspace:*",
    "@dxos/schema": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/plugin-theme": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/storybook-utils": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `moon.yml`**

```yaml
tasks:
  compile:
    args:
      - '--entryPoint'
      - 'src/index.ts'
      - '--entryPoint'
      - 'src/operations/index.ts'
      - '--entryPoint'
      - 'src/types/index.ts'
```

- [ ] **Step 3: Create `README.md`**

```markdown
# @dxos/plugin-tictactoe

Tic-Tac-Toe game plugin for DXOS Composer. Supports configurable board sizes (3×3 to 5×5), multiplayer via ECHO, and AI opponents with easy/medium/hard difficulty.
```

- [ ] **Step 4: Create `src/meta.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.tictactoe',
  name: 'Tic-Tac-Toe',
  description: 'Configurable Tic-Tac-Toe game with multiplayer and AI opponents.',
  icon: 'ph--grid-four--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tictactoe',
};
```

- [ ] **Step 5: Create `src/types/TicTacToe.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  board: Schema.String.annotations({
    description: 'Flat board string. Length = size*size. Characters: X, O, or - (empty).',
  }),
  moves: Schema.String.annotations({
    description: 'Semicolon-separated move log, e.g. "X:1,1;O:0,2".',
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
  size: Schema.Number.annotations({
    description: 'Board dimension (3, 4, or 5).',
  }),
  winCondition: Schema.Number.annotations({
    description: 'Consecutive marks needed to win.',
  }),
  difficulty: Schema.optional(
    Schema.String.annotations({
      description: 'AI difficulty: easy, medium, or hard.',
    }),
  ),
  status: Schema.String.annotations({
    description: 'Game status: playing, x-wins, o-wins, or draw.',
  }),
  players: Schema.Struct({
    x: Schema.optional(
      Schema.String.annotations({
        description: 'DID of X player.',
      }),
    ),
    o: Schema.optional(
      Schema.String.annotations({
        description: 'DID of O player.',
      }),
    ),
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.tictactoe',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--grid-four--regular',
    hue: 'cyan',
  }),
);

export interface Game extends Schema.Schema.Type<typeof Game> {}

export const make = ({
  name,
  size = 3,
  winCondition,
  difficulty,
}: {
  name?: string;
  size?: number;
  winCondition?: number;
  difficulty?: string;
} = {}) => {
  const boardSize = size;
  const board = '-'.repeat(boardSize * boardSize);
  return Obj.make(Game, {
    name,
    board,
    moves: '',
    size: boardSize,
    winCondition: winCondition ?? boardSize,
    difficulty,
    status: 'playing',
    players: {},
  });
};
```

- [ ] **Step 6: Create `src/types/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

export * as TicTacToe from './TicTacToe';
```

- [ ] **Step 7: Create `src/translations.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

export const translations = [
  {
    'en-US': {
      'org.dxos.type.tictactoe': {
        label: 'Game',
        'label--plural': 'Games',
      },
      'org.dxos.plugin.tictactoe': {
        'new-game': 'New Game',
        'x-turn': "X's turn",
        'o-turn': "O's turn",
        'x-wins': 'X wins!',
        'o-wins': 'O wins!',
        draw: "It's a draw!",
        'ai-thinking': 'AI is thinking...',
        'difficulty-easy': 'Easy',
        'difficulty-medium': 'Medium',
        'difficulty-hard': 'Hard',
        'board-size': 'Board Size',
        'win-condition': 'Win Condition',
      },
    },
  },
];
```

- [ ] **Step 8: Create operation stubs `src/operations/definitions.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { TicTacToe } from '../types';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.tictactoe.create',
    name: 'Create Tic-Tac-Toe',
    description: 'Creates a new Tic-Tac-Toe game.',
  },
  input: Schema.Struct({
    name: Schema.optional(
      Schema.String.annotations({
        description: 'Name of the game.',
      }),
    ),
    size: Schema.optional(
      Schema.Number.annotations({
        description: 'Board dimension (3, 4, or 5). Default: 3.',
      }),
    ),
    winCondition: Schema.optional(
      Schema.Number.annotations({
        description: 'Consecutive marks to win. Default: equals size.',
      }),
    ),
    difficulty: Schema.optional(
      Schema.String.annotations({
        description: 'AI difficulty: easy, medium, or hard. Default: medium.',
      }),
    ),
  }),
  output: TicTacToe.Game,
  services: [Database.Service],
});

export const MakeMove = Operation.make({
  meta: {
    key: 'org.dxos.function.tictactoe.move',
    name: 'Make Move',
    description: 'Places a marker on the board.',
  },
  input: Schema.Struct({
    game: Ref.Ref(TicTacToe.Game).annotations({
      description: 'The ID of the Tic-Tac-Toe game object.',
    }),
    position: Schema.String.annotations({
      description: 'Position as "row,col", e.g. "1,2".',
      examples: ['0,0', '1,2', '2,1'],
    }),
  }),
  output: Schema.Struct({
    board: Schema.String.annotations({
      description: 'The board state after the move.',
    }),
    status: Schema.String.annotations({
      description: 'Game status after the move.',
    }),
  }),
  services: [Database.Service],
});

export const AiMove = Operation.make({
  meta: {
    key: 'org.dxos.function.tictactoe.ai-move',
    name: 'AI Move',
    description: 'Uses the AI engine to play the next move.',
  },
  input: Schema.Struct({
    game: Ref.Ref(TicTacToe.Game).annotations({
      description: 'The ID of the Tic-Tac-Toe game object.',
    }),
    difficulty: Schema.optional(
      Schema.String.annotations({
        description: 'Override difficulty: easy, medium, or hard.',
      }),
    ),
  }),
  output: Schema.Struct({
    board: Schema.String.annotations({
      description: 'The board state after the AI move.',
    }),
    status: Schema.String.annotations({
      description: 'Game status after the AI move.',
    }),
    position: Schema.String.annotations({
      description: 'The position the AI chose as "row,col".',
    }),
  }),
  services: [Database.Service],
});

export const Print = Operation.make({
  meta: {
    key: 'org.dxos.function.tictactoe.print',
    name: 'Print Board',
    description: 'Prints the Tic-Tac-Toe board as ASCII.',
  },
  input: Schema.Struct({
    board: Schema.String.annotations({
      description: 'Flat board string.',
    }),
    size: Schema.Number.annotations({
      description: 'Board dimension.',
    }),
  }),
  output: Schema.Struct({
    ascii: Schema.String,
  }),
});
```

- [ ] **Step 9: Create `src/operations/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./move'),
  () => import('./ai-move'),
  () => import('./print'),
);

export { Create, MakeMove, AiMove, Print } from './definitions';
export const TicTacToeHandlers = Handlers;
```

- [ ] **Step 10: Create empty blueprint stubs**

`src/blueprints/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

export { default as TicTacToeBlueprint } from './tictactoe-blueprint';
```

`src/blueprints/tictactoe-blueprint.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { AiMove, Create, MakeMove, Print } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.tictactoe';

const operations = [Create, MakeMove, AiMove, Print];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Tic-Tac-Toe',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are a Tic-Tac-Toe game assistant.
        You can create games, make moves, and analyze board state.
        Use the print operation to see the current board before suggesting moves.
        Don't make a move unless asked to.
        When playing, consider the board size and win condition.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
```

- [ ] **Step 11: Create capability stubs**

`src/capabilities/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type OperationHandlerSet } from '@dxos/operation';

import { Capability } from '@dxos/app-framework';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

`src/capabilities/react-surface.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TicTacToeArticle, TicTacToeCard } from '#containers';
import { TicTacToe } from '#types';

export default Capability.makeModule(() =>
  Capabilities.ReactSurface.of([
    Surface.create({
      id: 'tictactoe-game',
      role: ['article', 'section'],
      filter: AppSurface.objectArticle(TicTacToe.Game),
      component: ({ data, role }) => (
        <TicTacToeArticle role={role} subject={data.subject} attendableId={data.attendableId} />
      ),
    }),
    Surface.create({
      id: 'tictactoe-card',
      role: ['card--content'],
      filter: AppSurface.objectCard(TicTacToe.Game),
      component: ({ data, role }) => <TicTacToeCard role={role} subject={data.subject} />,
    }),
  ]),
);
```

`src/capabilities/operation-handler.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/operation';

import { TicTacToeHandlers } from '#operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, TicTacToeHandlers);
  }),
);
```

`src/capabilities/blueprint-definition.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { TicTacToeBlueprint } from '#blueprints';

const blueprintDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
>(() => Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, TicTacToeBlueprint)]));

export default blueprintDefinition;
```

- [ ] **Step 12: Create container stubs**

`src/containers/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TicTacToeArticle: ComponentType<any> = lazy(() => import('./TicTacToeArticle'));
export const TicTacToeCard: ComponentType<any> = lazy(() => import('./TicTacToeCard'));
```

`src/containers/TicTacToeArticle/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

export { TicTacToeArticle as default } from './TicTacToeArticle';
```

`src/containers/TicTacToeArticle/TicTacToeArticle.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { type TicTacToe } from '#types';

export type TicTacToeArticleProps = AppSurface.ObjectArticleProps<TicTacToe.Game>;

export const TicTacToeArticle = ({ role, subject: game }: TicTacToeArticleProps) => {
  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <div className='flex items-center justify-center h-full'>
          <p>Tic-Tac-Toe: {game.name ?? 'Untitled'}</p>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
```

`src/containers/TicTacToeCard/index.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

export { TicTacToeCard as default } from './TicTacToeCard';
```

`src/containers/TicTacToeCard/TicTacToeCard.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { type TicTacToe } from '#types';

export type TicTacToeCardProps = AppSurface.ObjectCardProps<TicTacToe.Game>;

export const TicTacToeCard = ({ subject: game }: TicTacToeCardProps) => {
  return (
    <div className='flex items-center justify-center p-2'>
      <p>{game.name ?? 'Tic-Tac-Toe'}</p>
    </div>
  );
};
```

- [ ] **Step 13: Create `src/components/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//
```

- [ ] **Step 14: Create `src/TicTacToePlugin.tsx`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { TicTacToeBlueprint } from '#blueprints';
import { BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { TicTacToe } from '#types';

import { translations } from './translations';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: TicTacToe.Game.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(TicTacToe.Game).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(TicTacToe.Game).pipe(Option.getOrThrow).hue ?? 'white',
        blueprints: [TicTacToeBlueprint.key],
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = TicTacToe.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [TicTacToe.Game] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 15: Create `src/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './blueprints';
export * from './meta';
export * from './types';
export * from './TicTacToePlugin';
```

- [ ] **Step 16: Register plugin in composer-app**

Add to `packages/apps/composer-app/package.json` dependencies (alphabetical, after `@dxos/plugin-thread`):

```json
"@dxos/plugin-tictactoe": "workspace:*",
```

Add import to `packages/apps/composer-app/src/plugin-defs.tsx` (after the `ThreadPlugin` import, line 60):

```typescript
import { TicTacToePlugin } from '@dxos/plugin-tictactoe';
```

The `TicTacToePlugin()` call is already present in `getPlugins()` at line 248.

- [ ] **Step 17: Install dependencies and verify build**

```bash
pnpm install
moon run plugin-tictactoe:build
```

Expected: Build succeeds (ignore DEPOT_TOKEN warning).

- [ ] **Step 18: Commit skeleton**

```bash
git add packages/plugins/plugin-tictactoe/ packages/apps/composer-app/package.json packages/apps/composer-app/src/plugin-defs.tsx
git commit -m "feat(plugin-tictactoe): add plugin skeleton"
```

---

### Task 2: Game Logic (Pure Functions)

**Files:**

- Create: `packages/plugins/plugin-tictactoe/src/components/game-logic.ts`
- Create: `packages/plugins/plugin-tictactoe/src/components/game-logic.test.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { checkWin, currentTurn, getValidMoves, getWinningCells, makeBoard, placeMarker } from './game-logic';

describe('game-logic', () => {
  describe('makeBoard', () => {
    test('creates empty board of given size', ({ expect }) => {
      const board = makeBoard(3);
      expect(board).toBe('---------');
      expect(board.length).toBe(9);
    });

    test('creates 5x5 board', ({ expect }) => {
      const board = makeBoard(5);
      expect(board).toBe('-'.repeat(25));
    });
  });

  describe('currentTurn', () => {
    test('X goes first on empty board', ({ expect }) => {
      expect(currentTurn('---------')).toBe('X');
    });

    test('O goes after one X', ({ expect }) => {
      expect(currentTurn('X--------')).toBe('O');
    });

    test('X goes after X and O', ({ expect }) => {
      expect(currentTurn('XO-------')).toBe('X');
    });
  });

  describe('placeMarker', () => {
    test('places X at position', ({ expect }) => {
      const result = placeMarker('---------', 3, 1, 1, 'X');
      expect(result.board).toBe('----X----');
      expect(result.error).toBeUndefined();
    });

    test('rejects occupied cell', ({ expect }) => {
      const result = placeMarker('----X----', 3, 1, 1, 'O');
      expect(result.error).toBe('CellOccupied');
      expect(result.board).toBe('----X----');
    });

    test('rejects out of bounds', ({ expect }) => {
      const result = placeMarker('---------', 3, 3, 0, 'X');
      expect(result.error).toBe('OutOfBounds');
    });
  });

  describe('getValidMoves', () => {
    test('all cells valid on empty board', ({ expect }) => {
      expect(getValidMoves('---------')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    test('excludes occupied cells', ({ expect }) => {
      expect(getValidMoves('X---O----')).toEqual([1, 2, 3, 5, 6, 7, 8]);
    });
  });

  describe('checkWin', () => {
    test('playing on empty board', ({ expect }) => {
      expect(checkWin('---------', 3, 3)).toBe('playing');
    });

    test('X wins top row', ({ expect }) => {
      expect(checkWin('XXX-O-O--', 3, 3)).toBe('x-wins');
    });

    test('O wins diagonal', ({ expect }) => {
      expect(checkWin('O-X-O-X-O', 3, 3)).toBe('o-wins');
    });

    test('draw when board full', ({ expect }) => {
      expect(checkWin('XOXXOXOOX', 3, 3)).toBe('draw');
    });

    test('playing when board not full and no winner', ({ expect }) => {
      expect(checkWin('XO-------', 3, 3)).toBe('playing');
    });

    test('4-in-a-row on 5x5 board', ({ expect }) => {
      // Row 0: X X X X -
      const board = 'XXXX-' + '-'.repeat(20);
      expect(checkWin(board, 5, 4)).toBe('x-wins');
    });

    test('3-in-a-row not enough when winCondition is 4', ({ expect }) => {
      const board = 'XXX--' + '-'.repeat(20);
      expect(checkWin(board, 5, 4)).toBe('playing');
    });

    test('column win', ({ expect }) => {
      expect(checkWin('X--X--X--', 3, 3)).toBe('x-wins');
    });

    test('anti-diagonal win', ({ expect }) => {
      expect(checkWin('--X-X-X--', 3, 3)).toBe('x-wins');
    });
  });

  describe('getWinningCells', () => {
    test('returns winning cell indices for top row', ({ expect }) => {
      expect(getWinningCells('XXX-O-O--', 3, 3)).toEqual([0, 1, 2]);
    });

    test('returns winning cell indices for diagonal', ({ expect }) => {
      expect(getWinningCells('X---X---X', 3, 3)).toEqual([0, 4, 8]);
    });

    test('returns empty array when no winner', ({ expect }) => {
      expect(getWinningCells('---------', 3, 3)).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
moon run plugin-tictactoe:test -- src/components/game-logic.test.ts
```

Expected: FAIL — module `./game-logic` not found.

- [ ] **Step 3: Write the game logic implementation**

```typescript
//
// Copyright 2026 DXOS.org
//

/**
 * Creates an empty board string of the given dimension.
 */
export const makeBoard = (size: number): string => '-'.repeat(size * size);

/**
 * Determines whose turn it is based on the board state.
 * X always goes first.
 */
export const currentTurn = (board: string): 'X' | 'O' => {
  const xCount = [...board].filter((cell) => cell === 'X').length;
  const oCount = [...board].filter((cell) => cell === 'O').length;
  return xCount <= oCount ? 'X' : 'O';
};

/**
 * Returns indices of all empty cells.
 */
export const getValidMoves = (board: string): number[] =>
  [...board].reduce<number[]>((moves, cell, index) => {
    if (cell === '-') {
      moves.push(index);
    }
    return moves;
  }, []);

type PlaceResult = { board: string; error?: undefined } | { board: string; error: string };

/**
 * Places a marker at the given row/col. Returns the new board or an error.
 */
export const placeMarker = (board: string, size: number, row: number, col: number, marker: 'X' | 'O'): PlaceResult => {
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return { board, error: 'OutOfBounds' };
  }
  const index = row * size + col;
  if (board[index] !== '-') {
    return { board, error: 'CellOccupied' };
  }
  const newBoard = board.substring(0, index) + marker + board.substring(index + 1);
  return { board: newBoard };
};

/**
 * Generates all lines (rows, columns, diagonals) that could win.
 */
const getLines = (size: number, winCondition: number): number[][] => {
  const lines: number[][] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - winCondition; col++) {
      lines.push(Array.from({ length: winCondition }, (_, index) => row * size + col + index));
    }
  }

  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - winCondition; row++) {
      lines.push(Array.from({ length: winCondition }, (_, index) => (row + index) * size + col));
    }
  }

  for (let row = 0; row <= size - winCondition; row++) {
    for (let col = 0; col <= size - winCondition; col++) {
      lines.push(Array.from({ length: winCondition }, (_, index) => (row + index) * size + (col + index)));
    }
  }

  for (let row = 0; row <= size - winCondition; row++) {
    for (let col = winCondition - 1; col < size; col++) {
      lines.push(Array.from({ length: winCondition }, (_, index) => (row + index) * size + (col - index)));
    }
  }

  return lines;
};

/**
 * Checks the board for a winner or draw.
 */
export const checkWin = (board: string, size: number, winCondition: number): string => {
  const lines = getLines(size, winCondition);
  for (const line of lines) {
    const first = board[line[0]];
    if (first !== '-' && line.every((index) => board[index] === first)) {
      return first === 'X' ? 'x-wins' : 'o-wins';
    }
  }
  if (!board.includes('-')) {
    return 'draw';
  }
  return 'playing';
};

/**
 * Returns the indices of the winning cells, or empty array if no winner.
 */
export const getWinningCells = (board: string, size: number, winCondition: number): number[] => {
  const lines = getLines(size, winCondition);
  for (const line of lines) {
    const first = board[line[0]];
    if (first !== '-' && line.every((index) => board[index] === first)) {
      return line;
    }
  }
  return [];
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
moon run plugin-tictactoe:test -- src/components/game-logic.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-tictactoe/src/components/game-logic.ts packages/plugins/plugin-tictactoe/src/components/game-logic.test.ts
git commit -m "feat(plugin-tictactoe): add game logic with tests"
```

---

### Task 3: AI Engine

**Files:**

- Create: `packages/plugins/plugin-tictactoe/src/components/ai-engine.ts`
- Create: `packages/plugins/plugin-tictactoe/src/components/ai-engine.test.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { computeAiMove } from './ai-engine';

describe('ai-engine', () => {
  describe('easy', () => {
    test('returns a valid move on empty board', ({ expect }) => {
      const move = computeAiMove('---------', 3, 3, 'X', 'easy');
      expect(move).toBeGreaterThanOrEqual(0);
      expect(move).toBeLessThan(9);
    });

    test('returns a valid move on partial board', ({ expect }) => {
      const board = 'XO--X----';
      const move = computeAiMove(board, 3, 3, 'O', 'easy');
      expect(board[move]).toBe('-');
    });

    test('returns -1 on full board', ({ expect }) => {
      const move = computeAiMove('XOXXOXOOX', 3, 3, 'X', 'easy');
      expect(move).toBe(-1);
    });
  });

  describe('medium', () => {
    test('takes winning move when available', ({ expect }) => {
      // O can win at position 2 (top row: O O -)
      const board = 'OO-------';
      const move = computeAiMove(board, 3, 3, 'O', 'medium');
      expect(move).toBe(2);
    });

    test('blocks opponent winning move', ({ expect }) => {
      // X has X X - on top row; O should block at position 2
      const board = 'XX-O-----';
      const move = computeAiMove(board, 3, 3, 'O', 'medium');
      expect(move).toBe(2);
    });

    test('prefers center on empty board', ({ expect }) => {
      const move = computeAiMove('---------', 3, 3, 'X', 'medium');
      expect(move).toBe(4);
    });
  });

  describe('hard', () => {
    test('takes winning move', ({ expect }) => {
      const board = 'XX-------';
      const move = computeAiMove(board, 3, 3, 'X', 'hard');
      expect(move).toBe(2);
    });

    test('blocks opponent winning move', ({ expect }) => {
      const board = 'OO--X----';
      const move = computeAiMove(board, 3, 3, 'X', 'hard');
      expect(move).toBe(2);
    });

    test('plays corner against center opening', ({ expect }) => {
      const board = '----X----';
      const move = computeAiMove(board, 3, 3, 'O', 'hard');
      expect([0, 2, 6, 8]).toContain(move);
    });

    test('never loses as X on 3x3', ({ expect }) => {
      // Play a full game: hard AI as X vs hard AI as O
      // Hard AI should never lose.
      let board = '---------';
      let turn: 'X' | 'O' = 'X';
      for (let step = 0; step < 9; step++) {
        const move = computeAiMove(board, 3, 3, turn, 'hard');
        if (move === -1) {
          break;
        }
        board = board.substring(0, move) + turn + board.substring(move + 1);
        turn = turn === 'X' ? 'O' : 'X';
      }
      // Hard vs hard on 3x3 should always draw
      expect(board.includes('-')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
moon run plugin-tictactoe:test -- src/components/ai-engine.test.ts
```

Expected: FAIL — module `./ai-engine` not found.

- [ ] **Step 3: Write the AI engine implementation**

```typescript
//
// Copyright 2026 DXOS.org
//

import { checkWin, getValidMoves } from './game-logic';

/**
 * Computes an AI move. Returns the board index, or -1 if no moves available.
 */
export const computeAiMove = (
  board: string,
  size: number,
  winCondition: number,
  marker: 'X' | 'O',
  difficulty: string,
): number => {
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    return -1;
  }

  switch (difficulty) {
    case 'easy':
      return easyMove(validMoves);
    case 'medium':
      return mediumMove(board, size, winCondition, marker, validMoves);
    case 'hard':
      return hardMove(board, size, winCondition, marker, validMoves);
    default:
      return mediumMove(board, size, winCondition, marker, validMoves);
  }
};

const easyMove = (validMoves: number[]): number => {
  return validMoves[Math.floor(Math.random() * validMoves.length)];
};

const opponent = (marker: 'X' | 'O'): 'X' | 'O' => (marker === 'X' ? 'O' : 'X');

const tryPlace = (board: string, index: number, marker: string): string =>
  board.substring(0, index) + marker + board.substring(index + 1);

const mediumMove = (
  board: string,
  size: number,
  winCondition: number,
  marker: 'X' | 'O',
  validMoves: number[],
): number => {
  // Win if possible.
  for (const move of validMoves) {
    if (checkWin(tryPlace(board, move, marker), size, winCondition) === `${marker.toLowerCase()}-wins`) {
      return move;
    }
  }

  // Block opponent's win.
  const opp = opponent(marker);
  for (const move of validMoves) {
    if (checkWin(tryPlace(board, move, opp), size, winCondition) === `${opp.toLowerCase()}-wins`) {
      return move;
    }
  }

  // Prefer center.
  const center = Math.floor(size / 2) * size + Math.floor(size / 2);
  if (validMoves.includes(center)) {
    return center;
  }

  // Prefer corners.
  const corners = [0, size - 1, size * (size - 1), size * size - 1];
  const availableCorners = corners.filter((corner) => validMoves.includes(corner));
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }

  return easyMove(validMoves);
};

const hardMove = (
  board: string,
  size: number,
  winCondition: number,
  marker: 'X' | 'O',
  validMoves: number[],
): number => {
  // For large boards, fall back to medium to avoid expensive minimax.
  if (validMoves.length > 16) {
    return mediumMove(board, size, winCondition, marker, validMoves);
  }

  let bestScore = -Infinity;
  let bestMove = validMoves[0];

  for (const move of validMoves) {
    const newBoard = tryPlace(board, move, marker);
    const score = minimax(newBoard, size, winCondition, 0, false, marker, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

const minimax = (
  board: string,
  size: number,
  winCondition: number,
  depth: number,
  isMaximizing: boolean,
  aiMarker: 'X' | 'O',
  alpha: number,
  beta: number,
): number => {
  const status = checkWin(board, size, winCondition);
  if (status === `${aiMarker.toLowerCase()}-wins`) {
    return 10 - depth;
  }
  if (status === `${opponent(aiMarker).toLowerCase()}-wins`) {
    return depth - 10;
  }
  if (status === 'draw') {
    return 0;
  }

  const validMoves = getValidMoves(board);
  const currentMarker = isMaximizing ? aiMarker : opponent(aiMarker);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of validMoves) {
      const score = minimax(
        tryPlace(board, move, currentMarker),
        size,
        winCondition,
        depth + 1,
        false,
        aiMarker,
        alpha,
        beta,
      );
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break;
      }
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of validMoves) {
      const score = minimax(
        tryPlace(board, move, currentMarker),
        size,
        winCondition,
        depth + 1,
        true,
        aiMarker,
        alpha,
        beta,
      );
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break;
      }
    }
    return minScore;
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
moon run plugin-tictactoe:test -- src/components/ai-engine.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-tictactoe/src/components/ai-engine.ts packages/plugins/plugin-tictactoe/src/components/ai-engine.test.ts
git commit -m "feat(plugin-tictactoe): add AI engine with easy/medium/hard difficulty"
```

---

### Task 4: Operation Handlers

**Files:**

- Create: `packages/plugins/plugin-tictactoe/src/operations/create.ts`
- Create: `packages/plugins/plugin-tictactoe/src/operations/move.ts`
- Create: `packages/plugins/plugin-tictactoe/src/operations/ai-move.ts`
- Create: `packages/plugins/plugin-tictactoe/src/operations/print.ts`

- [ ] **Step 1: Create `src/operations/create.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { TicTacToe } from '../types';
import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, size, winCondition, difficulty }) {
      return yield* Database.add(TicTacToe.make({ name, size, winCondition, difficulty }));
    }),
  ),
);

export default handler;
```

- [ ] **Step 2: Create `src/operations/move.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { checkWin, currentTurn, placeMarker } from '../components/game-logic';
import { type TicTacToe } from '../types';
import { MakeMove } from './definitions';

const handler: Operation.WithHandler<typeof MakeMove> = MakeMove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, position }) {
      const obj = (yield* Database.load(game)) as TicTacToe.Game;
      const [rowStr, colStr] = position.split(',');
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);
      const marker = currentTurn(obj.board);

      const result = placeMarker(obj.board, obj.size, row, col, marker);
      if (result.error) {
        return yield* Effect.fail(new Error(result.error));
      }

      const status = checkWin(result.board, obj.size, obj.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = obj.moves ? `${obj.moves};${moveEntry}` : moveEntry;

      Obj.change(obj, (game) => {
        const mutable = game as Obj.Mutable<typeof game>;
        mutable.board = result.board;
        mutable.status = status;
        mutable.moves = moves;
      });

      return { board: result.board, status };
    }),
  ),
);

export default handler;
```

- [ ] **Step 3: Create `src/operations/ai-move.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { computeAiMove } from '../components/ai-engine';
import { checkWin, currentTurn } from '../components/game-logic';
import { type TicTacToe } from '../types';
import { AiMove } from './definitions';

const handler: Operation.WithHandler<typeof AiMove> = AiMove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, difficulty }) {
      const obj = (yield* Database.load(game)) as TicTacToe.Game;
      const marker = currentTurn(obj.board);
      const diff = difficulty ?? obj.difficulty ?? 'medium';

      const moveIndex = computeAiMove(obj.board, obj.size, obj.winCondition, marker, diff);
      if (moveIndex === -1) {
        return yield* Effect.fail(new Error('GameOver'));
      }

      const row = Math.floor(moveIndex / obj.size);
      const col = moveIndex % obj.size;
      const newBoard = obj.board.substring(0, moveIndex) + marker + obj.board.substring(moveIndex + 1);
      const status = checkWin(newBoard, obj.size, obj.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = obj.moves ? `${obj.moves};${moveEntry}` : moveEntry;

      Obj.change(obj, (game) => {
        const mutable = game as Obj.Mutable<typeof game>;
        mutable.board = newBoard;
        mutable.status = status;
        mutable.moves = moves;
      });

      return { board: newBoard, status, position: `${row},${col}` };
    }),
  ),
);

export default handler;
```

- [ ] **Step 4: Create `src/operations/print.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Print } from './definitions';

const handler: Operation.WithHandler<typeof Print> = Print.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ board, size }) {
      const rows: string[] = [];
      const separator = '-'.repeat(size * 4 + 1);
      for (let row = 0; row < size; row++) {
        const cells: string[] = [];
        for (let col = 0; col < size; col++) {
          const cell = board[row * size + col];
          cells.push(cell === '-' ? ' ' : cell);
        }
        rows.push('| ' + cells.join(' | ') + ' |');
        if (row < size - 1) {
          rows.push(separator);
        }
      }
      return { ascii: rows.join('\n') };
    }),
  ),
);

export default handler;
```

- [ ] **Step 5: Build and verify**

```bash
moon run plugin-tictactoe:build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-tictactoe/src/operations/
git commit -m "feat(plugin-tictactoe): add operation handlers"
```

---

### Task 5: TicTacToeBoard Component

**Files:**

- Create: `packages/plugins/plugin-tictactoe/src/components/TicTacToeBoard/index.ts`
- Create: `packages/plugins/plugin-tictactoe/src/components/TicTacToeBoard/TicTacToeBoard.tsx`
- Create: `packages/plugins/plugin-tictactoe/src/components/TicTacToeBoard/TicTacToeBoard.stories.tsx`
- Modify: `packages/plugins/plugin-tictactoe/src/components/index.ts`

- [ ] **Step 1: Create the TicTacToeBoard component**

`src/components/TicTacToeBoard/TicTacToeBoard.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import React, { type FC, useCallback, useState } from 'react';

import { mx } from '@dxos/ui-theme';

export type TicTacToeBoardProps = {
  board: string;
  size: number;
  winningCells?: number[];
  disabled?: boolean;
  onCellClick?: (row: number, col: number) => void;
};

const XMarker: FC<{ animate?: boolean }> = ({ animate }) => (
  <svg viewBox='0 0 100 100' className={mx('w-3/5 h-3/5', animate && 'animate-in zoom-in-0 duration-300')}>
    <line x1='20' y1='20' x2='80' y2='80' stroke='currentColor' strokeWidth='12' strokeLinecap='round' className='text-red-500' />
    <line x1='80' y1='20' x2='20' y2='80' stroke='currentColor' strokeWidth='12' strokeLinecap='round' className='text-red-500' />
  </svg>
);

const OMarker: FC<{ animate?: boolean }> = ({ animate }) => (
  <svg viewBox='0 0 100 100' className={mx('w-3/5 h-3/5', animate && 'animate-in zoom-in-0 duration-300')}>
    <circle cx='50' cy='50' r='30' fill='none' stroke='currentColor' strokeWidth='12' className='text-blue-500' />
  </svg>
);

export const TicTacToeBoard = ({ board, size, winningCells = [], disabled = false, onCellClick }: TicTacToeBoardProps) => {
  const [lastPlaced, setLastPlaced] = useState<number>(-1);

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (disabled) {
        return;
      }
      const index = row * size + col;
      if (board[index] !== '-') {
        return;
      }
      setLastPlaced(index);
      onCellClick?.(row, col);
    },
    [board, size, disabled, onCellClick],
  );

  return (
    <div
      className='grid gap-1 aspect-square w-full max-w-[400px]'
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {Array.from({ length: size * size }, (_, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        const cell = board[index];
        const isWinning = winningCells.includes(index);
        const isNew = index === lastPlaced;
        const isEmpty = cell === '-';

        return (
          <button
            key={index}
            className={mx(
              'flex items-center justify-center aspect-square rounded-md transition-colors',
              'bg-neutral-100 dark:bg-neutral-800',
              isEmpty && !disabled && 'hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer',
              !isEmpty && 'cursor-default',
              disabled && isEmpty && 'cursor-not-allowed opacity-60',
              isWinning && 'animate-pulse bg-emerald-100 dark:bg-emerald-900/40',
            )}
            onClick={() => handleClick(row, col)}
            disabled={disabled || !isEmpty}
            aria-label={`Cell ${row},${col}: ${cell === '-' ? 'empty' : cell}`}
          >
            {cell === 'X' && <XMarker animate={isNew} />}
            {cell === 'O' && <OMarker animate={isNew} />}
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/components/TicTacToeBoard/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TicTacToeBoard';
```

- [ ] **Step 3: Update `src/components/index.ts`**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TicTacToeBoard';
```

- [ ] **Step 4: Create storybook**

`src/components/TicTacToeBoard/TicTacToeBoard.stories.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TicTacToeBoard, type TicTacToeBoardProps } from './TicTacToeBoard';

const DefaultStory = (props: TicTacToeBoardProps) => (
  <div className='flex items-center justify-center p-8'>
    <TicTacToeBoard {...props} />
  </div>
);

const meta = {
  title: 'plugins/plugin-tictactoe/components/TicTacToeBoard',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty3x3: Story = {
  args: { board: '---------', size: 3 },
};

export const MidGame: Story = {
  args: { board: 'X-O-X-O--', size: 3 },
};

export const XWins: Story = {
  args: { board: 'XXXOO----', size: 3, winningCells: [0, 1, 2], disabled: true },
};

export const Draw: Story = {
  args: { board: 'XOXXOXOOX', size: 3, disabled: true },
};

export const Large5x5: Story = {
  args: { board: '-'.repeat(25), size: 5 },
};

export const Large5x5MidGame: Story = {
  args: {
    board: 'X---O----X---O-------X---',
    size: 5,
  },
};
```

- [ ] **Step 5: Build and verify**

```bash
moon run plugin-tictactoe:build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-tictactoe/src/components/
git commit -m "feat(plugin-tictactoe): add TicTacToeBoard component with storybook"
```

---

### Task 6: TicTacToeArticle Container

**Files:**

- Modify: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeArticle/TicTacToeArticle.tsx`
- Create: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeArticle/TicTacToeArticle.stories.tsx`

- [ ] **Step 1: Implement the full article container**

Replace `src/containers/TicTacToeArticle/TicTacToeArticle.tsx` with:

```typescript
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { computeAiMove } from '#components/ai-engine';
import { TicTacToeBoard } from '#components';
import { checkWin, currentTurn, getWinningCells, makeBoard, placeMarker } from '#components/game-logic';
import { meta } from '#meta';
import { type TicTacToe } from '#types';

export type TicTacToeArticleProps = AppSurface.ObjectArticleProps<TicTacToe.Game>;

export const TicTacToeArticle = ({ role, subject: game }: TicTacToeArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [aiThinking, setAiThinking] = useState(false);

  const turn = currentTurn(game.board);
  const status = game.status;
  const winningCells = getWinningCells(game.board, game.size, game.winCondition);
  const isGameOver = status !== 'playing';

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (isGameOver || aiThinking) {
        return;
      }

      const marker = currentTurn(game.board);
      const result = placeMarker(game.board, game.size, row, col, marker);
      if (result.error) {
        return;
      }

      const newStatus = checkWin(result.board, game.size, game.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = game.moves ? `${game.moves};${moveEntry}` : moveEntry;

      Obj.change(game, (draft) => {
        const mutable = draft as Obj.Mutable<typeof draft>;
        mutable.board = result.board;
        mutable.status = newStatus;
        mutable.moves = moves;
      });
    },
    [game, isGameOver, aiThinking],
  );

  // AI turn.
  useEffect(() => {
    if (!game.difficulty || isGameOver || aiThinking) {
      return;
    }

    const nextTurn = currentTurn(game.board);
    // AI plays as O when difficulty is set.
    if (nextTurn !== 'O') {
      return;
    }

    setAiThinking(true);
    const timeout = setTimeout(() => {
      const moveIndex = computeAiMove(game.board, game.size, game.winCondition, 'O', game.difficulty!);
      if (moveIndex === -1) {
        setAiThinking(false);
        return;
      }

      const row = Math.floor(moveIndex / game.size);
      const col = moveIndex % game.size;
      const newBoard = game.board.substring(0, moveIndex) + 'O' + game.board.substring(moveIndex + 1);
      const newStatus = checkWin(newBoard, game.size, game.winCondition);
      const moveEntry = `O:${row},${col}`;
      const moves = game.moves ? `${game.moves};${moveEntry}` : moveEntry;

      Obj.change(game, (draft) => {
        const mutable = draft as Obj.Mutable<typeof draft>;
        mutable.board = newBoard;
        mutable.status = newStatus;
        mutable.moves = moves;
      });
      setAiThinking(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [game.board, game.difficulty, game.size, game.winCondition, isGameOver, aiThinking]);

  const handleNewGame = useCallback(() => {
    const newBoard = makeBoard(game.size);
    Obj.change(game, (draft) => {
      const mutable = draft as Obj.Mutable<typeof draft>;
      mutable.board = newBoard;
      mutable.status = 'playing';
      mutable.moves = '';
    });
  }, [game]);

  const statusText = (() => {
    if (aiThinking) {
      return t('ai-thinking');
    }
    switch (status) {
      case 'x-wins':
        return t('x-wins');
      case 'o-wins':
        return t('o-wins');
      case 'draw':
        return t('draw');
      default:
        return turn === 'X' ? t('x-turn') : t('o-turn');
    }
  })();

  return (
    <Panel.Root role={role} classNames='@container'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleNewGame}>{t('new-game')}</Toolbar.Button>
          <div className='grow' />
          <span className={mx('text-sm', isGameOver && 'font-semibold')}>{statusText}</span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div
          className={mx(
            'flex items-center justify-center h-full w-full',
            role === 'article' && 'p-4',
            role === 'section' && 'aspect-square',
          )}
        >
          <TicTacToeBoard
            board={game.board}
            size={game.size}
            winningCells={winningCells}
            disabled={isGameOver || aiThinking}
            onCellClick={handleCellClick}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
```

- [ ] **Step 2: Create storybook**

`src/containers/TicTacToeArticle/TicTacToeArticle.stories.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TicTacToe } from '#types';

import { translations } from '../../translations';
import { TicTacToeArticle } from './TicTacToeArticle';

type DefaultStoryProps = {
  size?: number;
  winCondition?: number;
  difficulty?: string;
};

const DefaultStory = ({ size = 3, winCondition, difficulty }: DefaultStoryProps) => {
  const game = useMemo(
    () => TicTacToe.make({ name: 'Test Game', size, winCondition, difficulty }),
    [size, winCondition, difficulty],
  );
  return <TicTacToeArticle role='article' subject={game} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-tictactoe/containers/TicTacToeArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Large5x5: Story = {
  args: { size: 5, winCondition: 4 },
};

export const WithAiEasy: Story = {
  args: { difficulty: 'easy' },
};

export const WithAiHard: Story = {
  args: { difficulty: 'hard' },
};
```

- [ ] **Step 3: Build and verify**

```bash
moon run plugin-tictactoe:build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-tictactoe/src/containers/TicTacToeArticle/
git commit -m "feat(plugin-tictactoe): implement TicTacToeArticle with AI and game logic"
```

---

### Task 7: TicTacToeCard Container

**Files:**

- Modify: `packages/plugins/plugin-tictactoe/src/containers/TicTacToeCard/TicTacToeCard.tsx`

- [ ] **Step 1: Implement the card container**

Replace `src/containers/TicTacToeCard/TicTacToeCard.tsx` with:

```typescript
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { TicTacToeBoard } from '#components';
import { getWinningCells } from '#components/game-logic';
import { type TicTacToe } from '#types';

export type TicTacToeCardProps = AppSurface.ObjectCardProps<TicTacToe.Game>;

export const TicTacToeCard = ({ subject: game }: TicTacToeCardProps) => {
  const winningCells = getWinningCells(game.board, game.size, game.winCondition);

  return (
    <div className='flex items-center justify-center p-2'>
      <TicTacToeBoard board={game.board} size={game.size} winningCells={winningCells} disabled />
    </div>
  );
};
```

- [ ] **Step 2: Build and verify**

```bash
moon run plugin-tictactoe:build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-tictactoe/src/containers/TicTacToeCard/
git commit -m "feat(plugin-tictactoe): implement TicTacToeCard container"
```

---

### Task 8: Final Build, Lint, and Test

**Files:** None new — validation only.

- [ ] **Step 1: Run linter**

```bash
moon run plugin-tictactoe:lint -- --fix
```

Expected: Passes (or fixable issues auto-corrected).

- [ ] **Step 2: Run all tests**

```bash
moon run plugin-tictactoe:test
```

Expected: All game-logic and ai-engine tests pass.

- [ ] **Step 3: Full build**

```bash
moon run plugin-tictactoe:build
```

Expected: Build succeeds.

- [ ] **Step 4: Verify composer-app builds with plugin**

```bash
moon run composer-app:build
```

Expected: Build succeeds with the new plugin registered.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A packages/plugins/plugin-tictactoe/
git commit -m "chore(plugin-tictactoe): lint fixes"
```
