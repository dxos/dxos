// //
// // Copyright 2020 DXOS.org
// //

// import { schema, schemaJson } from '../proto/gen';
// import protobuf from 'protobufjs'
// import { ProfileResponse } from '../proto/gen/dxos/wallet/extension';

// const root = protobuf.Root.fromJSON(schemaJson);

// const rpcImplementation = (function() { // API documentation: Service#create
//   var ended = false;
//   return function myRPCImpl(method: any, requestData: any, callback: any) {
//       if (ended)
//         return;
//       if (!requestData) {
//         ended = true;
//         return;
//       }
//       // in a real-world scenario, the client would now send requestData to a server using some
//       // sort of transport layer (i.e. http), wait for responseData and call the callback.
//       performRequestOverTransportChannel(method, requestData, function(responseData) {
//           callback(null, responseData);
//       });
//   };
// });

// const ProfileServiceDef = root.lookupService("ProfileService"),
//   ProfileRequest = root.lookupType("ProfileRequest"),
//   ProfileResponse = root.lookupType("ProfileResponse");

// export class ProfileService {
//   readonly profile: ProfileResponse | undefined

//   async getProfile() {

//   }
// }
