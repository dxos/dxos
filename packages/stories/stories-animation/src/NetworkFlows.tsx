//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  type CameraPose,
  type GraphNetwork,
  type GraphNode,
  type NetworkTemplate,
  NODE_RADIUS,
  type PropValue,
  type SceneState,
  type Timeline,
  type Vec2,
  compile,
  evaluate,
} from '@dxos/animation';
import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { DEVICE, SCHEMATIC } from './devices.ts';
import { STYLES } from './styles.ts';

/** Below this on-screen radius a node is drawn as a circle. */
const CIRCLE_PX = 26;
/** Below this camera tilt (halfway from isometric to top) nodes are drawn as circles. */
const TOP_TILT = 27.5;
/** At or above this on-screen radius a device screen shows live app content. */
const LIVE_PX = 110;
const MAX_LIVE = 6;

const CHAT = [
  ['r', 'Did the sync finish?'],
  ['l', 'Uploading now'],
  ['r', '3 files, 2.4 MB'],
  ['l', 'Got them'],
  ['r', 'Straight from my phone'],
  ['l', 'No server in between?'],
  ['r', 'Peer to peer'],
  ['l', 'Nice'],
] as const;
const DOC =
  'Release notes. Every change is saved on the device first, then shared with peers nearby and, when it is online, with the cloud.';

type NodeView = {
  node: GraphNode;
  el: HTMLDivElement;
  feed: HTMLElement | null;
  title: HTMLElement | null;
  screen?: string;
};
type Scene = { discs: Map<string, { el: HTMLDivElement; depth: number }>; nodes: Map<string, NodeView> };

const formatTime = (ms: number): string =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

const discClass = (network: GraphNetwork): string =>
  [
    'disc',
    network.kind === 'cloud' ? 'cloud' : network.kind === 'servers' ? 'servers' : '',
    network.depth > 1 ? 'nested' : '',
  ]
    .filter(Boolean)
    .join(' ');

/** Builds one DOM element per network disc and per node inside the camera element. */
const buildScene = (camera: HTMLElement, timeline: Timeline): Scene => {
  camera.replaceChildren();
  const lower = document.createElement('div');
  const upper = document.createElement('div');
  for (const layer of [lower, upper]) {
    layer.className = 'obj';
    camera.appendChild(layer);
  }
  const scene: Scene = { discs: new Map(), nodes: new Map() };
  const networks = Object.values(timeline.graph.networks).sort((a, b) => a.depth - b.depth);
  for (const network of networks) {
    const el = document.createElement('div');
    el.className = discClass(network);
    el.style.cssText = `left:${network.center[0] - network.radius}px;top:${network.center[1] - network.radius}px;width:${2 * network.radius}px;height:${2 * network.radius}px`;
    (network.kind === 'devices' ? upper : lower).appendChild(el);
    scene.discs.set(network.path, { el, depth: network.depth });
  }
  for (const node of Object.values(timeline.graph.nodes)) {
    const el = document.createElement('div');
    el.style.cssText = `left:${node.position[0]}px;top:${node.position[1]}px;width:0;height:0`;
    if (node.type === 'server') {
      el.className = 'obj srv';
      el.innerHTML = `<div class="box"></div>${SCHEMATIC(NODE_RADIUS.server)}`;
      lower.appendChild(el);
    } else {
      el.className = 'obj dev';
      el.innerHTML = `<div class="real">${DEVICE[node.type]()}</div><div class="sch">${SCHEMATIC(NODE_RADIUS[node.type])}</div>`;
      upper.appendChild(el);
    }
    scene.nodes.set(node.path, { node, el, feed: el.querySelector('.feed'), title: el.querySelector('.tbar span') });
  }
  return scene;
};

const project = (pose: CameraPose, zoom: number, width: number, height: number, [x, y]: Vec2): Vec2 => {
  const spin = (pose.spin * Math.PI) / 180;
  const tilt = (pose.tilt * Math.PI) / 180;
  const dx = (x - pose.center[0]) * zoom;
  const dy = (y - pose.center[1]) * zoom;
  return [
    width / 2 + dx * Math.cos(spin) - dy * Math.sin(spin),
    height / 2 + (dx * Math.sin(spin) + dy * Math.cos(spin)) * Math.cos(tilt),
  ];
};

const rim = (network: GraphNetwork, [x, y]: Vec2): Vec2 => {
  const dx = x - network.center[0];
  const dy = y - network.center[1];
  const distance = Math.hypot(dx, dy) || 1;
  return [network.center[0] + (dx / distance) * network.radius, network.center[1] + (dy / distance) * network.radius];
};

/** Screen content is a function of time so scrubbing shows the right frame. */
const renderScreen = (view: NodeView, props: Record<string, PropValue>, time: number): void => {
  if (!view.feed) {
    return;
  }
  const app = props.app;
  const count = Math.min(CHAT.length, 1 + Math.floor(time / 1600));
  const typed = Math.min(DOC.length, Math.floor(time / 40));
  const key = app === 'chat' ? `chat:${count}` : app === 'editor' ? `editor:${typed}` : 'idle';
  if (view.screen === key) {
    return;
  }
  view.screen = key;
  if (view.title) {
    view.title.textContent = app === 'editor' ? 'Editor' : 'Chat';
  }
  if (app === 'chat') {
    const flip = view.node.type === 'laptop';
    view.feed.innerHTML = CHAT.slice(Math.max(0, count - 7), count)
      .map(([side, text]) => `<div class="b ${flip ? (side === 'r' ? 'l' : 'r') : side}">${text}</div>`)
      .join('');
  } else if (app === 'editor') {
    view.feed.innerHTML = `<div class="doc">${DOC.slice(0, typed)}<span class="caret"></span></div>`;
  } else {
    view.feed.innerHTML = '<div class="b l">Online</div>';
  }
};

const paint = (
  stage: HTMLElement,
  camera: HTMLElement,
  canvas: HTMLCanvasElement,
  scene: Scene,
  timeline: Timeline,
  state: SceneState,
): void => {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const pose = state.camera;
  const zoom = Math.min(width, height) / 2 / pose.extent;
  camera.style.transform = `rotateX(${pose.tilt}deg) rotateZ(${pose.spin}deg) scale3d(${zoom},${zoom},${zoom}) translate3d(${-pose.center[0]}px,${-pose.center[1]}px,0)`;
  camera.style.setProperty('--sw', `${1.6 / zoom}px`);
  camera.style.setProperty('--ring', `${Math.max(6, 2.5 / zoom)}px`);

  for (const [path, { el, depth }] of scene.discs) {
    const visible = state.networks[path]?.visible ?? 0;
    el.style.visibility = visible > 0.001 ? 'visible' : 'hidden';
    el.style.transform = `translateZ(${-32 + depth * 0.5}px) scale(${Math.max(visible, 0.001)})`;
  }
  const live: Array<[number, NodeView, Record<string, PropValue>]> = [];
  for (const [path, view] of scene.nodes) {
    const item = state.nodes[path];
    const visible = item?.visible ?? 0;
    view.el.style.visibility = visible > 0.001 ? 'visible' : 'hidden';
    view.el.style.transform = visible < 1 ? `scale3d(${visible},${visible},${visible})` : '';
    const pixels = NODE_RADIUS[view.node.type] * zoom;
    view.el.classList.toggle('far', pixels < CIRCLE_PX || pose.tilt < TOP_TILT);
    if (item && view.feed && pixels >= LIVE_PX && visible > 0) {
      const [x, y] = project(pose, zoom, width, height, view.node.position);
      live.push([Math.hypot(x - width / 2, y - height / 2), view, item.props]);
    }
  }
  live
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_LIVE)
    .forEach(([, view, props]) => renderScreen(view, props, state.t));

  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.lineCap = 'round';
  context.lineWidth = 1.6;
  context.setLineDash([0.1, 6]);
  for (const link of timeline.graph.links) {
    const from = timeline.graph.networks[link.from];
    const to = timeline.graph.networks[link.to];
    const visible = Math.min(state.networks[link.from]?.visible ?? 0, state.networks[link.to]?.visible ?? 0);
    if (!from || !to || visible <= 0) {
      continue;
    }
    const [x1, y1] = project(pose, zoom, width, height, rim(from, to.center));
    const [x2, y2] = project(pose, zoom, width, height, rim(to, from.center));
    context.globalAlpha = 0.75 * visible;
    context.strokeStyle = from.kind !== 'devices' && to.kind !== 'devices' ? '#b5776b' : '#4f6f84';
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  context.setLineDash([]);
  for (const packet of state.packets) {
    const [x, y] = project(pose, zoom, width, height, packet.position);
    context.fillStyle = packet.color;
    context.globalAlpha = 0.22;
    context.beginPath();
    context.arc(x, y, 9, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(x, y, 4.2, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
};

/** Playback position per flow, kept outside React so a remount (e.g. a story arg change) resumes where it was. */
const playback = new Map<string, { time: number; playing: boolean }>();

export type NetworkFlowsProps = {
  /** MDL source holding a `flow` block. */
  flow: string;
  template: NetworkTemplate;
};

/**
 * Plays a compiled flow: CSS 3D devices and discs, with links and packets on a canvas overlay.
 * A stand-in renderer for previewing `@dxos/animation` until the three.js scene exists.
 */
export const NetworkFlows = ({ flow, template }: NetworkFlowsProps) => {
  const { timeline, diagnostics } = useMemo(() => compile(flow, template), [flow, template]);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useMemo(() => {
    const existing = playback.get(flow);
    if (existing) {
      return existing;
    }
    const created = { time: 0, playing: true };
    playback.set(flow, created);
    return created;
  }, [flow]);
  const timeRef = useRef(session.time);
  const playingRef = useRef(session.playing);
  const [playing, setPlaying] = useState(session.playing);
  const [state, setState] = useState<SceneState>(() => evaluate(timeline, 0));

  useEffect(() => {
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const canvas = canvasRef.current;
    if (!stage || !camera || !canvas) {
      return;
    }
    const scene = buildScene(camera, timeline);
    timeRef.current = Math.min(timeRef.current, timeline.duration);
    let last = performance.now();
    let frame = 0;
    let shown = -1;
    const tick = (now: number) => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        timeRef.current = Math.min(timeline.duration, timeRef.current + delta * 1000);
        session.time = timeRef.current;
        if (timeRef.current >= timeline.duration) {
          playingRef.current = false;
          session.playing = false;
          setPlaying(false);
        }
      }
      const next = evaluate(timeline, timeRef.current);
      paint(stage, camera, canvas, scene, timeline, next);
      if (Math.floor(next.t / 250) !== shown) {
        shown = Math.floor(next.t / 250);
        setState(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timeline, session]);

  const play = (value: boolean) => {
    if (value && timeRef.current >= timeline.duration) {
      timeRef.current = 0;
    }
    playingRef.current = value;
    session.playing = value;
    session.time = timeRef.current;
    setPlaying(value);
  };
  const seek = (time: number) => {
    timeRef.current = time;
    play(false);
  };

  return (
    <div className='nf-root flex flex-col dx-fill'>
      <style>{STYLES}</style>
      <div ref={stageRef} className='relative grow overflow-hidden bg-[#eef1ef]'>
        <div ref={cameraRef} className='cam' />
        <canvas ref={canvasRef} className='fx' />
        {state.caption && (
          <div className='cap'>
            <span className='t'>{state.caption}</span>
          </div>
        )}
        {diagnostics.length > 0 && (
          <div className='absolute bottom-2 left-2 text-xs text-description'>
            {diagnostics.map((diagnostic) => diagnostic.message).join(' · ')}
          </div>
        )}
      </div>
      <Toolbar.Root>
        <Button.Root onClick={() => play(!playing)}>{playing ? 'Pause' : 'Play'}</Button.Root>
        <Button.Root onClick={() => seek(0)}>Restart</Button.Root>
        <input
          aria-label='Time'
          type='range'
          className='grow'
          min={0}
          max={timeline.duration}
          step={10}
          value={state.t}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span className='text-sm tabular-nums'>
          {formatTime(state.t)} / {formatTime(timeline.duration)}
        </span>
        {timeline.marks.map((mark) => (
          <Button.Root key={mark.name} onClick={() => seek(mark.at)}>
            {mark.name}
          </Button.Root>
        ))}
      </Toolbar.Root>
    </div>
  );
};
