//
// Copyright 2026 DXOS.org
//

//
// Style mapping between the illustrator scene DSL and excalidraw element props.
// Kept bidirectional so `read.ts` can report only non-default styles back to the agent.
//

import { type Scene } from '@dxos/plugin-illustrator/model';

/** Scene palette → excalidraw stroke colors (tldraw-compatible hues). */
const COLOR_TO_HEX: Record<Scene.Color, string> = {
  'black': '#1e1e1e',
  'grey': '#9fa8b2',
  'light-violet': '#e085f4',
  'violet': '#ae3ec9',
  'blue': '#4263eb',
  'light-blue': '#4dabf7',
  'yellow': '#ffc078',
  'orange': '#f76707',
  'green': '#099268',
  'light-green': '#40c057',
  'light-red': '#ff8787',
  'red': '#e03131',
  'white': '#ffffff',
};

const HEX_TO_COLOR = Object.fromEntries(Object.entries(COLOR_TO_HEX).map(([color, hex]) => [hex, color])) as Record<
  string,
  Scene.Color
>;

const WEIGHT_TO_STROKE_WIDTH: Record<Scene.Weight, number> = { s: 1, m: 2, l: 4, xl: 8 };
const WEIGHT_TO_FONT_SIZE: Record<Scene.Weight, number> = { s: 16, m: 20, l: 28, xl: 36 };

export type StyleProps = {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
};

type SceneStyle = Partial<Pick<Scene.Box, 'color' | 'fill' | 'stroke' | 'weight'>>;

/** Compile scene style fields into excalidraw element props (defaults resolved). */
export const toStyle = ({
  color = 'black',
  fill = 'none',
  stroke = 'sketchy',
  weight = 'm',
}: SceneStyle): StyleProps => ({
  strokeColor: COLOR_TO_HEX[color],
  backgroundColor: fill === 'none' ? 'transparent' : COLOR_TO_HEX[color],
  fillStyle: fill === 'pattern' ? 'hachure' : 'solid',
  strokeWidth: WEIGHT_TO_STROKE_WIDTH[weight],
  strokeStyle: stroke === 'dashed' || stroke === 'dotted' ? stroke : 'solid',
  roughness: stroke === 'sketchy' ? 1 : 0,
});

export const toFontSize = (weight: Scene.Weight = 'm'): number => WEIGHT_TO_FONT_SIZE[weight];

/** Report only non-default styles to keep the read output compact. */
export const readStyle = (record: Record<string, any>): SceneStyle => {
  const color = HEX_TO_COLOR[record.strokeColor];
  const fill: Scene.Fill =
    !record.backgroundColor || record.backgroundColor === 'transparent'
      ? 'none'
      : record.fillStyle === 'hachure'
        ? 'pattern'
        : 'solid';
  const stroke: Scene.Stroke =
    record.strokeStyle === 'dashed' || record.strokeStyle === 'dotted'
      ? record.strokeStyle
      : record.roughness > 0
        ? 'sketchy'
        : 'solid';
  const weight = (Object.entries(WEIGHT_TO_STROKE_WIDTH).find(([, width]) => width === record.strokeWidth)?.[0] ??
    'm') as Scene.Weight;
  return {
    ...(color && color !== 'black' ? { color } : {}),
    ...(fill !== 'none' ? { fill } : {}),
    ...(stroke !== 'sketchy' ? { stroke } : {}),
    ...(weight !== 'm' ? { weight } : {}),
  };
};

export const readTextStyle = (record: Record<string, any>): SceneStyle => {
  const color = HEX_TO_COLOR[record.strokeColor];
  const weight = (Object.entries(WEIGHT_TO_FONT_SIZE).find(([, size]) => size === record.fontSize)?.[0] ??
    'm') as Scene.Weight;
  return {
    ...(color && color !== 'black' ? { color } : {}),
    ...(weight !== 'm' ? { weight } : {}),
  };
};
