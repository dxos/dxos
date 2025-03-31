//
// Copyright 2025 DXOS.org
//

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';

const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT;
const DX_RELEASE = process.env.DX_RELEASE;
const TELEMETRY_API_KEY = process.env.DX_TELEMETRY_API_KEY;

// https://astro.build/config
export default defineConfig({
  integrations: [
    // telemetryIntegration(),
    starlight({
      title: 'DXOS Documentation',
      lastUpdated: true,
      favicon: '/favicon.ico',
      components: {
        SiteTitle: './src/components/CustomSiteTitle.astro',
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
      plugins: [starlightLinksValidator()],
      head: [
        {
          tag: 'script',
          attrs: { type: 'text/javascript' },
          content: `!function(){var i="analytics",analytics=window[i]=window[i]||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","screen","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware","register"];analytics.factory=function(e){return function(){if(window[i].initialized)return window[i][e].apply(window[i],arguments);var n=Array.prototype.slice.call(arguments);if(["track","screen","alias","group","page","identify"].indexOf(e)>-1){var c=document.querySelector("link[rel='canonical']");n.push({__t:"bpc",c:c&&c.getAttribute("href")||void 0,p:location.pathname,u:location.href,s:location.search,t:document.title,r:document.referrer})}n.unshift(e);analytics.push(n);return analytics}};for(var n=0;n<analytics.methods.length;n++){var key=analytics.methods[n];analytics[key]=analytics.factory(key)}analytics.load=function(key,n){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.setAttribute("data-global-segment-analytics-key",i);t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r);analytics._loadOptions=n};analytics._writeKey="${TELEMETRY_API_KEY}";;analytics.SNIPPET_VERSION="5.2.1";analytics.load("${TELEMETRY_API_KEY}");analytics.page({ properties: { environment: "${DX_ENVIRONMENT}", release: "${DX_RELEASE}" } });}}();`,
        },
      ],
    }),
  ],
});
