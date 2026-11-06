//
// Copyright 2026 DXOS.org
//

// A side panel: a column in the left or right margin with an object's card, an optional conversation under it, and the
// card of a node a message creates, each joined to its node in the scene by a line. Scenes describe panels as data
// (`callout` / `callouts` in views.js); this module draws and times them.

import * as THREE from 'three';

// Seconds between messages arriving in a thread.
const MESSAGE_GAP = 1.1;
// Seconds between a message arriving and the node it creates appearing.
const CREATE_DELAY = 0.9;
// Seconds a node created by a message takes to grow in.
export const SPAWN_SECONDS = 1.2;
const MARGIN = 24;
// Clear of the scene toolbar at the foot of the frame.
const BOTTOM_MARGIN = 72;

const element = (tag, className, parent) => {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  parent?.append(node);
  return node;
};

const svgElement = (tag, className, parent) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (className) {
    node.setAttribute('class', className);
  }
  parent.append(node);
  return node;
};

let gradients = 0;

/** A line that fades from full strength at its first end to nothing at its second; its stops take their colour from CSS. */
const fadingLine = (svg, defs, className) => {
  const gradient = svgElement('linearGradient', className, defs);
  gradient.id = `connector-fade-${gradients++}`;
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  for (const [offset, opacity] of [
    ['0', '1'],
    ['1', '0'],
  ]) {
    const stop = svgElement('stop', '', gradient);
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-opacity', opacity);
  }
  const line = svgElement('line', className, svg);
  line.style.stroke = `url(#${gradient.id})`;
  return { line, gradient };
};

const makeCard = (parent, className) => {
  const card = element('div', `card ${className}`, parent);
  element('div', 'kind', card);
  element('div', 'title', card);
  element('dl', 'rows', card);
  return card;
};

/** Writes a card's kind, title and term/value rows. */
const fillCard = (card, { kind, title, rows = [] }) => {
  card.querySelector('.kind').textContent = kind ?? '';
  card.querySelector('.title').textContent = title ?? '';
  card.querySelector('.rows').replaceChildren(
    ...rows.flatMap(([term, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      return [dt, dd];
    }),
  );
};

const makeMessage = ({ who, bot, colour, text }) => {
  const message = element('div', bot ? 'message bot' : 'message');
  const avatar = element('div', 'avatar', message);
  avatar.style.background = colour;
  avatar.textContent = who.slice(0, 1);
  const body = element('div', '', message);
  element('div', 'who', body).textContent = who;
  element('div', '', body).textContent = text;
  return message;
};

/** Ids of the nodes the scene's messages create, which stay hidden until their message arrives. */
export const createdIds = (callouts) =>
  new Set(callouts.flatMap((callout) => (callout.thread ?? []).map((message) => message.creates).filter(Boolean)));

/**
 * The scene's panels: `callouts` lists them; a lone `callout` is the right-hand panel. Each is keyed by its `slot`
 * (default: its side), so a margin can hold more than one panel and a panel keeps its place from scene to scene.
 */
export const calloutsOf = (definition) =>
  (definition.callouts ?? (definition.callout ? [{ side: 'right', ...definition.callout }] : [])).map((callout) => ({
    ...callout,
    side: callout.side ?? 'right',
    slot: callout.slot ?? callout.side ?? 'right',
  }));

/**
 * Creates the panel for one margin.
 * @param {'left' | 'right'} side
 * @param {{ nodes: Map, camera: THREE.Camera, time: () => number, progress: () => number }} context
 */
export const createPanel = (side, { nodes, camera, time, progress }) => {
  const column = element('div', `panel ${side}`, document.body);
  const card = makeCard(column, 'callout');
  const thread = element('div', 'thread', column);
  const createdCard = makeCard(column, 'created');
  const connector = svgElement('svg', `connector ${side}`, document.body);
  const defs = svgElement('defs', '', connector);
  // Each line runs from its card, at full strength, and fades out as it reaches the object.
  const main = fadingLine(connector, defs, 'main');
  const spawn = fadingLine(connector, defs, 'spawn');

  const projected = new THREE.Vector3();
  let callout;
  let shownNode;
  let shownThread;
  let threadShownAt;
  let spawnTarget;
  let enteredAt = 0;

  const toScreen = (node) => {
    projected.copy(node.object.position).project(camera);
    return [((projected.x + 1) / 2) * window.innerWidth, ((1 - projected.y) / 2) * window.innerHeight];
  };
  // The edge of a card that faces the scene.
  const innerEdge = (rect) => [side === 'right' ? rect.left : rect.right, rect.top + rect.height / 2];
  // Colours a card and its line in an object's colour; undefined falls back to the stylesheet's.
  const tint = (cardElement, { gradient }, color) => {
    cardElement.style.setProperty('--accent', color ?? '');
    for (const stop of gradient.children) {
      stop.style.stopColor = color ?? '';
    }
  };
  const draw = ({ line, gradient }, card, object) => {
    for (const element of [line, gradient]) {
      element.setAttribute('x1', String(card[0]));
      element.setAttribute('y1', String(card[1]));
      element.setAttribute('x2', String(object[0]));
      element.setAttribute('y2', String(object[1]));
    }
  };

  // Centred on the horizon by its full height (messages and cards not yet shown included), so a lone card sits in the
  // middle and a column with a thread slides up just far enough that its first and last cards sit level about it.
  // A callout's `scale` shrinks the whole column toward its margin; `anchor` puts it at the top, centre (the default)
  // or bottom of the frame, and `inset` moves it in from its margin by that many pixels.
  const position = ({ instant = false } = {}) => {
    const scale = callout?.scale ?? 1;
    const height = column.offsetHeight * scale;
    const top = {
      top: MARGIN,
      centre: (window.innerHeight - height) / 2,
      bottom: window.innerHeight - height - BOTTOM_MARGIN,
    }[callout?.anchor ?? 'centre'];
    column.style.transformOrigin = `top ${side}`;
    column.style.transform = scale === 1 ? '' : `scale(${scale})`;
    column.style[side] = `${MARGIN + (callout?.inset ?? 0)}px`;
    column.style.transition = instant ? 'none' : '';
    column.style.top = `${Math.max(MARGIN, top)}px`;
    void column.offsetHeight;
    column.style.transition = '';
  };

  /** Sets up the panel for a scene; `next` is this side's callout, or undefined to clear it. */
  const enter = (next, immediate) => {
    // A promoted card is the one a message created in the previous scene: it glides from the foot of the column up into
    // the callout's place, while the old card and thread give way to the new ones.
    const promoted = !immediate && next?.promote && createdCard.classList.contains('shown');
    const promotedFrom = promoted ? createdCard.getBoundingClientRect() : undefined;
    // A card that stays on the same node from one scene to the next stays up; otherwise it waits to be shown.
    if (next?.node !== shownNode && !promoted) {
      card.classList.remove('shown');
      connector.style.opacity = '0';
    }
    shownNode = next?.node;
    callout = next;
    enteredAt = time();
    const sameThread = next?.thread && next.thread === shownThread;
    shownThread = next?.thread;
    if (!sameThread) {
      threadShownAt = undefined;
      spawnTarget = undefined;
      thread.replaceChildren(...(next?.thread ?? []).map(makeMessage));
      // Instant when promoting, so the card does not linger at the foot while its copy rises.
      createdCard.style.transition = promoted ? 'none' : '';
      createdCard.classList.remove('shown');
      void createdCard.offsetHeight;
      createdCard.style.transition = '';
    }
    if (next) {
      fillCard(card, next);
    }
    // An accented card is a created object's: drawn in that object's colour, its line included.
    card.classList.toggle('accent', Boolean(next?.accent));
    connector.classList.toggle('accent', Boolean(next?.accent));
    tint(card, main, next?.accent ? nodes.get(next.node)?.spec.color : undefined);
    const creating = (next?.thread ?? []).find((message) => message.creates);
    createdCard.classList.toggle('unused', !creating?.card);
    if (creating?.card) {
      fillCard(createdCard, creating.card);
    }
    tint(createdCard, spawn, creating ? nodes.get(creating.creates)?.spec.color : undefined);
    position({ instant: promoted });
    if (promotedFrom) {
      card.classList.add('shown');
      const promotedTo = card.getBoundingClientRect();
      card.style.transition = 'none';
      card.style.transform = `translateY(${promotedFrom.top - promotedTo.top}px)`;
      void card.offsetHeight;
      card.style.transition = 'transform 0.9s ease, opacity 0.6s ease';
      card.style.transform = '';
    }
  };

  /** Runs every frame: shows the card, plays the thread, releases created nodes, and redraws the lines. */
  const update = () => {
    const node = callout && nodes.get(callout.node);
    if (!node) {
      return;
    }
    // A card already up has its line redrawn every frame, so it follows the column as it slides; a new card waits
    // until the move into the scene has mostly played out.
    // A callout's `wait` (seconds) holds a new card back further, so panels can start one after another.
    if (!card.classList.contains('shown') && (progress() < 0.6 || time() - enteredAt < (callout.wait ?? 0))) {
      return;
    }
    card.classList.add('shown');
    connector.style.opacity = '1';
    // Messages arrive one at a time once the card is up, like a conversation playing out.
    threadShownAt ??= time();
    const elapsed = time() - threadShownAt;
    // `pace` (seconds between messages) lets one conversation run faster than another.
    const gap = callout.pace ?? MESSAGE_GAP;
    [...thread.children].forEach((message, index) => {
      message.classList.toggle('shown', elapsed > 0.8 + index * gap);
      // A message that creates a node releases it a beat after it arrives: the node grows out of the card's node and
      // its own card appears at the foot of the column, joined to it.
      const created = elapsed > 0.8 + index * gap + CREATE_DELAY && nodes.get(callout.thread[index].creates);
      if (created?.pending) {
        created.pending = false;
        created.spawnAt = time();
        created.emergeFrom = node;
        created.from = { position: node.object.position.clone(), scale: 0, opacity: 0 };
        const hasCard = !createdCard.classList.contains('unused');
        createdCard.classList.toggle('shown', hasCard);
        spawnTarget = { node: created, target: hasCard ? createdCard : message };
      }
    });
    spawn.line.classList.toggle('shown', Boolean(spawnTarget));
    if (spawnTarget) {
      draw(spawn, innerEdge(spawnTarget.target.getBoundingClientRect()), toScreen(spawnTarget.node));
    }
    draw(main, innerEdge(card.getBoundingClientRect()), toScreen(node));
  };

  return { enter, update, position };
};
