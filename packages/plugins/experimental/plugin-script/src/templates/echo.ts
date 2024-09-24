//
// Copyright 2024 DXOS.org
//

/**
 * Echos the request data.
 */
export default async ({
  event: {
    data: { request },
  },
}: any) => {
  const data = await request.json();
  return new Response(JSON.stringify(data ?? {}), { headers: { 'Content-Type': 'application/json' } });
};
