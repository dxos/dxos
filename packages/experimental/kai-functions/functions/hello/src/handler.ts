//
// Copyright 2023 DXOS.org
//

module.exports = async (event: any, context: any) => {
  console.log('hello', JSON.stringify(event, null, 2));
  console.log(context);
  console.log(event);
  // console.log('client', event.client.halo.identity.get().identityKey.toHex());
  return context.status(200).succeed({ message: 'ok', client: !!context.client });
};
