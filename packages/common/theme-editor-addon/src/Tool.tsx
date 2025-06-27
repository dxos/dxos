//
// Copyright 2025 DXOS.org
//

// import { type API, useStorybookApi } from '@storybook/manager-api';

// export const Tool = ({ api }: { api: API }) => {
//   const sbApi = useStorybookApi();

//   const toggleThemeEditor = useCallback(() => {
//     api.getChannel()?.emit(PARAM_KEY, { state: 'open' });
//   }, [api]);

//   useEffect(() => {
//     void sbApi?.setAddonShortcut(ADDON_ID, {
//       label: 'Toggle theme editor [8]',
//       defaultShortcut: ['8'],
//       actionName: 'toggleThemeEditor',
//       action: toggleThemeEditor,
//     });
//   }, [sbApi, toggleThemeEditor]);

//   return (
//     <IconButton key={TOOL_ID} title='Toggle theme editor' onClick={toggleThemeEditor}>
//       <ControlsIcon />
//     </IconButton>
//   );
// };
