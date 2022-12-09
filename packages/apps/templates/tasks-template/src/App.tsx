// //
// // Copyright 2022 DXOS.org
// //

// import '@dxosTheme';
// import React from 'react';
// import { HashRouter, useOutletContext, useRoutes } from 'react-router-dom';
// import { useRegisterSW } from 'virtual:pwa-register/react';

// import { Item, Space, ObjectModel } from '@dxos/client';
// import { Config, Defaults, Dynamics } from '@dxos/config';
// import {
//   ServiceWorkerToast,
//   translations,
//   AppLayout,
//   SpacesPage,
//   GenericFallback,
//   Fallback,
//   RequireIdentity,
//   ManageSpacePage
// } from '@dxos/react-appkit';
// import { ClientProvider, useConfig, useSelection } from '@dxos/react-client';
// import { List, LIST_TYPE } from '@dxos/react-list';
// import { Loading, UiKitProvider, useTranslation } from '@dxos/react-uikit';

// import translationResources from './translations';

// const configProvider = async () => new Config(await Dynamics(), Defaults());

// export const App = () => {
//   const {
//     offlineReady: [offlineReady, _setOfflineReady],
//     needRefresh: [needRefresh, _setNeedRefresh],
//     updateServiceWorker
//   } = useRegisterSW({ onRegisterError: (err) => console.error(err) });

//   return (
//     <UiKitProvider
//       resourceExtensions={[translations, translationResources]}
//       fallback={<Fallback message='Loading...' />}
//       appNs='hello'
//     >
//       <ClientProvider config={configProvider} fallback={<GenericFallback />}>
//         <HashRouter>
//           <Routes />
//           {needRefresh ? (
//             <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
//           ) : offlineReady ? (
//             <ServiceWorkerToast variant='offlineReady' />
//           ) : null}
//         </HashRouter>
//       </ClientProvider>
//     </UiKitProvider>
//   );
// };

// const Routes = () => {
//   const config = useConfig();
//   const remoteSource = new URL(config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

//   const handleSpaceCreate = async (space: Space) => {
//     await space.database.createItem({
//       model: ObjectModel,
//       type: LIST_TYPE
//     });
//   };

//   return useRoutes([
//     {
//       path: '/',
//       element: <RequireIdentity redirect={remoteSource.origin} />,
//       children: [
//         {
//           path: '/',
//           element: <AppLayout spacesPath='/' />,
//           children: [
//             {
//               path: '/',
//               element: <SpacesPage onSpaceCreate={handleSpaceCreate} />
//             },
//             {
//               path: '/spaces/:space',
//               element: <SpacePage />
//             },
//             {
//               path: '/spaces/:space/settings',
//               element: <ManageSpacePage />
//             }
//           ]
//         }
//       ]
//     }
//   ]);
// };

// const SpacePage = () => {
//   const { t } = useTranslation('hello');
//   const { space } = useOutletContext<{ space: Space }>();

//   const [item] = useSelection<Item<ObjectModel>>(space?.select().filter({ type: LIST_TYPE })) ?? [];

//   return item ? (
//     <List itemId={item.id} spaceKey={space.key} />
//   ) : (
//     <Loading label={t('generic loading label')} size='md' />
//   );
// };
