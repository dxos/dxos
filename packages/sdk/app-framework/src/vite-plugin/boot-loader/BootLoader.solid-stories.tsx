//
// Copyright 2026 DXOS.org
//

import { createSignal, onCleanup, onMount } from 'solid-js';
import { type Meta, type StoryObj } from 'storybook-solidjs-vite';

import bootLoaderCss from './loader-app/boot-loader.css?raw';
import { mountLoader } from './loader-app/mount';

//
// Development surface for the boot loader. Mounts the *real* Solid `Loader`
// (via `mountLoader` — the same entry the inlined production bundle runs) into a
// `#boot-loader` backdrop, then drives it through `window.__bootLoader` exactly
// as the host app does. There is no reconstruction of the loader DOM, so the
// story and production cannot drift. Iterate the loader's look here with HMR.
//

/**
 * Inlined snapshot of `packages/ui/brand/assets/icons/composer-icon.svg` — keeps
 * the story self-contained (production pipes the same file in via the plugin's
 * `markSvg` option) while previewing the real brand palette.
 */
const COMPOSER_MARK = `
  <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
    <g transform="matrix(0.969697,0,0,1,-570.182,0)">
      <rect x="588" y="0" width="264" height="256" style="fill:none;"/>
      <g transform="matrix(0.917198,0,0,1,-223.93,-876)">
        <path d="M1065.83,1064L1029.14,1064C991.913,1064 961.684,1037.12 961.684,1004C961.684,971.197 991.282,944.542 1028.02,944.008L1028.02,944L1047.85,944L1039.21,968L1029.14,968C1006.79,968 988.669,984.118 988.669,1004C988.669,1023.87 1006.81,1040 1029.14,1040C1029.38,1040 1029.62,1040 1029.85,1040L1029.85,1040L1074.47,1040L1065.83,1064ZM1083.11,1040L1083.11,1040L1083.11,1064L1083.11,1064L1083.11,1040Z" style="fill:rgb(1,122,183);"/>
      </g>
      <path d="M761.579,164L720,164C699.51,164 682.875,147.869 682.875,128C682.875,108.452 698.942,92.543 718.969,92.014L718.969,92L729.238,92L721.317,116L720,116C713.165,116 707.625,121.373 707.625,128C707.625,134.623 713.17,140 720,140C720.072,140 720.144,139.999 720.216,139.998L720.216,140L769.5,140L761.579,164Z" style="fill:rgb(6,197,253);"/>
      <path d="M745.738,212L720.025,212L720,212C672.202,212 633.389,174.377 633.375,128.024C633.361,81.958 671.591,44.542 718.969,44.006L718.969,44L719.975,44L745.079,44L737.159,68L719.982,68C685.809,68.01 658.115,94.88 658.125,128.017C658.135,161.126 685.858,188 720,188L720.018,188C720.378,188 720.738,187.997 721.098,187.991L721.098,188L753.659,188L745.738,212Z" style="fill:rgb(10,75,105);"/>
      <g transform="matrix(1.03125,0,0,1,588,0)">
        <path d="M128,236C68.393,236 20,187.607 20,128C20,68.353 68.353,20 128,20L160,20L152.319,44L128,44C81.608,44 44,81.608 44,128C44,174.361 81.639,212 128,212C127.756,212.004 127.878,212.004 128,212.003C128.122,212.002 128.244,212 128,212L152.958,212L145.277,236L128,236ZM128,236C128.628,236 127.372,236.011 128,236Z" style="fill:rgb(5,40,61);"/>
      </g>
    </g>
  </svg>
`;

/** Approximate plugin count for the simulation (production count is dynamic). */
const STORY_PLUGIN_COUNT = 80;
/** Tick interval for the determinate-progress simulation, in ms. */
const STORY_TICK_MS = 50;

type SimState = 'creep' | 'progress' | 'done';

/**
 * Harness component: owns the `#boot-loader` backdrop, mounts the real loader,
 * and emits `__bootLoader` calls to simulate the host. The driver is the source
 * of truth — there is no React/Solid shadow of its progress.
 */
const LoaderHarness = () => {
  let container!: HTMLDivElement;
  let styleEl: HTMLStyleElement | undefined;
  let dispose: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const [sim, setSim] = createSignal<SimState>('creep');

  const teardown = () => {
    if (timer != null) {
      clearInterval(timer);
      timer = undefined;
    }
    dispose?.();
    dispose = undefined;
  };

  const mount = () => {
    teardown();
    // The loader treats its host element as the `#boot-loader` backdrop (styled
    // by the inline CSS) and renders the disc + status into it — mirroring the
    // static markup the plugin injects in production.
    const backdrop = document.createElement('div');
    backdrop.id = 'boot-loader';
    backdrop.setAttribute('role', 'status');
    backdrop.setAttribute('aria-live', 'polite');
    backdrop.setAttribute('aria-label', 'Initializing');
    container.appendChild(backdrop);
    dispose = mountLoader(backdrop, { markSvg: COMPOSER_MARK, status: 'Loading…' });
  };

  const runCreepMessages = () => {
    const phases = ['Loading framework…', 'Reading configuration…', 'Starting services…'];
    let index = 0;
    timer = setInterval(() => {
      window.__bootLoader?.status({ humanized: phases[index] });
      index += 1;
      if (index >= phases.length && timer != null) {
        clearInterval(timer);
        timer = undefined;
      }
    }, 600);
  };

  const runProgress = () => {
    let loaded = 0;
    timer = setInterval(() => {
      loaded += Math.min(1.5, 0.4 + (loaded % 3) * 0.3);
      const fraction = Math.min(1, loaded / STORY_PLUGIN_COUNT);
      window.__bootLoader?.progress(fraction);
      window.__bootLoader?.status({
        humanized: 'Loading plugins',
        range: { index: Math.round(loaded), total: STORY_PLUGIN_COUNT },
      });
      if (loaded >= STORY_PLUGIN_COUNT && timer != null) {
        clearInterval(timer);
        timer = undefined;
        window.__bootLoader?.status({ humanized: 'Starting Composer…' });
        setSim('done');
      }
    }, STORY_TICK_MS);
  };

  const advance = () => {
    if (sim() === 'creep') {
      setSim('progress');
      if (timer != null) {
        clearInterval(timer);
        timer = undefined;
      }
      runProgress();
    } else if (sim() === 'progress' || sim() === 'done') {
      // Play the dismissal outro, then re-mount for another run.
      window.__bootLoader?.ready();
      setSim('creep');
      setTimeout(() => {
        mount();
        runCreepMessages();
      }, 700);
    }
  };

  onMount(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = bootLoaderCss;
    document.head.appendChild(styleEl);
    mount();
    runCreepMessages();
  });

  onCleanup(() => {
    teardown();
    styleEl?.remove();
  });

  return (
    <>
      {/* Float the controls above the loader's `z-index: 10` fixed backdrop. */}
      <div
        style={{
          'position': 'fixed',
          'top': '12px',
          'left': '12px',
          'z-index': 9999,
          'display': 'flex',
          'gap': '12px',
          'align-items': 'center',
        }}
      >
        <button
          type='button'
          onClick={advance}
          style={{
            'padding': '6px 14px',
            'font-size': '13px',
            'font-weight': '600',
            'color': '#fff',
            'background': '#017ab7',
            'border': 'none',
            'border-radius': '6px',
            'cursor': 'pointer',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.25)',
          }}
        >
          {sim() === 'creep' ? 'Start progress' : 'Finish + reset'}
        </button>
        <span style={{ 'font-family': 'ui-sans-serif, system-ui, sans-serif', 'font-size': '12px', 'color': '#888' }}>
          {sim()}
        </span>
      </div>
      <div ref={container as any} />
    </>
  );
};

const meta: Meta = {
  title: 'sdk/app-framework/vite-plugin/BootLoader',
  render: () => <LoaderHarness />,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
