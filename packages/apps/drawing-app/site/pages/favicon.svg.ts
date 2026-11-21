//
// Copyright 2026 DXOS.org
//

import favicon from '../../public/favicon.svg?raw';

/** The app's favicon, so the site and the app show the same icon from one file. */
export const GET = () => new Response(favicon, { headers: { 'Content-Type': 'image/svg+xml' } });
