//
// Copyright 2026 DXOS.org
//

import { prerendered } from '../util/prerendered.ts';

/** The hero drawing as a `.dx.svg`, so the editor's Download works before its script loads. */
export const GET = async () => {
  const { file } = await prerendered();
  return new Response(file.svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
