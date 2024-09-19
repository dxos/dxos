//
// Copyright 2024 DXOS.org
//

export default async ({
  event: {
    data: { request },
  },
  context: { space, ai },
}: any) => {
  const {
    args: [from = 'EUR', to = 'GBP'],
  } = await request.json();
  const res = await fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`);
  const {
    data: { rates },
  } = await res.json();
  return new Response(rates[to].toString());
};
