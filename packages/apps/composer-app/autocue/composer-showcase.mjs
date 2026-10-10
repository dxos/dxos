//
// Copyright 2026 DXOS.org
//

/**
 * The Composer showcase in one take: scenes 1 and 3–8 back to back (scene 2, two people, is `pair.mjs`'s
 * `two-peer-collaboration.mjs`, recorded separately and spliced in). Every scene's off-camera setup runs first, so
 * the countdown lands once and the take runs straight through. Each scene also runs on its own from `showcase/`.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183), on the
 *   showcase profile: Gmail connected and synced (scene 7) and the World Clock project finished (scene 6). See
 *   agents/superpowers/specs/2026-10-09-composer-showcase-video-design.md.
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4183 --profile <showcase profile> --out /tmp/showcase
 */

const search = new URL(import.meta.url).search;
const SCENES = ['01-home', '03-plugins', '04-objects', '05-agent', '06-project', '07-inbox', '08-studio'];
const scenes = await Promise.all(SCENES.map((scene) => import(`./showcase/${scene}.mjs${search}`)));

// Scene 1's prep opens every scene, so it runs once up front and the scenes' own copies are dropped.
const { prep } = scenes[0];
const all = scenes.flatMap((scene) => scene.steps).filter((step) => step !== prep);

// The setups leave the page wherever they finished, so the take starts from Home again.
export const steps = [
  prep,
  ...all.filter((step) => step.setup),
  { ...prep, name: 'Prep (off camera): back to Home' },
  ...all.filter((step) => !step.setup),
];
