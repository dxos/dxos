//
// Copyright 2026 DXOS.org
//

import { type Pipeline } from '@dxos/echo-memory';

// Kept out of `PipelineCompanion.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

/** How many sources the companion's table lists, busiest first. */
export const TOP_SOURCES = 10;

export const count = (value: number): string => value.toLocaleString('en-US');

/** A date as a reader says it, `Sep 17`. */
export const day = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '–';

/** A date and time, `Sep 17, 15:36`. */
export const moment = (iso: string | undefined): string =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      })
    : '–';

/** The time between two instants, `16 min` or `2 h 5 min`. */
export const elapsed = (from?: string, to?: string): string | undefined => {
  if (!from || !to) {
    return undefined;
  }
  const total = Math.round((Date.parse(to) - Date.parse(from)) / 60_000);
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`;
};

export const usd = (value: number): string => (value < 10 ? `$${value.toFixed(2)}` : `$${Math.round(value)}`);

/** A model id as a reader names it: `claude-haiku-5-5` reads `Haiku 5.5`. */
export const modelName = (model: string): string => {
  const claude = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(model);
  if (!claude) {
    return model;
  }
  const [, family, major, minor] = claude;
  return `${family[0].toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ''}`;
};

/** A scene DSL string literal, cut so it fits its card. */
const quote = (text: string, max = 40): string =>
  JSON.stringify(text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** The run's totals across its sources and models. */
export const totals = (state: Pipeline.State) => {
  const sources = state.sources.filter((source) => source.items > 0);
  const usages = state.stages.flatMap((stage) => stage.models);
  return {
    sources: sources.length,
    items: sources.reduce((sum, source) => sum + source.items, 0),
    first: sources.flatMap((source) => (source.firstItemAt ? [source.firstItemAt] : [])).sort()[0],
    last: sources
      .flatMap((source) => (source.lastItemAt ? [source.lastItemAt] : []))
      .sort()
      .at(-1),
    calls: usages.reduce((sum, usage) => sum + usage.calls, 0),
    tokens: usages.reduce(
      (sum, usage) => sum + usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens,
      0,
    ),
    costUsd: usages.every((usage) => usage.costUsd !== undefined)
      ? usages.reduce((sum, usage) => sum + (usage.costUsd ?? 0), 0)
      : undefined,
  };
};

/** Card sizes and spacing, in scene units; the companion fits the scene to its width. */
const CARD = { width: 260, height: 72 };
const CHIP = { width: 190, height: 44 };
const STEP = 120;
const SIDE = 260;

type Card = { id: string; text: string; x: number; y: number; hue: string; chip?: boolean; ellipse?: boolean };
type Link = { id: string; from: string; to: string; text?: string; dashed?: boolean };

/**
 * The run as a canvas scene, top to bottom: the community it read with its first and last message beside it, each
 * stage in order with what it passed on, the facts it wrote, and the model the stages called with calls and cost.
 * Drawn by `Scene2DView`, so it takes the canvas's own look rather than a UML figure's.
 */
export const pipelineScene = (state: Pipeline.State): string => {
  const sum = totals(state);
  const stages = [...state.stages].sort((left, right) => left.order - right.order);
  const models = [...new Set(stages.flatMap((stage) => stage.models.map((usage) => usage.model)))];
  const time = elapsed(state.startedAt, state.endedAt);

  const cards: Card[] = [
    { id: 'source', text: `${state.name} · ${count(sum.sources)} channels`, x: 0, y: 0, hue: 'indigo' },
    { id: 'first', text: `first ${moment(sum.first)}`, x: SIDE, y: -24, hue: 'indigo', chip: true },
    { id: 'last', text: `last ${moment(sum.last)}`, x: SIDE, y: 24, hue: 'indigo', chip: true },
    ...stages.map((stage, index) => ({
      id: `stage${index}`,
      text: stage.label,
      x: 0,
      y: STEP * (index + 1),
      hue: stage.models.length > 0 ? 'violet' : 'blue',
    })),
    {
      id: 'memory',
      text: state.facts !== undefined ? `${count(state.facts)} facts` : 'Memory',
      x: 0,
      y: STEP * (stages.length + 1),
      hue: 'green',
      ellipse: true,
    },
    ...models.map((model, index) => ({
      id: `model${index}`,
      text: modelName(model),
      x: SIDE,
      y: STEP * (stages.findIndex((stage) => stage.models.some((usage) => usage.model === model)) + 1.5) + index * STEP,
      hue: 'amber',
      chip: true,
    })),
  ];

  const links: Link[] = [
    ...stages.map((stage, index) => ({
      id: `in${index}`,
      from: index === 0 ? 'source' : `stage${index - 1}`,
      to: `stage${index}`,
      ...(index === 0
        ? { text: `${count(sum.items)} messages` }
        : stages[index - 1].items !== undefined
          ? { text: count(stages[index - 1].items ?? 0) }
          : {}),
    })),
    ...(stages.length > 0 ? [{ id: 'out', from: `stage${stages.length - 1}`, to: 'memory' }] : []),
    ...stages.flatMap((stage, index) =>
      stage.models.map((usage) => ({
        id: `use${index}-${models.indexOf(usage.model)}`,
        from: `stage${index}`,
        to: `model${models.indexOf(usage.model)}`,
        text: `${count(usage.calls)} calls${usage.costUsd !== undefined ? ` · ${usd(usage.costUsd)}` : ''}`,
        dashed: true,
      })),
    ),
  ];

  const height = STEP * (stages.length + 1);
  const lines = [
    `scene pipeline dim=2d layout=pipeline name=${quote(time ? `Pipeline · ${time}` : 'Pipeline')} theme=flat {`,
    `  camera center=${SIDE / 2},${height / 2} zoom=1`,
    '}',
    '',
    'layout pipeline dim=2d {',
    ...cards.map((card) => {
      const size = card.chip ? CHIP : CARD;
      return `  element ${card.id} ${card.ellipse ? 'ellipse' : 'rect'} ${quote(card.text)} @ ${card.x},${card.y} size=${size.width}x${size.height} hue=${card.hue} surface=${card.chip ? 'tint' : 'solid'} border=true rounded=true fontSize=${card.chip ? 17 : 22}`;
    }),
    ...links.map(
      (link) =>
        `  element ${link.id} link${link.text ? ` ${quote(link.text)}` : ''} from=${link.from} to=${link.to} end=arrow${link.dashed ? ' dashed=true' : ''}`,
    ),
    '}',
  ];
  return lines.join('\n');
};
