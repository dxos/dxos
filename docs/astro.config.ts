//
// Copyright 2025 DXOS.org
//

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';

const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT;
const DX_RELEASE = process.env.DX_RELEASE;
const DX_POSTHOG_API_KEY = process.env.DX_POSTHOG_API_KEY;
const DX_POSTHOG_API_HOST = process.env.DX_POSTHOG_API_HOST;

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'DXOS Documentation',
      lastUpdated: true,
      favicon: '/favicon.ico',
      components: {
        // TODO(wittjosiah): Uncomment to link logo to home page.
        // SiteTitle: './src/components/CustomSiteTitle.astro',
      },
      logo: {
        light: './src/assets/logotype/dxos-horizontal.svg',
        dark: './src/assets/logotype/dxos-horizontal-white.svg',
        alt: 'DXOS Logotype',
        replacesTitle: true,
      },
      social: {
        github: 'https://github.com/dxos/dxos',
        discord: 'https://dxos.org/discord',
        blueSky: 'https://bsky.app/profile/dxos.org',
        'x.com': 'https://x.com/dxos_org',
      },
      expressiveCode: {
        themes: ['github-light', 'github-dark'],
      },
      sidebar: [
        {
          label: 'Introduction',
          slug: 'index',
        },
        {
          label: 'Composer',
          autogenerate: { directory: 'composer' },
          collapsed: false,
        },
        {
          label: 'ECHO Database',
          items: [
            {
              label: 'Introduction',
              slug: 'echo/introduction',
            },
            {
              label: 'Installation',
              autogenerate: { directory: 'echo/installation' },
            },
            {
              label: 'Typescript',
              autogenerate: { directory: 'echo/typescript' },
            },
            {
              label: 'React',
              autogenerate: { directory: 'echo/react' },
            },
          ],
          collapsed: false,
        },
        {
          label: 'HALO Identity',
          autogenerate: { directory: 'halo' },
          collapsed: false,
        },
        {
          label: 'Additional Resources',
          autogenerate: { directory: 'additional-resources' },
          collapsed: false,
        },
      ],
      plugins: [starlightLinksValidator({ exclude: ['/typedoc/**'] })],
      // PostHog snippet: https://posthog.com/docs/getting-started/install
      head:
        DX_POSTHOG_API_KEY && DX_POSTHOG_API_HOST
          ? [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                content: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${DX_POSTHOG_API_KEY}',{api_host:'${DX_POSTHOG_API_HOST}',person_profiles:'identified_only'});
posthog.register({environment:'${DX_ENVIRONMENT ?? ""}',release:'${DX_RELEASE ?? ""}'});`,
              },
            ]
          : [],
    }),
  ],
});
