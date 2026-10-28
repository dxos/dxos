//
// Copyright 2026 DXOS.org
//

// Compiles the views over the model into what main.js draws: per scene, a state for every node and a list of links.

import { layout } from './layout.js';
import { ORG_RADIUS, nodes as modelNodes, relations } from './model.js';
import { scenarios as viewScenarios } from './views.js';

export const nodes = modelNodes;

const byId = new Map(nodes.map((node) => [node.id, node]));
const matches = (list = [], node) => list.includes(node.id) || list.includes(node.kind);
const lookup = (map = {}, node) => map[node.id] ?? map[node.kind];

const compile = (view) => {
  const scaleOf = (node) => lookup(view.scale, node) ?? 1;
  const { positions, parentOf, rings } = layout(view, scaleOf);

  // A node the view's slots do not place sits at its nearest placed container, so it grows out of (or shrinks into)
  // that container rather than the origin.
  const placed = (id) => {
    for (let current = id; current && current !== 'world'; current = parentOf(current)) {
      if (positions.has(current)) {
        return positions.get(current);
      }
    }
    return [0, 0, 0];
  };

  const states = new Map();
  for (const node of nodes) {
    if (node.kind === 'ring') {
      continue;
    }
    // `noLabels` hides every label in the scene (or, as a list, those of the kinds or ids it names); `labels` renames
    // (or, with '', hides) individual ones.
    const unlabelled = Array.isArray(view.noLabels) ? matches(view.noLabels, node) : Boolean(view.noLabels);
    const label = unlabelled ? '' : view.labels?.[node.id];
    const parent = parentOf(node.id);
    const labelGap = view.labelGap?.[node.id];
    const tether = view.tether?.[node.id];
    const swallow = lookup(view.swallow, node);
    const swallowFade = matches(view.swallowFade, node);
    const spin = lookup(view.spin, node);
    const turn = lookup(view.turn, node);
    const delay = lookup(view.delay, node);
    const shrink = matches(view.shrink, node);
    const morph = view.labelMorph?.[node.id];
    const tint = lookup(view.tint, node);
    const labelClass = view.labelClass?.[node.id];
    const position = placed(node.id);
    if (matches(view.show, node) && !matches(view.hide, node)) {
      states.set(node.id, {
        position,
        scale: scaleOf(node),
        opacity: lookup(view.opacity, node) ?? 1,
        label,
        labelGap,
        tether,
        swallow,
        swallowFade,
        spin,
        turn,
        delay,
        morph,
        tint,
        labelClass,
        parent,
      });
    } else if (matches(view.ghost, node)) {
      states.set(node.id, { position, scale: scaleOf(node), opacity: 0, label, labelClass, parent, ghost: true });
    } else {
      // Labels apply while hidden too, so a node fading out keeps the name the scene gave it.
      states.set(node.id, {
        position,
        scale: 0,
        opacity: 0,
        label,
        labelClass,
        shrink: matches(view.shrink, node),
        parent,
      });
    }
  }
  // Nothing shows inside a hidden container, whatever `show` says.
  for (const node of nodes.filter((node) => node.kind !== 'ring')) {
    for (let current = parentOf(node.id); current && current !== 'world'; current = parentOf(current)) {
      if (states.get(current)?.scale === 0) {
        Object.assign(states.get(node.id), { scale: 0, opacity: 0 });
        break;
      }
    }
  }

  // A ring shows while any of its members does, at their opacity.
  for (const node of nodes.filter((node) => node.kind === 'ring')) {
    const ring = rings.get(node.id) ?? { radius: node.size, members: [] };
    const opacity = Math.max(
      0,
      ...ring.members.map((id) => states.get(id).opacity * Math.min(1, states.get(id).scale)),
    );
    states.set(node.id, { position: positions.get(node.id) ?? [0, 0, 0], scale: ring.radius / node.size, opacity });
  }

  const visible = (id) => {
    const state = states.get(id);
    return state && state.scale > 0 && state.opacity > 0;
  };
  // An edge whose end is hidden is drawn to the nearest visible container instead.
  const lift = (id) => {
    let current = id;
    while (current && current !== 'world' && !visible(current)) {
      current = parentOf(current);
    }
    return current === 'world' ? undefined : current;
  };
  // Each link is ordered so its second end is the hub it fades toward: the bigger sphere, where a sphere inside a
  // container the other end is not part of counts at its container's size (data held by a vendor), and on a tie
  // the held end wins.
  const drawn = (id) => byId.get(id).size * states.get(id).scale;
  const isAncestor = (container, id) => {
    for (let current = parentOf(id); current && current !== 'world'; current = parentOf(current)) {
      if (current === container) {
        return true;
      }
    }
    return false;
  };
  const weight = (id, other) => {
    const container = parentOf(id);
    const held = container !== 'world' && visible(container) && !isAncestor(container, other);
    return { size: held ? Math.max(drawn(id), drawn(container)) : drawn(id), held };
  };
  const towardHub = (from, to) => {
    const [first, second] = [weight(from, to), weight(to, from)];
    const fromIsHub = Math.abs(first.size - second.size) < 1e-6 ? first.held && !second.held : first.size > second.size;
    return fromIsHub ? [to, from] : [from, to];
  };

  const seen = new Set();
  const links = [];
  for (const edge of relations.filter((edge) => view.edges?.includes(edge.type))) {
    const from = lift(edge.from);
    const to = lift(edge.to);
    const key = [from, to].sort().join('|');
    if (from && to && from !== to && !seen.has(key)) {
      seen.add(key);
      links.push(towardHub(from, to));
    }
  }

  // The camera frames a node (fit is a multiple of its drawn radius) or the origin (radius is absolute).
  const focus = byId.get(view.camera?.focus ?? 'org');
  return {
    id: view.id,
    title: view.title,
    style: view.style,
    seconds: view.seconds,
    autoNext: view.autoNext,
    continues: view.continues,
    absorbGrowth: view.absorbGrowth,
    growsWith: view.growsWith,
    spinReset: view.spinReset,
    caption: view.caption,
    captionImage: view.captionImage,
    captionColor: view.captionColor,
    captionLead: view.captionLead,
    sideTitle: view.sideTitle,
    chatter: view.chatter,
    sound: view.sound,
    curtain: view.curtain,
    blackout: view.blackout,
    linkStyle: view.linkStyle,
    callout: view.callout,
    callouts: view.callouts,
    fade: view.fade,
    layout: (node) => states.get(node.id),
    links,
    focus: view.camera?.radius ? (view.camera.centre ?? [0, 0, 0]) : positions.get(focus.id),
    fit: view.camera?.radius ?? focus.size * scaleOf(focus) * (view.camera?.fit ?? 1.074),
    direction: view.camera?.direction,
  };
};

export const scenarios = Object.fromEntries(
  Object.entries(viewScenarios).map(([name, { title, views }]) => [name, { title, scenes: views.map(compile) }]),
);

// direction: where the camera sits relative to the focus; the distance is fitted so `fit` stays in view.
export const camera = {
  direction: [0, 1, 0.001],
  fit: ORG_RADIUS + 2,
  // A narrow lens keeps perspective low, so the rings read at their true fraction of the Org sphere.
  fov: 15,
  autoRotate: 0,
  background: '#070b18',
};

export const transition = {
  seconds: 1.25,
};

// Beads travelling along each link toward its second node (data being synced in).
export const flow = {
  // Set to 3 to turn the beads back on.
  beadsPerLink: 0,
  speed: 0.25,
};
