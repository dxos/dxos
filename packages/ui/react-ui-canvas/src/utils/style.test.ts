//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Node, type NodeTone, type StyleMap } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { CLASSIC_LOOK, NEU_STYLE_SET, type SceneLook, defaultThemeRegistry, resolveLook } from '../model/index.ts';
import { createNode } from './shapes.ts';
import {
  bareNode,
  canvasFillClass,
  classedLink,
  classedNode,
  drawnColor,
  fontFamily,
  frameClasses,
  frameStyle,
  hueClasses,
  lineClasses,
  lineColor,
  nodeRelief,
  resolveStyle,
  splitClassEdit,
  surfaceClasses,
  textStyleColor,
  variantClasses,
} from './style.ts';

describe('style classes', () => {
  const styles: StyleMap = {
    warn: { id: 'warn', name: 'Warning', style: { color: 'red', stroke: 'dashed', corners: 'all' } },
  };
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    views: [{ nodes, links }],
  } = ViewBuilder.view('s', [
    ViewBuilder.rect('a', box).properties({ style: 'warn', overrides: { color: 'blue' } }),
    ViewBuilder.rect('b', { ...box, x: 400 }).properties({ style: 'gone' }),
    ViewBuilder.link('line', 'a', 'b')
      .id('l')
      .properties({ style: 'warn', overrides: { stroke: 'solid' } }),
  ]).build();

  test('an element takes the look of its named style under its own', ({ expect }) => {
    const classed = classedNode(nodes.a, styles);
    expect(classed.overrides).toEqual({ color: 'blue', stroke: 'dashed', corners: 'all' });
    // It still names its style, so an edit of its look reaches the style.
    expect(classed.style).toBe('warn');
    // A link takes only what its look shares with the style's: its colour, stroke and caption size.
    expect(classedLink(links.l, styles).overrides).toEqual({ color: 'red', stroke: 'solid' });
    const sized = { warn: { ...styles.warn, style: { ...styles.warn.style, fontSize: 18 } } };
    expect(classedLink(links.l, sized).overrides).toEqual({ color: 'red', stroke: 'solid', fontSize: 18 });
  });

  test("a node's stroke draws its border", ({ expect }) => {
    expect(frameClasses(classedNode(nodes.a, styles), false)).toEqual(expect.arrayContaining(['border-dashed']));
  });

  test('a missing class leaves the element as it is', ({ expect }) => {
    expect(classedNode(nodes.b, styles)).toBe(nodes.b);
  });

  test('an edit of a classed look goes to the class, and the element stops overriding it', ({ expect }) => {
    // A shows blue over the class's red; the user picks green and turns rounding off.
    const shown = classedNode(nodes.a, styles).overrides;
    const edited = { color: 'green', corners: 'none' };
    expect(splitClassEdit(shown, edited, styles.warn.style ?? {}, nodes.a.overrides)).toEqual({
      classLook: { color: 'green', stroke: 'dashed', corners: 'none' },
      own: {},
    });
    // An unchanged field stays where it was: A keeps its own blue, the class its red.
    expect(splitClassEdit(shown, { ...shown, corners: 'none' }, styles.warn.style ?? {}, nodes.a.overrides)).toEqual({
      classLook: { color: 'red', stroke: 'dashed', corners: 'none' },
      own: { color: 'blue' },
    });
  });
});

describe('style sets', () => {
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    views: [{ nodes }],
  } = ViewBuilder.view('s', [
    ViewBuilder.rect('plain', box),
    ViewBuilder.rect('blue', box).properties({ overrides: { color: 'blue' } }),
    ViewBuilder.rect('strong', box).properties({ overrides: { color: 'red/1', corners: 'all' } }),
    ViewBuilder.rect('outline', box).properties({ overrides: { color: 'teal/0', stroke: 'dotted' } }),
    ViewBuilder.rect('bare', box).properties({ overrides: { color: 'pink', fill: 'none', stroke: 'none' } }),
    ViewBuilder.rect('guide', box).properties({ overrides: { color: 'green', guide: true } }),
    ViewBuilder.ellipse('round', box).properties({ overrides: { color: 'violet/3' } }),
  ]).build();

  // The classes every node drew before style sets, spelled out so a change to the classic look fails here.
  const before: Record<string, string[]> = {
    plain: ['bg-base-surface', '', 'border-separator', '', 'rounded-sm'],
    blue: ['bg-blue-surface', 'text-blue-fg', 'border-blue-border', '', 'rounded-sm'],
    strong: ['bg-red-500', 'text-neutral-50', 'border-red-border', '', 'rounded-2xl'],
    outline: ['bg-transparent', '', 'border-teal-border', 'border-dotted', 'rounded-sm'],
    bare: ['', 'text-pink-fg', 'border-transparent', '', 'rounded-sm'],
    guide: ['', '', 'border-green-border', 'border-dashed', 'rounded-sm'],
    round: ['bg-violet-300', 'text-violet-900', 'border-violet-border', '', 'rounded-[50%]'],
  };

  test('classic draws every node exactly as before', ({ expect }) => {
    const classic = CLASSIC_LOOK;
    for (const [id, classes] of Object.entries(before)) {
      const node: Node = nodes[id];
      expect(frameClasses(node, false, false, false, classic)).toEqual(classes);
    }
    // Classic's variants are the canvas's four tones, class for class.
    for (const tone of [0, 1, 2, 3] as const) {
      expect(surfaceClasses('blue', tone, classic)).toEqual(hueClasses('blue', tone));
      expect(surfaceClasses(undefined, tone, classic)).toEqual(hueClasses(undefined, tone));
    }
    expect(surfaceClasses('blue', undefined, classic)).toEqual(hueClasses('blue'));
  });

  test('another set restyles the same nodes', ({ expect }) => {
    const glass = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    // Glass's default variant is frost, its light tokens on paper.
    expect(frameClasses(nodes.blue, false, false, false, glass)).toEqual([
      'bg-white/55',
      'text-blue-800',
      'border-blue-900/15',
      '',
      'rounded-lg',
    ]);
    const outline = resolveLook(defaultThemeRegistry, { theme: 'outline' });
    // Outline has no fill and labels in the default text colour; a theme hue outside the pickers draws as the nearest.
    expect(frameClasses(nodes.blue, false, false, false, outline).slice(0, 2)).toEqual(['bg-transparent', '']);
    expect(surfaceClasses('pink', 2, outline).border).toBe(surfaceClasses('red', 2, outline).border);
    // Each tone picks a variant: glass's tint at 2, and outline's dashed border at 2.
    expect(surfaceClasses('blue', 2, glass)).toEqual({
      surface: 'bg-blue-100/60',
      text: 'text-blue-900',
      border: 'border-blue-900/15',
    });
    expect(frameClasses(nodes.outline, false, false, false, outline)[3]).toBe('border-dotted');
    expect(frameClasses(nodes.blue, false, false, false, outline)[3]).toBe('');
    // Selection still draws in the focus colour.
    expect(frameClasses(nodes.blue, true, false, false, glass)[2]).toBe('border-focus');
  });

  test('Neu shapes are the ground colour, hue only accents them, and selection leaves the surface alone', ({
    expect,
  }) => {
    const neu = resolveLook(defaultThemeRegistry, { theme: 'neu-dark' });
    const [surface, text, border] = frameClasses(nodes.blue, false, false, false, neu);
    expect(surface).toBe('bg-(--dx-neu-ground) shadow-(--dx-neu-raised)');
    expect(text).toBe('text-blue-300');
    expect(border).toBe('border-blue-400/45');
    // Neu Light takes the light accents over the same ground.
    const light = frameClasses(
      nodes.blue,
      false,
      false,
      false,
      resolveLook(defaultThemeRegistry, { theme: 'neu-light' }),
    );
    expect(light.slice(0, 3)).toEqual([surface, 'text-blue-700', 'border-blue-500/45']);
    // A shape with no hue still takes an edge, as every 3D Neu body does: a flush one is otherwise invisible.
    const plain = (tone: NodeTone): Node => ({
      ...nodes.plain,
      overrides: { ...nodes.plain.overrides, color: `default/${tone}` },
    });
    for (const tone of [0, 1, 2] as const) {
      expect(frameClasses(plain(tone), false, false, false, neu)[2]).toBe('border-neutral-400/45');
    }
    // Selected: still raised; only the outline shows it.
    const selected = frameClasses(nodes.blue, true, false, false, neu);
    expect(selected[0]).toBe(surface);
    expect(selected[2]).toBe('border-focus');
    // The tone carries indentation: tone 0 is cut in, 1 is level, 2 stands out.
    const toned = (tone: NodeTone): Node => ({
      ...nodes.blue,
      overrides: { ...nodes.blue.overrides, color: `blue/${tone}` },
    });
    expect(frameClasses(toned(0), false, false, false, neu)[0]).toBe('bg-(--dx-neu-ground) shadow-(--dx-neu-inset)');
    expect(frameClasses(toned(1), false, false, false, neu)[0]).toBe('bg-(--dx-neu-ground)');
    expect(frameClasses(toned(2), true, false, false, neu)[0]).toBe(surface);
    const glass = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    expect(frameClasses(nodes.blue, true, false, false, glass)[0]).toBe('bg-white/55');
  });

  test('a silhouette takes its relief from the tone, never from selection', ({ expect }) => {
    const neu = resolveLook(defaultThemeRegistry, { theme: 'neu-dark' });
    const toned = (tone: NodeTone): Node => ({
      ...nodes.blue,
      overrides: { ...nodes.blue.overrides, color: `blue/${tone}` },
    });
    expect(nodeRelief(nodes.blue, neu)).toBe('raised');
    expect(nodeRelief(toned(0), neu)).toBe('inset');
    expect(nodeRelief(toned(1), neu)).toBeUndefined();
    // Unfilled shapes and other sets draw no relief.
    expect(nodeRelief(nodes.bare, neu)).toBeUndefined();
    expect(nodeRelief(nodes.guide, neu)).toBeUndefined();
    expect(nodeRelief(nodes.blue, resolveLook(defaultThemeRegistry, { theme: 'paper' }))).toBeUndefined();
  });

  test('the canvas fill under captions and hollow markers is the Neu ground on a Neu background', ({ expect }) => {
    const neu = resolveLook(defaultThemeRegistry, { theme: 'neu-dark' });
    expect(canvasFillClass(neu, 'opaque')).toBe('fill-(--dx-neu-ground)');
    const glass = resolveLook(defaultThemeRegistry, { theme: 'paper' });
    expect(canvasFillClass(glass, 'opaque')).toBe('fill-white');
  });
});

describe('Neu without a hue', () => {
  test('a Neu shape with no hue draws exactly as Neutral, in every variant and tone', ({ expect }) => {
    for (const variant of NEU_STYLE_SET.variants) {
      for (const tone of ['theme', 'light', 'dark'] as const) {
        expect(variantClasses(undefined, variant, tone)).toEqual(variantClasses('neutral', variant, tone));
      }
    }
  });

  test('a bare kind draws no fill or border unless its look sets them, and an outline kind its border alone', ({
    expect,
  }) => {
    const node = createNode({ kind: 'rect', id: 't', z: 'a0', center: { x: 0, y: 0 } });
    // Unset, the frame's fill is on and its stroke the look's own; a bare kind's are off, so that is what a toggle shows.
    expect(resolveStyle(node.overrides)).toEqual({ fill: 'solid', corners: 'all' });
    expect(resolveStyle(bareNode(node, { bare: true }).overrides)).toMatchObject({ fill: 'none', stroke: 'none' });
    expect(resolveStyle(bareNode({ ...node, overrides: { stroke: 'solid' } }, { bare: true }).overrides)).toMatchObject(
      {
        fill: 'none',
        stroke: 'solid',
      },
    );
    // An outline kind's ring is the frame's border, so it is drawn, and off or filled only when the look says so.
    expect(resolveStyle(bareNode(node, { outline: true }).overrides)).toEqual({ fill: 'none', corners: 'all' });
    expect(
      resolveStyle(bareNode({ ...node, overrides: { fill: 'solid', stroke: 'none' } }, { outline: true }).overrides),
    ).toMatchObject({ fill: 'solid', stroke: 'none' });
    expect(bareNode(node, undefined)).toBe(node);
    expect(bareNode(node, {})).toBe(node);
  });
});

describe('colours', () => {
  const box = { x: 0, y: 0, width: 200, height: 100 };
  const {
    views: [{ nodes }],
  } = ViewBuilder.view('s', [ViewBuilder.rect('plain', box), ViewBuilder.view('window').at(box)]).build();
  const styled = (overrides: Node['overrides'], node: Node = nodes.plain): Node => ({ ...node, overrides });
  // A theme that names a colour of its own, one as a hue and one as a literal.
  const themed: SceneLook = {
    ...CLASSIC_LOOK,
    theme: { ...CLASSIC_LOOK.theme, colors: { accent: 'teal/1', brand: '#1e90ff' } },
  };

  test("a colour draws as a hue at its tone, the look's own colour, or a literal", ({ expect }) => {
    expect(drawnColor(undefined)).toEqual({});
    expect(drawnColor('blue')).toEqual({ hue: 'blue' });
    expect(drawnColor('blue/1')).toEqual({ hue: 'blue', tone: 1 });
    // The look's own colour has no hue, so a tone can be stated without one.
    expect(drawnColor('default/0')).toEqual({ tone: 0 });
    expect(drawnColor('#1e90ff')).toEqual({ css: '#1e90ff' });
    expect(drawnColor('rgb(30 144 255)')).toEqual({ css: 'rgb(30 144 255)' });
    // A string that is no colour draws as none, a tone past the lightest included.
    expect(drawnColor('blue/7')).toEqual({});
    expect(drawnColor('Not A Colour')).toEqual({});
  });

  test('a name the theme defines resolves through it, and the tone the drawing states wins', ({ expect }) => {
    // The default theme's names are the diagram's colours that are no palette hue.
    expect(drawnColor('grey')).toEqual({ hue: 'neutral' });
    expect(drawnColor('light-blue/3')).toEqual({ hue: 'sky', tone: 3 });
    expect(drawnColor('accent', themed)).toEqual({ hue: 'teal', tone: 1 });
    expect(drawnColor('accent/3', themed)).toEqual({ hue: 'teal', tone: 3 });
    // A literal has no tones of its own, so it keeps the one its name was stated at.
    expect(drawnColor('brand', themed)).toEqual({ css: '#1e90ff' });
    expect(drawnColor('brand/1', themed)).toEqual({ css: '#1e90ff', tone: 1 });
    // A name no palette has draws in the look's default classes.
    expect(frameClasses(styled({ color: 'black' }), false, false, false, CLASSIC_LOOK)).toEqual(
      frameClasses(nodes.plain, false, false, false, CLASSIC_LOOK),
    );
    expect(frameClasses(styled({ color: 'accent' }), false, false, false, themed)).toEqual(
      frameClasses(styled({ color: 'teal/1' }), false, false, false, CLASSIC_LOOK),
    );
  });

  test('a tint draws as the lightest tone, and a pattern or glass fill as solid', ({ expect }) => {
    const classes = (overrides: Node['overrides']) =>
      frameClasses(styled(overrides), false, false, false, CLASSIC_LOOK);
    expect(classes({ color: 'blue', fill: 'tint' })).toEqual(classes({ color: 'blue/3' }));
    expect(classes({ color: 'blue/1', fill: 'tint' })).toEqual(classes({ color: 'blue/3' }));
    expect(classes({ color: 'blue', fill: 'pattern' })).toEqual(classes({ color: 'blue' }));
    expect(classes({ color: 'blue', fill: 'glass' })).toEqual(classes({ color: 'blue', fill: 'solid' }));
    // A sketchy stroke draws solid, and no stroke at all hides the border.
    expect(classes({ color: 'blue', stroke: 'sketchy' })).toEqual(classes({ color: 'blue', stroke: 'solid' }));
    expect(classes({ color: 'blue', stroke: 'none' })[2]).toBe('border-transparent');
  });

  test('a literal colour is drawn inline, and the frame leaves its surface and border classes out', ({ expect }) => {
    const literal = styled({ color: '#1e90ff' });
    expect(frameStyle(nodes.plain)).toBeUndefined();
    expect(frameStyle(styled({ color: 'blue/1' }))).toBeUndefined();
    expect(frameStyle(literal)).toEqual({
      borderColor: '#1e90ff',
      backgroundColor: 'color-mix(in srgb, #1e90ff 40%, transparent)',
    });
    expect(frameClasses(literal, false, false, false, CLASSIC_LOOK)).toEqual(['', '', '', '', 'rounded-sm']);
    // Selection still draws in the focus colour.
    expect(frameClasses(literal, true, false, false, CLASSIC_LOOK)[2]).toBe('border-focus');
    // The fill is the literal mixed by tone: whole at 1, a wash at 3 or as a tint, none at 0, unfilled or a guide.
    const background = (overrides: Node['overrides'], look?: SceneLook) =>
      frameStyle(styled(overrides), look)?.backgroundColor;
    expect(background({ color: 'brand/1' }, themed)).toBe('color-mix(in srgb, #1e90ff 100%, transparent)');
    expect(background({ color: 'brand/2' }, themed)).toBe('color-mix(in srgb, #1e90ff 40%, transparent)');
    expect(background({ color: 'brand/3' }, themed)).toBe('color-mix(in srgb, #1e90ff 20%, transparent)');
    expect(background({ color: '#1e90ff', fill: 'tint' })).toBe('color-mix(in srgb, #1e90ff 20%, transparent)');
    expect(frameStyle(styled({ color: 'brand/0' }), themed)).toEqual({ borderColor: '#1e90ff' });
    expect(frameStyle(styled({ color: '#1e90ff', fill: 'none' }))).toEqual({ borderColor: '#1e90ff' });
    expect(frameStyle(styled({ color: '#1e90ff', guide: true }))).toEqual({ borderColor: '#1e90ff' });
    // No stroke leaves the border out, but for a guide and a view node, which always show their edge.
    expect(frameStyle(styled({ color: '#1e90ff', stroke: 'none' }))).toEqual({
      backgroundColor: 'color-mix(in srgb, #1e90ff 40%, transparent)',
    });
    expect(frameStyle(styled({ color: '#1e90ff', stroke: 'none', guide: true }))).toEqual({ borderColor: '#1e90ff' });
    expect(frameStyle(styled({ color: '#1e90ff', stroke: 'none' }, nodes.window))?.borderColor).toBe('#1e90ff');
    // A view node showing its contents stays opaque where the literal gives it no fill.
    expect(frameClasses(styled({ color: 'brand/0' }, nodes.window), false, false, false, themed)[0]).toBe(
      frameClasses(styled({ color: 'blue/0' }, nodes.window), false, false, false, themed)[0],
    );
  });

  test("a link draws in its hue's line classes, or in a literal the caller sets inline", ({ expect }) => {
    expect(lineColor(undefined)).toEqual({ classes: lineClasses(undefined) });
    expect(lineColor('blue')).toEqual({ classes: lineClasses('blue') });
    expect(lineColor('blue/1')).toEqual({ classes: lineClasses('blue') });
    expect(lineColor('accent', themed)).toEqual({ classes: lineClasses('teal') });
    expect(lineColor('#1e90ff')).toEqual({ classes: lineClasses(undefined), css: '#1e90ff' });
    expect(lineColor('brand', themed).css).toBe('#1e90ff');
  });

  test('a text colour is a class at its text tone, or a literal', ({ expect }) => {
    expect(textStyleColor(undefined)).toEqual({});
    expect(textStyleColor({ color: 'blue' })).toEqual({});
    expect(textStyleColor({ textColor: 'red' })).toEqual({ className: 'text-red-500' });
    expect(textStyleColor({ textColor: 'red/1' })).toEqual({ className: 'text-red-300' });
    expect(textStyleColor({ textColor: 'red/3' })).toEqual({ className: 'text-red-700' });
    // A tone that is no text tone draws as the middle one, and a name that is no style hue colours nothing.
    expect(textStyleColor({ textColor: 'red/0' })).toEqual({ className: 'text-red-500' });
    expect(textStyleColor({ textColor: 'default/1' })).toEqual({});
    expect(textStyleColor({ textColor: 'accent' }, themed)).toEqual({ className: 'text-teal-300' });
    expect(textStyleColor({ textColor: '#1e90ff' })).toEqual({ css: '#1e90ff' });
    expect(textStyleColor({ textColor: 'brand' }, themed)).toEqual({ css: '#1e90ff' });
    // The frame keeps the hue's text class under a literal, which the caller's inline colour then wins over.
    expect(frameClasses(styled({ color: 'teal', textColor: '#1e90ff' }), false, false, false, CLASSIC_LOOK)[1]).toBe(
      'text-teal-fg',
    );
  });

  test('a font is a slot of the theme, and none leaves the text to inherit', ({ expect }) => {
    expect(fontFamily(undefined)).toBeUndefined();
    expect(fontFamily({})).toBeUndefined();
    expect(fontFamily({ font: 'mono' })).toBe('var(--font-mono, ui-monospace, monospace)');
    expect(fontFamily({ font: 'body' })).toBe('var(--font-body, ui-sans-serif, system-ui, sans-serif)');
    const look: SceneLook = {
      ...CLASSIC_LOOK,
      theme: { ...CLASSIC_LOOK.theme, fonts: { mono: 'Menlo', hand: 'Caveat' } },
    };
    expect(fontFamily({ font: 'mono' }, look)).toBe('Menlo');
    expect(fontFamily({ font: 'hand' }, look)).toBe('Caveat');
    // A slot the theme does not define draws as its body face.
    expect(fontFamily({ font: 'hand' })).toBe(fontFamily({ font: 'body' }));
  });
});
