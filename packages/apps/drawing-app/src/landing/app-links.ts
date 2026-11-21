//
// Copyright 2026 DXOS.org
//

/**
 * Points every `a[data-app-link]` at the app host of the environment the page is served from (spec F-13.6). The
 * markup carries production's link; each environment's app is at `app.` of its site host (F-13.1).
 */
export const linkApp = (): void => {
  const appOrigin =
    import.meta.env.VITE_DRAWING_APP_URL ??
    `${window.location.protocol}//app.${window.location.host.replace(/^www\./, '')}`;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-app-link]')) {
    link.href = `${appOrigin}/`;
  }
};
