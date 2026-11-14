//
// Copyright 2026 DXOS.org
//

/** Blog links are hidden from every nav and footer until the blog is ready; its pages still build. */
export const showBlog = false;

const allSiteLinks = [
  { id: 'home', label: 'Home', href: '/' },
  // Links to the first page, so the redirect from `/docs` is never a hop; `section` marks every docs page current.
  { id: 'docs', label: 'Docs', href: '/docs/', section: '/docs' },
  { id: 'echo', label: 'ECHO', href: '/echo' },
  { id: 'composer', label: 'Composer', href: '/composer' },
  { id: 'plugins', label: 'Plugins', href: '/plugins' },
  { id: 'blog', label: 'Blog', href: '/blog' },
] as const satisfies readonly { id: string; label: string; href: string; section?: string }[];

/** The main site's pages, Docs right after Home, as the footers list them. */
export const siteLinks = allSiteLinks.filter(({ id }) => showBlog || id !== 'blog');
