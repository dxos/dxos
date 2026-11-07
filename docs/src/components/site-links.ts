//
// Copyright 2026 DXOS.org
//

/** The main site's pages, as the Webflow nav lists them; the Starlight header and footer link the same set. */
export const siteLinks = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'echo', label: 'ECHO', href: '/echo' },
  { id: 'composer', label: 'Composer', href: '/composer' },
  { id: 'plugins', label: 'Plugins', href: '/plugins' },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'docs', label: 'Docs', href: '/docs' },
] as const;
