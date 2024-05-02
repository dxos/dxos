//
// Copyright 2024 DXOS.org
//

import { type Location, type NavigationAdjustment, isActiveParts } from '@dxos/app-framework';
import { arrayMove } from '@dxos/util';

import { NAV_ID } from '../components';

export const applyActiveAdjustment = (
  active: Location['active'],
  adjustment: NavigationAdjustment,
): Location['active'] => {
  const {
    type,
    part: [partName, index, size],
  } = adjustment;
  console.log('[adjust]', adjustment, active);
  const [action, direction] = type.split('-');
  switch (action) {
    case 'increment':
      switch (partName) {
        case 'main':
          // increment is irrelevant with a monolithic active or active.main
          if (isActiveParts(active) && Array.isArray(active.main)) {
            switch (direction) {
              case 'start':
                if (index < 1) {
                  return active;
                } else {
                  const nextMain = arrayMove(active.main, index, index - 1);
                  return {
                    ...active,
                    main: [...nextMain],
                  };
                }
              case 'end':
                if (index > size - 2) {
                  return active;
                } else {
                  const nextMain = arrayMove(active.main, index, index + 1);
                  return {
                    ...active,
                    main: [...nextMain],
                  };
                }
              default:
                return active;
            }
          } else {
            return active;
          }
        default:
          return active;
      }
    case 'pin':
      switch (partName) {
        case 'sidebar':
          switch (direction) {
            case 'end':
              // Un-pin the item in the navigation sidebar
              return isActiveParts(active)
                ? {
                    main: [
                      ...(Object.keys(active).length < 1
                        ? [NAV_ID]
                        : Array.isArray(active.sidebar)
                          ? [active.sidebar[0]]
                          : [active.sidebar]),
                      ...(Array.isArray(active.main) ? active.main : [active.main]),
                    ].filter(Boolean),
                    ...(active.complementary && {
                      complementary: Array.isArray(active.complementary)
                        ? active.complementary[0]
                        : active.complementary,
                    }),
                  }
                : { main: [NAV_ID, active].filter(Boolean) as string[] };
            case 'start':
            default:
              return active;
          }
        case 'complementary':
          switch (direction) {
            case 'start':
              // Un-pin the item in the complementary sidebar, which is only supported if active is ActiveParts
              if (isActiveParts(active)) {
                return {
                  main: [
                    ...(Array.isArray(active.main) ? active.main : [active.main]),
                    ...(Array.isArray(active.complementary) ? [active.complementary[0]] : [active.complementary]),
                  ],
                  ...(active.sidebar && {
                    sidebar: Array.isArray(active.sidebar) ? active.sidebar[0] : active.sidebar,
                  }),
                };
              } else {
                return active;
              }
            case 'end':
            default:
              return active;
          }
        case 'main':
          if (isActiveParts(active)) {
            const subject = active.main[index];
            if (subject) {
              // Pin the subject from main and evict anything previously pinned there into main
              const nextMain = [...(Array.isArray(active.main) ? active.main : [active.main])];
              nextMain.splice(nextMain.indexOf(subject), 1);
              return {
                ...active,
                ...(direction === 'start' && { sidebar: subject }),
                main: [
                  ...(direction === 'start' ? (Array.isArray(active.sidebar) ? active.sidebar : [active.sidebar]) : []),
                  ...nextMain,
                  ...(direction === 'end'
                    ? Array.isArray(active.complementary)
                      ? active.complementary
                      : [active.complementary]
                    : []),
                ].filter(Boolean),
                ...(direction === 'end' && { complementary: subject }),
              };
            } else {
              return active;
            }
          } else {
            if (active) {
              switch (direction) {
                case 'start':
                  return {
                    sidebar: active,
                    main: [NAV_ID],
                  };
                case 'end':
                  return {
                    sidebar: NAV_ID,
                    main: [],
                    complementary: active,
                  };
                default:
                  return active;
              }
            } else {
              return active;
            }
          }
      }
  }
};
