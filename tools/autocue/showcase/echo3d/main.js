//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import { createChatter } from './chatter.js';
import { SPAWN_SECONDS, calloutsOf, createdIds, createPanel } from './panels.js';
import * as config from './scene.js';
import { createSound } from './sound.js';
import { DEFAULT_STYLE, styles } from './styles.js';

// `?s=<scenario>` picks the scene set; the first one is the default.
const scenarioName = new URLSearchParams(window.location.search).get('s') ?? Object.keys(config.scenarios)[0];
const { scenes } = config.scenarios[scenarioName] ?? Object.values(config.scenarios)[0];

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(window.innerWidth, window.innerHeight);
labels.domElement.style.position = 'absolute';
labels.domElement.style.top = '0';
labels.domElement.style.pointerEvents = 'none';
// Its own stacking context, so the per-label z-indexes CSS2DRenderer sets cannot rise above the curtain.
labels.domElement.style.zIndex = '1';
document.body.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(config.camera.background);
const camera = new THREE.PerspectiveCamera(config.camera.fov, window.innerWidth / window.innerHeight, 0.1, 2000);
// Each scene frames a sphere: `focus` is its centre, `fit` its radius, `direction` the side the camera views it from.
const view = (definition = {}) => ({
  focus: new THREE.Vector3(...(definition.focus ?? [0, 0, 0])),
  fit: definition.fit ?? config.camera.fit,
  direction: new THREE.Vector3(...(definition.direction ?? config.camera.direction)).normalize(),
});
const shot = { from: view(), to: view(), current: view() };

// Fit the framed sphere in whichever of the two fields of view is narrower.
const placeCamera = () => {
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = shot.current.fit / Math.sin(Math.min(vertical, horizontal));
  camera.position.copy(shot.current.direction).multiplyScalar(distance).add(shot.current.focus);
  controls.target.copy(shot.current.focus);
};

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = config.camera.autoRotate > 0;
controls.autoRotateSpeed = config.camera.autoRotate;

scene.add(new THREE.AmbientLight('#ffffff', 0.6));
const keyLight = new THREE.DirectionalLight('#ffffff', 1.6);
keyLight.position.set(20, 40, 30);
scene.add(keyLight);

const makeLabel = (text, className, offset) => {
  const element = document.createElement('div');
  element.className = `label ${className}`;
  element.textContent = text;
  const label = new CSS2DObject(element);
  // Anchored at its bottom edge, so the whole label sits above the point instead of straddling it.
  label.center.set(0.5, 1);
  label.userData.offset = offset;
  return label;
};

//
// Nodes.
//

// A node is a persistent group (position, scale, label) holding a visual that the scene's style can swap.
const buildVisual = (node, styleName) => {
  if (node.visual) {
    node.object.remove(node.visual.object);
  }
  node.visual = (styles[styleName] ?? styles[DEFAULT_STYLE])(node.spec);
  node.object.add(node.visual.object);
};

let currentStyle;
const applyStyle = (styleName = DEFAULT_STYLE) => {
  if (styleName !== currentStyle) {
    currentStyle = styleName;
    for (const node of nodes.values()) {
      buildVisual(node, styleName);
    }
  }
};

const nodes = new Map(
  config.nodes.map((spec) => {
    const node = { spec, object: new THREE.Group() };
    // An empty label still gets an element, so a scene can name the node.
    if (spec.label !== undefined) {
      const big = spec.kind === 'container' || spec.kind === 'echo';
      // Capped so small spheres (objects inside a space) keep their labels close; a scene's `labelGap` (in the node's
      // own units) can lift a label clear of whatever sits on the sphere's edge.
      node.defaultGap = spec.kind === 'container' ? 1.5 : Math.min(0.9, spec.size * 1.2);
      node.labelClass = spec.labelClass ?? (big ? 'sun' : '');
      node.label = makeLabel(spec.label, node.labelClass, spec.size + node.defaultGap);
      node.object.add(node.label);
    }
    node.from = { position: new THREE.Vector3(), scale: 0, opacity: 0 };
    node.to = { position: new THREE.Vector3(), scale: 0, opacity: 0 };
    node.state = { position: new THREE.Vector3(), scale: 0, opacity: 0 };
    scene.add(node.object);
    return [spec.id, node];
  }),
);

const tinted = new THREE.Color();

/** Recolours a node's sphere and its glass rim; the darkened far wall and lattice keep the model's colour. */
const tintNode = (node, color) => {
  node.visual.materials[0].color?.copy(color);
  for (const material of node.visual.materials) {
    material.uniforms?.uColor?.value.copy(color);
  }
};

// Seconds a label takes to fade in or out when a scene gives or takes away its text.
const LABEL_FADE = 0.8;

const applyState = (node) => {
  const { position, scale, opacity } = node.state;
  node.object.position.copy(position);
  node.object.scale.setScalar(Math.max(scale, 0.0001));
  node.object.visible = scale > 0.001;
  node.visual.materials.forEach((material, index) => {
    material.opacity = node.visual.baseOpacity[index] * opacity;
    // A shader material (the glass rim) reads its strength from a uniform.
    if (material.uniforms?.uOpacity) {
      material.uniforms.uOpacity.value = material.opacity;
    }
    // A faded surface must not write depth, or it hides the spheres inside it; an opaque one is drawn in the opaque
    // pass, so every shell tints it the same whatever its distance.
    const opaque = material.opacity > 0.99;
    material.depthWrite = opaque;
    if (material.transparent === opaque) {
      material.transparent = !opaque;
      material.needsUpdate = true;
    }
  });
  if (node.label) {
    // A shrinking node's label fades with it; otherwise a see-through shell still needs a readable label.
    const appearing =
      node.labelShownAt === undefined ? 1 : Math.min(1, (clock.elapsedTime - node.labelShownAt) / LABEL_FADE);
    const left = node.shrinking && node.from.scale > 0 ? Math.min(1, scale / node.from.scale) : 1;
    const leaving = node.labelHiddenAt === undefined ? 1 : 1 - (clock.elapsedTime - node.labelHiddenAt) / LABEL_FADE;
    if (leaving <= 0) {
      node.labelHiddenAt = undefined;
      node.label.visible = false;
    }
    // A node shrunk to nothing takes its label with it; the label renderer does not check the node's own visibility.
    const present = node.object.visible ? 1 : 0;
    node.label.element.style.opacity = String(
      present * appearing * left * Math.max(0, leaving) * Math.min(1, opacity * 10),
    );
  }
};

//
// Links: rebuilt per scene; endpoints follow their nodes every frame.
//

// Higher LINK_FADE drops the line's alpha sooner on its way to the hub.
const LINK_SEGMENTS = 16;
const LINK_COLOR = '#8ea2e6';
const linkTint = new THREE.Color();
// Beads each link can show for data in transit.
const BEAD_POOL = 16;
// The colour of a packet flagged by a flow's `alert` share.
const ALERT_COLOR = '#ff3b3b';
// Shortest and longest quiet spell (seconds) between bursts of beads.
const BURST_GAP = [0.6, 2.8];
const LINK_FADE = 3;
const point = new THREE.Vector3();
const links = [];
const addLink = ([fromId, toId]) => {
  // Several vertices with per-vertex alpha, so the line can fade along a curve toward the hub.
  const geometry = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: LINK_SEGMENTS + 1 }, () => new THREE.Vector3()),
  );
  const linkColor = new THREE.Color(LINK_COLOR);
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(
      Array.from({ length: LINK_SEGMENTS + 1 }, () => [linkColor.r, linkColor.g, linkColor.b, 1]).flat(),
      4,
    ),
  );
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }),
  );
  // Drawn before the spheres, so see-through shells tint the links that pass behind or through them.
  line.renderOrder = -1;
  scene.add(line);
  // A fixed pool per link; a scene's `linkStyle.flow` decides how many show, so any scene can turn the traffic on.
  const beads = Array.from({ length: BEAD_POOL }, () => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#c9d4ff', transparent: true, opacity: 0 }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return { mesh };
  });
  const link = { from: nodes.get(fromId), to: nodes.get(toId), line, beads, opacity: 0, target: 1 };
  links.push(link);
  return link;
};

//
// Scenes.
//

let current = -1;
let progress = 1;
const title = document.getElementById('title');
// A scene that `continues` the one before it is a second stage of the same slide: it has no button of its own, the
// previous scene runs straight on into it, and stepping back skips past it.
const slideOf = scenes.map((_, index) => scenes.slice(0, index + 1).filter((scene) => !scene.continues).length - 1);
const firstOf = (slide) => slideOf.indexOf(slide);
const slideCount = slideOf.at(-1) + 1;
const pageNumber = document.getElementById('page-number');
// Wide enough for the last page, so the bar does not widen as the number grows.
pageNumber.style.minWidth = `${String(slideCount).length * 2 + 3}ch`;
const back = () => goTo(firstOf(Math.max(0, slideOf[current] - (scenes[current].continues ? 0 : 1))), true);

const kindIndex = new Map();
const indexOf = (spec) => {
  const siblings = config.nodes.filter((other) => other.kind === spec.kind);
  return siblings.indexOf(spec);
};
for (const spec of config.nodes) {
  kindIndex.set(spec.id, indexOf(spec));
}

// Created before the panels and the first scene, which read the time as they set up.
// Labels are drawn over the canvas, so the 3D scene cannot hide them; a sphere with a solid far wall (`backOpacity`)
// hides, by this test, the labels of nodes that sit behind it as seen from the camera.
const toLabel = new THREE.Vector3();
const toCentre = new THREE.Vector3();
const hideOccludedLabels = () => {
  const occluders = [...nodes.values()].filter(
    (node) => node.spec.backOpacity && node.object.visible && node.state.opacity > 0.01,
  );
  for (const node of nodes.values()) {
    if (!node.label || !node.label.visible) {
      continue;
    }
    const hidden = occluders.some((occluder) => {
      if (occluder === node) {
        return false;
      }
      const radius = occluder.spec.size * occluder.state.scale;
      const centre = occluder.object.position;
      // Nodes inside the sphere show through its clear near half.
      if (node.object.position.distanceTo(centre) < radius) {
        return false;
      }
      toLabel.subVectors(node.object.position, camera.position);
      const length = toLabel.length();
      toLabel.divideScalar(length);
      toCentre.subVectors(centre, camera.position);
      const along = toCentre.dot(toLabel);
      // The sphere hides the node if the sight line passes through it before reaching the node.
      return along > 0 && along < length && toCentre.lengthSq() - along * along < radius * radius;
    });
    node.label.element.style.visibility = hidden ? 'hidden' : '';
  }
};

const clock = new THREE.Clock();
const chatter = createChatter({ nodes, camera });
const sound = createSound();
// Panels by slot, made the first time a scene uses one; scenes fill them through `callout` / `callouts`.
const panels = new Map();
const panelFor = ({ slot, side }) => {
  if (!panels.has(slot)) {
    panels.set(slot, createPanel(side, { nodes, camera, time: () => clock.elapsedTime, progress: () => progress }));
  }
  return panels.get(slot);
};

const curtain = document.getElementById('curtain');
let curtainDown = false;

/**
 * Writes a side title one line per block, then sizes every line after the first to the first line's width, so the
 * title reads as a justified block. Measured once the font has loaded, since widths depend on it.
 */
const setSideTitle = (element, text) => {
  const lines = text.split('\n').map((line) => Object.assign(document.createElement('div'), { textContent: line }));
  element.replaceChildren(...lines);
  void document.fonts.ready.then(() => {
    const [first, ...rest] = lines;
    for (const line of rest) {
      line.style.fontSize = '';
      // Twice, since text width is not quite proportional to size (hinting, rounding).
      for (let pass = 0; pass < 2; pass++) {
        const size = parseFloat(getComputedStyle(line).fontSize);
        line.style.fontSize = `${(first.getBoundingClientRect().width / line.getBoundingClientRect().width) * size}px`;
      }
    }
  });
};

// Seconds after a caption comes up before its first line under the headline appears, and between lines.
const CAPTION_LINE_DELAY = 1.2;
const CAPTION_LINE_STEP = 0.9;

let sceneEnteredAt = 0;
const goTo = (index, jump = false) => {
  const target = (index + scenes.length) % scenes.length;
  if (target === current || curtainDown) {
    return;
  }
  // Stepping into a `curtain` scene fades to black, cuts to the scene behind it, then fades back up.
  if (!jump && target === current + 1 && scenes[target].curtain) {
    // Already black (a `blackout` scene): there is nothing to fade down, so cut now and fade up.
    if (curtain.style.opacity === '1') {
      goTo(target, true);
      curtain.style.opacity = '0';
      return;
    }
    curtainDown = true;
    curtain.style.opacity = '1';
    curtain.addEventListener(
      'transitionend',
      () => {
        curtainDown = false;
        goTo(target, true);
        curtain.style.opacity = '0';
      },
      { once: true },
    );
    return;
  }
  // Only stepping forward to the next scene animates; any other jump cuts straight to the scene.
  const immediate = jump || target !== current + 1;
  current = target;
  sceneEnteredAt = clock.elapsedTime;
  const definition = scenes[current];
  // A `blackout` scene fades the frame to black and holds it there; any other scene lifts it.
  curtain.style.opacity = definition.blackout ? '1' : '0';
  // Over the whole move into the scene, so the frame darkens as it plays and is black by the time it ends.
  curtain.style.transitionDuration =
    definition.blackout && !immediate ? `${definition.seconds ?? config.transition.seconds}s` : '';
  // Easing in, so the frame darkens slowly at first and only goes fully black at the end.
  curtain.style.transitionTimingFunction = definition.blackout && !immediate ? 'ease-in' : '';
  applyStyle(definition.style);
  // Nodes a panel's message creates stay hidden until their message arrives (see panels.js).
  const callouts = calloutsOf(definition);
  const held = createdIds(callouts);
  for (const spec of config.nodes) {
    const node = nodes.get(spec.id);
    const next = definition.layout(spec, kindIndex.get(spec.id));
    // A node changing parent mid-orbit keeps where it is drawn: its turn so far is folded into its base position, since
    // turning round the new parent would put it somewhere else.
    if (node.orbitAngle && next.parent !== node.parentId) {
      node.base = node.state.position.clone();
      node.orbitAngle = 0;
    }
    // Tweens run on the un-orbited base position; the orbit turn is applied on top every frame.
    node.from = {
      position: (node.base ?? node.state.position).clone(),
      scale: node.state.scale,
      opacity: node.state.opacity,
    };
    node.to = { position: new THREE.Vector3(...next.position), scale: next.scale, opacity: next.opacity };
    // A node that appears fades in as it grows out of its parent's centre, tracking the parent if it moves: the
    // container that held it unseen, else the one it is entering; with neither (a top-level node) it grows in place.
    // A ghost (full size, invisible) only fades in where it is.
    const hidden = node.state.opacity < 0.001;
    const appearing = !immediate && hidden && !node.ghost && next.scale > 0 && next.opacity > 0;
    const source = [node.parentId, next.parent].find((id) => id && id !== 'world');
    node.emergeFrom = appearing && source ? nodes.get(source) : undefined;
    if (appearing) {
      node.from.scale = 0;
      if (!source) {
        node.from.position.copy(node.to.position);
      }
    }
    // A node that disappears keeps its size and fades out, so it is gone before it would visibly shrink.
    const disappearing = !immediate && !hidden && (next.scale === 0 || next.opacity === 0);
    if (disappearing && next.scale === 0 && !next.shrink) {
      node.to.scale = node.from.scale;
    }
    node.shrinking = disappearing && Boolean(next.shrink);
    // A shrinking node keeps its strength all the way down: it goes by getting smaller, not by fading.
    if (node.shrinking) {
      node.to.opacity = node.from.opacity;
    }
    node.absorbing = 0;
    node.parentId = next.parent;
    node.ghost = next.ghost;
    // A node merging into another closes the gap, then stays touching it while it shrinks away.
    node.tether = !immediate && next.tether ? nodes.get(next.tether) : undefined;
    node.spin = next.spin ?? 0;
    node.turn = next.turn ?? 0;
    // When a scene stops a node's orbit, or asks for `spinReset`, the turn unwinds to the nearest whole revolution over
    // the transition, so the layout is back in its modelled orientation (the objects scenes pick out are where the
    // model put them); a spinning node then carries on turning from there.
    node.unwindFrom = (node.spin === 0 || definition.spinReset) && node.orbitAngle ? node.orbitAngle : undefined;
    node.pending = held.has(spec.id) && node.state.opacity < 0.001;
    node.spawnAt = undefined;
    node.delay = next.delay ?? 0;
    node.swallow = next.swallow ? nodes.get(next.swallow) : undefined;
    node.swallowFade = next.swallowFade;
    // A scene's `tint` recolours a node over the move into the scene; without one it returns to its own colour.
    node.tintFrom = node.visual.materials[0].color?.clone();
    node.tintTo = new THREE.Color(next.tint ?? spec.color);
    node.burstAt = undefined;
    if (node.particles) {
      node.particles.points.visible = false;
    }
    if (node.tether) {
      node.tetherDirection = node.from.position.clone().sub(node.tether.state.position).normalize();
    }
    if (node.label) {
      // A scene can rename a node; an empty name hides its label.
      const text = next.morph ? next.morph.join('') : (next.label ?? spec.label);
      if (next.morph) {
        // Spans for the words that come and go, so each can fade (and collapse) on its own.
        const [added, kept, dropped] = next.morph;
        // All three words stay laid out; the row slides so the visible pair is always centred (see `centreMorph`).
        const words = Object.assign(document.createElement('span'), { className: 'morph-words' });
        words.append(
          Object.assign(document.createElement('span'), { className: 'morph-add', textContent: added }),
          Object.assign(document.createElement('span'), { className: 'morph-kept', textContent: kept }),
          Object.assign(document.createElement('span'), { className: 'morph-drop', textContent: dropped }),
        );
        node.label.element.replaceChildren(words);
        node.label.element.classList.remove('morphed');
      } else if (text) {
        node.label.element.textContent = text;
      }
      // A scene's `labelClass` restyles a label (e.g. 'hero' for a much larger name) for that scene only.
      for (const className of new Set(
        ['sun', 'hero', 'title', 'inside', node.labelClass, next.labelClass].filter(Boolean),
      )) {
        node.label.element.classList.toggle(className, className === (next.labelClass ?? node.labelClass));
      }
      // A label that gains its text fades in rather than popping up.
      if (text && !node.label.visible && !immediate) {
        node.labelShownAt = clock.elapsedTime;
      }
      // A label that loses its text keeps the old one while it fades out; hidden through the object, not the element,
      // since the label renderer resets each element's display every frame.
      node.labelHiddenAt = !text && node.label.visible && !immediate ? clock.elapsedTime : undefined;
      node.label.visible = Boolean(text) || node.labelHiddenAt !== undefined;
      // An 'inside' label is written across the middle of its sphere rather than above it.
      const inside = (next.labelClass ?? node.labelClass) === 'inside';
      node.label.center.set(0.5, inside ? 0.5 : 1);
      node.label.userData.offset = inside ? 0 : spec.size + (next.labelGap ?? node.defaultGap);
    }
  }
  // Links shared with the previous scene stay; the rest fade out and new ones fade in.
  for (const link of links) {
    link.target = 0;
  }
  for (const [fromId, toId] of definition.links) {
    const existing = links.find((link) => link.from === nodes.get(fromId) && link.to === nodes.get(toId));
    if (existing) {
      existing.target = 1;
    } else {
      addLink([fromId, toId]);
    }
  }
  // Start from where the user has orbited to, so the move is continuous.
  shot.from = {
    focus: controls.target.clone(),
    fit: shot.current.fit,
    // The tracked direction, not one read back from the camera: looking straight down, rounding in the controls
    // can swing the azimuth and turn the whole picture.
    direction: shot.current.direction.clone(),
  };
  shot.to = view(definition);
  // Set here, not from progress, so a first frame long enough to finish the tween still moves the camera.
  shot.moving = true;
  progress = immediate ? 1 : 0;
  if (immediate) {
    shot.current = view(definition);
    placeCamera();
    for (const node of nodes.values()) {
      if (node.unwindFrom !== undefined) {
        node.orbitAngle = Math.round(node.unwindFrom / (Math.PI * 2)) * Math.PI * 2;
        node.unwindFrom = undefined;
      }
      node.state = node.pending
        ? { position: node.to.position.clone(), scale: 0, opacity: 0 }
        : { ...node.to, position: node.to.position.clone() };
      node.base = node.to.position.clone();
      node.emergeFrom = undefined;
      node.tether = undefined;
    }
    for (const link of links) {
      link.opacity = link.target;
    }
  }
  title.textContent = `${current + 1}. ${definition.title}`;
  for (const callout of callouts) {
    panelFor(callout);
  }
  chatter.enter(definition.chatter, clock.elapsedTime);
  sound.scene(definition.sound);
  for (const [slot, panel] of panels) {
    panel.enter(
      callouts.find((callout) => callout.slot === slot),
      immediate,
    );
  }
  // A scene's caption fades out at once on leaving, and fades in once the move into the scene is done.
  const caption = document.getElementById('caption');
  // A caption is a headline (the first line, or `captionImage` in its place) and, under it, any further lines, which
  // fade in one after another once the caption is up.
  const fillCaption = () => {
    const lines = definition.caption.split('\n');
    const headline = definition.captionImage
      ? Object.assign(document.createElement('img'), { src: definition.captionImage, alt: '', className: 'headline' })
      : Object.assign(document.createElement('div'), { textContent: lines.shift(), className: 'headline' });
    const rest = Object.assign(document.createElement('div'), { className: 'lines' });
    rest.append(
      ...lines.map((line, index) =>
        Object.assign(document.createElement('div'), {
          textContent: line,
          style: `transition-delay: ${CAPTION_LINE_DELAY + index * CAPTION_LINE_STEP}s`,
        }),
      ),
    );
    // With a logotype, the lines sit in a block as wide as it, so they can line up with its lettering.
    const lockup = Object.assign(document.createElement('div'), { className: definition.captionImage ? 'lockup' : '' });
    lockup.append(headline, rest);
    caption.style.color = definition.captionColor ?? '';
    caption.replaceChildren(lockup);
  };
  // A caption still on screen fades out with its old words before the new ones go in.
  if (definition.caption && !immediate && parseFloat(getComputedStyle(caption).opacity) > 0.01) {
    const swap = (event) => {
      if (event.target === caption && event.propertyName === 'opacity') {
        caption.removeEventListener('transitionend', swap);
        fillCaption();
      }
    };
    caption.addEventListener('transitionend', swap);
  } else if (definition.caption) {
    fillCaption();
  }
  caption.style.opacity = definition.caption && immediate ? '1' : '0';
  caption.classList.toggle('shown', Boolean(definition.caption && immediate));
  // A `sideTitle` names the scene large at the middle left, timed like a caption.
  const sideTitle = document.getElementById('side-title');
  if (definition.sideTitle) {
    setSideTitle(sideTitle, definition.sideTitle);
  }
  sideTitle.style.opacity = definition.sideTitle && immediate ? '1' : '0';
  pageNumber.textContent = `${slideOf[current] + 1} / ${slideCount}`;
  document.getElementById('first').disabled = slideOf[current] === 0;
  document.getElementById('prev').disabled = slideOf[current] === 0;
  document.getElementById('next').disabled = current === scenes.length - 1;
  document.getElementById('last').disabled = slideOf[current] === slideCount - 1;
  window.location.hash = definition.id;
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === ' ') {
    goTo(current + 1);
  } else if (event.key === 'ArrowLeft') {
    back();
  } else if (/^[1-9]$/.test(event.key) && Number(event.key) <= scenes.length) {
    goTo(Number(event.key) - 1);
  }
});
document.getElementById('first').addEventListener('click', () => goTo(0, true));
document.getElementById('prev').addEventListener('click', back);
document.getElementById('next').addEventListener('click', () => goTo(current + 1));
document.getElementById('last').addEventListener('click', () => goTo(firstOf(slideCount - 1), true));
// The pager shows while the mouse moves or rests on it, and hides after a couple of idle seconds (as in the presenter).
const toolbar = document.getElementById('toolbar');
const PAGER_IDLE = 2000;
let pagerTimer;
let pagerHovered = false;
const showPager = () => {
  toolbar.dataset.visible = 'true';
  clearTimeout(pagerTimer);
  if (!pagerHovered) {
    pagerTimer = setTimeout(() => (toolbar.dataset.visible = 'false'), PAGER_IDLE);
  }
};
toolbar.addEventListener('pointerenter', () => {
  pagerHovered = true;
  showPager();
});
toolbar.addEventListener('pointerleave', () => {
  pagerHovered = false;
  showPager();
});
window.addEventListener('pointermove', showPager);
showPager();

const initial = scenes.findIndex((definition) => definition.id === window.location.hash.slice(1));
goTo(Math.max(initial, 0), true);

//
// Loop.
//

const screenUp = new THREE.Vector3();
// Share of a merge spent closing the gap before the smaller node starts to shrink.
const MERGE_APPROACH = 0.3;
const touching = new THREE.Vector3();
const offset = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3();
// How far a swallowed node's orbit has widened (a fraction of its radius) by the end of the move.
const SWALLOW_DRIFT = 0.6;
// When the edge touches a node, the sphere smashes into particles that fly apart and fade: how many, for how long
// (seconds), how far (multiples of the sphere's radius) and how big (screen pixels, so they read at any zoom).
const BURST_PARTICLES = 12;
// Seconds a `swallowFade` node takes to fade once the edge meets it.
const SWALLOW_FADE_SECONDS = 1.2;
const BURST_SECONDS = 0.45;
const BURST_SPREAD = 8;
const BURST_PARTICLE_SIZE = 1.5;
const burstParticles = (node) => {
  if (!node.particles) {
    // Fixed directions per node, scattered over a sphere.
    const directions = Array.from({ length: BURST_PARTICLES }, () =>
      new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
    );
    const geometry = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Array(BURST_PARTICLES * 3).fill(0), 3),
    );
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: node.spec.color,
        size: BURST_PARTICLE_SIZE * renderer.getPixelRatio(),
        sizeAttenuation: false,
        transparent: true,
        depthWrite: false,
      }),
    );
    points.visible = false;
    scene.add(points);
    node.particles = { points, directions };
  }
  return node.particles;
};
const start = new THREE.Vector3();
const end = new THREE.Vector3();
/**
 * Measures each morphing label's words once it is laid out, and sets the row's slide: from centring the kept and
 * dropped words to centring the added and kept ones. Measured, not guessed, so the slide is exact and even.
 */
const centreMorphs = () => {
  for (const words of document.querySelectorAll('.morph-words:not([data-measured])')) {
    const [added, , dropped] = words.children;
    if (!words.offsetWidth) {
      continue;
    }
    words.dataset.measured = 'true';
    words.style.transition = 'none';
    // In ems, so the slide stays right while the label's font size is still easing.
    const em = parseFloat(getComputedStyle(words).fontSize);
    words.style.setProperty('--from', `${-added.offsetWidth / 2 / em}em`);
    words.style.setProperty('--to', `${dropped.offsetWidth / 2 / em}em`);
    void words.offsetWidth;
    words.style.transition = '';
  }
};

const animate = () => {
  const delta = clock.getDelta();
  const time = clock.elapsedTime;

  const timing = scenes[current];
  const arriving = progress < 1;
  const seconds = timing.seconds ?? config.transition.seconds;
  const before = progress;
  progress = Math.min(1, progress + delta / seconds);
  // The caption comes up `captionLead` seconds before the move ends, or as it ends.
  const captionAt = 1 - (timing.captionLead ?? 0) / seconds;
  centreMorphs();
  if (arriving && progress === 1) {
    for (const label of document.querySelectorAll('.label')) {
      if (label.querySelector('.morph-add')) {
        label.classList.add('morphed');
      }
    }
  }
  if (arriving && progress === 1 && timing.sideTitle) {
    document.getElementById('side-title').style.opacity = '1';
  }
  if (timing.caption && before < captionAt && progress >= captionAt) {
    document.getElementById('caption').style.opacity = '1';
    document.getElementById('caption').classList.add('shown');
  }
  if (arriving && progress === 1 && (timing.autoNext || scenes[current + 1]?.continues)) {
    queueMicrotask(() => goTo(current + 1));
  }
  const t = ease(progress);
  // Opacity can finish in a fraction of the move, so a sphere that leaves is gone before it arrives.
  const fadeT = ease(Math.min(1, progress / (timing.fade ?? 1)));
  if (progress < 1 || shot.moving) {
    shot.moving = progress < 1;
    shot.current.focus.lerpVectors(shot.from.focus, shot.to.focus, t);
    // Geometric, so a deep zoom spends as long on the last tenth as on the first.
    shot.current.fit = shot.from.fit * (shot.to.fit / shot.from.fit) ** t;
    shot.current.direction.lerpVectors(shot.from.direction, shot.to.direction, t).normalize();
    placeCamera();
  }
  for (const node of nodes.values()) {
    if (node.pending) {
      node.object.visible = false;
      continue;
    }
    // A created node runs its own clock from the moment it is released; a delayed node holds still for the first part
    // of the transition, then runs its change in the time left.
    const local =
      node.spawnAt !== undefined
        ? Math.min(1, (time - node.spawnAt) / SPAWN_SECONDS)
        : node.delay
          ? Math.max(0, (progress - node.delay) / (1 - node.delay))
          : progress;
    const t = ease(local);
    const fadeT = ease(Math.min(1, local / (timing.fade ?? 1)));
    node.base ??= new THREE.Vector3();
    node.base.lerpVectors(node.emergeFrom?.state.position ?? node.from.position, node.to.position, t);
    // Orbiting nodes turn slowly round their parent; the angle persists, so leaving an orbiting scene does not snap.
    if (node.unwindFrom !== undefined) {
      node.orbitAngle = THREE.MathUtils.lerp(
        node.unwindFrom,
        Math.round(node.unwindFrom / (Math.PI * 2)) * Math.PI * 2,
        t,
      );
      if (local >= 1) {
        node.unwindFrom = undefined;
      }
    } else {
      node.orbitAngle = (node.orbitAngle ?? 0) + node.spin * delta;
    }
    // The sphere itself turns, not its group, so the label (placed in the group's frame) stays put.
    if (node.turn) {
      node.visual.object.rotation.y += node.turn * delta;
    }
    if (node.orbitAngle) {
      // A top-level node orbits the origin.
      const centre = nodes.get(node.parentId)?.state.position ?? ORIGIN;
      offset.subVectors(node.base, centre).applyAxisAngle(UP, node.orbitAngle);
      node.state.position.addVectors(centre, offset);
    } else {
      node.state.position.copy(node.base);
    }
    node.state.scale = THREE.MathUtils.lerp(node.from.scale, node.to.scale, t);
    node.state.opacity = THREE.MathUtils.lerp(node.from.opacity, node.to.opacity, fadeT);
    if (node.tintFrom && !node.tintFrom.equals(node.tintTo)) {
      tintNode(node, tinted.lerpColors(node.tintFrom, node.tintTo, t));
    }
    applyState(node);
  }
  // Every swallowed node's particles are built, and their shader compiled, on the scene's first frame: building them at
  // the moment of contact stalls that frame, and the growing lab judders.
  const unbuilt = [...nodes.values()].filter((node) => node.swallow && !node.swallowFade && !node.particles);
  if (unbuilt.length) {
    unbuilt.forEach(burstParticles);
    renderer.compile(scene, camera);
  }
  // A node being swallowed drifts outward as its orbit widens, more slowly than the partner's edge grows, and splits
  // into particles when the edge reaches it.
  for (const node of nodes.values()) {
    if (!node.swallow) {
      continue;
    }
    const centre = node.swallow.state.position;
    node.state.position
      .sub(centre)
      .multiplyScalar(1 + SWALLOW_DRIFT * t)
      .add(centre);
    const edge = node.swallow.spec.size * node.swallow.state.scale;
    const own = node.spec.size * node.from.scale;
    if (node.burstAt === undefined && edge >= node.state.position.distanceTo(centre) - own) {
      node.burstAt = time;
      node.burstFrom = node.state.position.clone();
    }
    // A `swallowFade` node fades out where the edge meets it instead of bursting.
    if (node.burstAt !== undefined && node.swallowFade) {
      node.state.opacity *= Math.max(0, 1 - (time - node.burstAt) / SWALLOW_FADE_SECONDS);
    } else if (node.burstAt !== undefined) {
      const burst = Math.min(1, (time - node.burstAt) / BURST_SECONDS);
      const { points, directions } = burstParticles(node);
      // Fastest at the start, like debris.
      const reach = Math.max(own, 1) * (1 + BURST_SPREAD * (1 - (1 - burst) ** 3));
      const positions = points.geometry.attributes.position;
      directions.forEach((direction, index) => {
        point.copy(direction).multiplyScalar(reach).add(node.burstFrom);
        positions.setXYZ(index, point.x, point.y, point.z);
      });
      positions.needsUpdate = true;
      points.visible = burst < 1;
      points.material.opacity = (1 - burst) * node.state.opacity;
      node.state.scale = 0;
    }
    applyState(node);
  }
  // Tethered nodes go after the rest, so they follow their partner's position and size for this frame.
  for (const node of nodes.values()) {
    if (!node.tether) {
      continue;
    }
    // A delayed merge waits its turn, then runs in the time left, so several merges can follow one another.
    const local = node.delay ? Math.max(0, (progress - node.delay) / (1 - node.delay)) : progress;
    const approach = ease(Math.min(1, local / MERGE_APPROACH));
    const shrink = ease(Math.max(0, (local - MERGE_APPROACH) / (1 - MERGE_APPROACH)));
    node.state.scale = THREE.MathUtils.lerp(node.from.scale, node.to.scale, shrink);
    // The partner takes in what this node loses as it shrinks, so it grows in step.
    node.tether.absorbing += shrink;
    // Once merged it is gone outright, so no speck or link is left at its partner's edge.
    if (local >= 1) {
      node.state.scale = 0;
      node.state.opacity = 0;
    }
    const partner = node.tether;
    const gap = partner.spec.size * partner.state.scale + node.spec.size * node.state.scale;
    touching.copy(node.tetherDirection).multiplyScalar(gap).add(partner.state.position);
    node.state.position.lerpVectors(node.from.position, touching, approach);
    applyState(node);
  }
  // A partner grows by `absorbGrowth` for each node merging into it, in step with that node shrinking away.
  const growth = timing.absorbGrowth ?? 0;
  for (const node of nodes.values()) {
    node.growthFactor = 1 + growth * node.absorbing;
    if (node.growthFactor !== 1) {
      node.state.scale *= node.growthFactor;
      applyState(node);
    }
    node.absorbing = 0;
  }
  // A node that grows with another takes the same factor, so the two keep their proportions.
  for (const [id, leader] of Object.entries(timing.growsWith ?? {})) {
    const node = nodes.get(id);
    const factor = nodes.get(leader)?.growthFactor ?? 1;
    if (node && factor !== 1) {
      node.state.scale *= factor;
      applyState(node);
    }
  }

  for (let index = links.length - 1; index >= 0; index--) {
    const link = links[index];
    link.opacity +=
      Math.sign(link.target - link.opacity) *
      Math.min(Math.abs(link.target - link.opacity), (delta * 3) / config.transition.seconds);
    if (link.target === 0 && link.opacity <= 0) {
      scene.remove(link.line, ...link.beads.map((bead) => bead.mesh));
      links.splice(index, 1);
      continue;
    }
    start.copy(link.from.state.position);
    end.copy(link.to.state.position);
    // A node held back for a message counts as unseen, so its links wait for it too.
    const seen = (node) => (node.pending ? 0 : node.state.opacity);
    const visible = link.opacity * Math.min(seen(link.from), seen(link.to));
    const points = link.line.geometry.attributes.position;
    for (let index = 0; index <= LINK_SEGMENTS; index++) {
      point.lerpVectors(start, end, index / LINK_SEGMENTS);
      points.setXYZ(index, point.x, point.y, point.z);
    }
    points.needsUpdate = true;
    // The scene's link style sets the colour and strength; unless it turns fading off, a link fades toward its second
    // end, which the scene orders to be the hub: full at the outer end, gone well before the hub.
    const style = scenes[current].linkStyle ?? {};
    link.line.material.opacity = (style.opacity ?? 0.8) * visible;
    linkTint.set(style.color ?? LINK_COLOR);
    const colors = link.line.geometry.attributes.color;
    for (let index = 0; index <= LINK_SEGMENTS; index++) {
      const towardHub = index / LINK_SEGMENTS;
      colors.setXYZW(
        index,
        linkTint.r,
        linkTint.g,
        linkTint.b,
        style.fade === false ? 1 : (1 - towardHub) ** LINK_FADE,
      );
    }
    colors.needsUpdate = true;
    // Data in transit: beads run the length of the line, centre to centre, each in its source node's colour. Traffic
    // comes in bursts: a quick train of beads one way (either way, with `both`), then a quiet spell, so it reads as
    // spiky rather than a steady stream. `start` holds the first burst back that many seconds into the scene.
    const flow = style.flow ?? { count: config.flow.beadsPerLink, speed: config.flow.speed };
    // `between` limits the traffic to links whose two ends are both listed.
    const carries =
      !flow.between || (flow.between.includes(link.from.spec.id) && flow.between.includes(link.to.spec.id));
    // `boost` gives links touching the nodes it lists heavier traffic: more beads, shorter quiet spells.
    const boosted = flow.boost?.nodes.some((id) => id === link.from.spec.id || id === link.to.spec.id);
    const count = carries ? Math.min(BEAD_POOL, (boosted ? flow.boost.count : flow.count) ?? 0) : 0;
    const gap = (boosted && flow.boost.gap) || flow.gap || BURST_GAP;
    if (count > 0 && visible > 0 && time - sceneEnteredAt >= (flow.start ?? 0)) {
      link.nextBurst ??= time;
      if (time >= link.nextBurst) {
        const idle = link.beads.slice(0, count).filter((bead) => !bead.active);
        const reverse = flow.both ? Math.random() < 0.5 : false;
        const size = Math.min(idle.length, 1 + Math.floor(Math.random() * count * 0.75));
        idle.slice(0, size).forEach((bead, order) => {
          Object.assign(bead, {
            active: true,
            phase: 0,
            wait: order * (0.05 + Math.random() * 0.1),
            rate: 0.9 + Math.random() * 0.5,
            // `alert` is the share of packets drawn red: something going wrong in the traffic.
            alert: Math.random() < (flow.alert ?? 0),
            reverse,
          });
        });
        link.nextBurst = time + gap[0] + Math.random() * (gap[1] - gap[0]);
      }
    } else {
      link.nextBurst = undefined;
    }
    link.beads.forEach((bead, index) => {
      if (index >= count || visible <= 0 || !bead.active) {
        bead.active = false;
        bead.mesh.visible = false;
        return;
      }
      if (bead.wait > 0) {
        bead.wait -= delta;
        bead.mesh.visible = false;
        return;
      }
      bead.phase = Math.min(1, bead.phase + delta * (flow.speed ?? 0.25) * bead.rate);
      bead.active = bead.phase < 1;
      bead.mesh.visible = bead.active;
      bead.mesh.position.lerpVectors(bead.reverse ? end : start, bead.reverse ? start : end, bead.phase);
      bead.mesh.scale.setScalar(flow.size ?? 0.12);
      bead.mesh.material.color.set(bead.alert ? ALERT_COLOR : (bead.reverse ? link.to : link.from).spec.color);
      // Fading in and out at the ends, so a bead emerges from one node and sinks into the other.
      // `opacity` dims a flow's packets, for traffic that should sit in the background.
      bead.mesh.material.opacity = visible * (flow.opacity ?? 1) * Math.sin(Math.PI * bead.phase);
    });
  }

  for (const panel of panels.values()) {
    panel.update();
  }
  chatter.update(time);
  controls.update();
  // Labels sit at the top of their sphere as seen on screen, whatever the camera angle.
  screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  for (const node of nodes.values()) {
    node.label?.position.copy(screenUp).multiplyScalar(node.label.userData.offset);
  }
  hideOccludedLabels();
  renderer.render(scene, camera);
  labels.render(scene, camera);
  requestAnimationFrame(animate);
};
animate();

window.addEventListener('resize', () => {
  for (const panel of panels.values()) {
    panel.position();
  }
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  placeCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labels.setSize(window.innerWidth, window.innerHeight);
});
