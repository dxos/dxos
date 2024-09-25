//
// Copyright 2024 DXOS.org
//

export default async ({
  event: {
    data: { request },
  },
}: any) => {
  const data = await request.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }});
};
