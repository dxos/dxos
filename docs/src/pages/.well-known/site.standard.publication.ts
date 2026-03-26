//
// Copyright 2026 DXOS.org
//

import type { APIRoute } from 'astro';
import { generatePublicationWellKnown } from '@bryanguffey/astro-standard-site';

const DID = import.meta.env.ATPROTO_DID;
const PUBLICATION_RKEY = import.meta.env.ATPROTO_PUBLICATION_RKEY;

export const GET: APIRoute = () => {
  if (!DID || !PUBLICATION_RKEY) {
    return new Response('AT Protocol publication not configured', { status: 404 });
  }

  return new Response(
    generatePublicationWellKnown({ did: DID, publicationRkey: PUBLICATION_RKEY }),
    { headers: { 'Content-Type': 'text/plain' } },
  );
};
