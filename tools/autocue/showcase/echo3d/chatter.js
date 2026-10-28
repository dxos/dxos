//
// Copyright 2026 DXOS.org
//

// Background chatter: many tiny message bubbles popping up beside the nodes a scene names, each living a few seconds,
// so the scene reads as busy with people and agents at work. Scenes describe it as data (`chatter` in views.js).

import * as THREE from 'three';

const PEOPLE = [
  ['Ana', '#5b8def'],
  ['Ben', '#2fbf71'],
  ['Kai', '#e57bd1'],
  ['Mia', '#f2c230'],
  ['Raj', '#ff8a3d'],
  ['Agent', '#8fbfbf'],
];

// Short exchanges: each is a few turns between a person and a colleague or an agent.
const CONVERSATIONS = [
  ['Can you summarise this?', 'Three points, linked below.', 'Perfect, thanks.'],
  ['Who owns this?', 'Ops, since Monday.'],
  ['Draft is ready.', 'Reviewing now.', 'Two small fixes.'],
  ['Any blockers?', 'Waiting on Auth.', 'Flag it on the roadmap.'],
  ['Merge the duplicates?', 'Done: four into one.'],
  ['Add the transcript.', 'Attached and indexed.'],
  ['Move this to Q3?', 'Yes, after launch.', 'Updated.'],
  ['Tag the customer.', 'Tagged: Acme.'],
];

// Seconds between turns in a conversation, and how long it stays up after its last turn.
const TURN = 0.7;
const LINGER = 1.6;

// Gap (px) between a conversation and its sphere.
const EDGE_GAP = 6;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Creates the chatter layer.
 * @param {{ nodes: Map, camera: THREE.Camera }} context
 */
export const createChatter = ({ nodes, camera }) => {
  const layer = Object.assign(document.createElement('div'), { className: 'chatter' });
  document.body.append(layer);
  const projected = new THREE.Vector3();
  const toScreen = (position) => {
    projected.copy(position).project(camera);
    return [((projected.x + 1) / 2) * window.innerWidth, ((1 - projected.y) / 2) * window.innerHeight];
  };
  let config;
  let anchors = [];
  let hub;
  let nextAt = 0;
  const bubbles = [];

  /** Sets up the chatter for a scene; `next` is the scene's `chatter`, or undefined to clear it. */
  const enter = (next, time) => {
    config = next;
    // `around` limits the anchors to that node's direct children, and conversations sit on their far side from it.
    hub = next?.around ? nodes.get(next.around) : undefined;
    anchors = next
      ? [...nodes.values()].filter(
          (node) =>
            (next.kinds.includes(node.spec.kind) || next.kinds.includes(node.spec.id)) &&
            (!hub || node.spec.parent === hub.spec.id),
        )
      : [];
    nextAt = time + (next?.delay ?? 0);
    for (const bubble of bubbles.splice(0)) {
      bubble.element.remove();
    }
  };

  /** Runs every frame: starts new bubbles at the scene's rate and keeps each beside its node. */
  const update = (time) => {
    const visible = anchors.filter((node) => node.object.visible && node.state.opacity > 0.05);
    // One conversation per space at a time, at most `max` in all.
    const free = visible.filter((node) => !bubbles.some((bubble) => bubble.node === node));
    if (config && free.length && bubbles.length < (config.max ?? Infinity) && time >= nextAt) {
      nextAt = time + (Math.random() * 2) / (config.rate ?? 1.5);
      // Two speakers take turns: a person, then a colleague or an agent.
      const speakers = [pick(PEOPLE.slice(0, -1)), Math.random() < 0.5 ? PEOPLE.at(-1) : pick(PEOPLE.slice(0, -1))];
      const turns = pick(CONVERSATIONS).map((text, index) => {
        const [who, colour] = speakers[index % 2];
        const message = Object.assign(document.createElement('div'), { className: 'bubble' });
        const dot = Object.assign(document.createElement('span'), { className: 'dot' });
        dot.style.background = colour;
        message.append(dot, `${who}: ${text}`);
        return message;
      });
      const element = Object.assign(document.createElement('div'), { className: 'conversation' });
      element.append(...turns);
      layer.append(element);
      // At 3 o'clock on a node right of the hub, 9 o'clock on one left of it; a left-hand conversation reads
      // right-aligned, its speaker dots on the right, so it hangs off the sphere outward.
      const node = pick(free);
      const [x] = toScreen(node.object.position);
      const [hubX] = hub ? toScreen(hub.object.position) : [x];
      const left = x < hubX;
      const angle = left ? Math.PI : 0;
      element.classList.toggle('left', left);
      bubbles.push({ element, turns, node, angle, born: time, life: turns.length * TURN + LINGER });
    }
    for (let index = bubbles.length - 1; index >= 0; index--) {
      const bubble = bubbles[index];
      const age = (time - bubble.born) / bubble.life;
      // Each turn arrives in order, as if typed.
      bubble.turns.forEach((turn, index) => turn.classList.toggle('shown', time - bubble.born >= index * TURN));
      if (age >= 1) {
        bubble.element.remove();
        bubbles.splice(index, 1);
        continue;
      }
      const { node } = bubble;
      const [x, y] = toScreen(node.object.position);
      // The node's radius on screen, from a point on its edge.
      const edge = projected
        .copy(node.object.position)
        .add(new THREE.Vector3(node.spec.size * node.state.scale, 0, 0).applyQuaternion(camera.quaternion))
        .project(camera);
      const radius = Math.abs(((edge.x + 1) / 2) * window.innerWidth - x);
      const reach = radius + EDGE_GAP;
      bubble.element.style.left = `${x + Math.cos(bubble.angle) * reach}px`;
      bubble.element.style.top = `${y + Math.sin(bubble.angle) * reach}px`;
      // Holds while the turns arrive, then fades out.
      bubble.element.style.opacity = String(Math.min(1, (1 - age) * 3) * node.state.opacity);
    }
  };

  return { enter, update };
};
