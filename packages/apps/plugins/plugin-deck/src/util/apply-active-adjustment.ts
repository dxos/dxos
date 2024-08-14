//
// Copyright 2024 DXOS.org
//

import { SLUG_SOLO_INDICATOR, isActiveParts, type Location, type NavigationAdjustment } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { arrayMove } from '@dxos/util';

import { NAV_ID } from '../components';

export const applyActiveAdjustment = (
  active: Location['active'],
  adjustment: NavigationAdjustment,
): Location['active'] => {
  const {
    type,
    layoutCoordinate: { part, index, partSize },
  } = adjustment;
  const [action, direction] = type.split('-');
  switch (action) {
    case 'solo': {
      if (part !== 'main') {
        // TODO(Zan): Add package @dxos/log and use it here.
        log.error('Solo is only supported for main part');
        return active;
      }

      if (isActiveParts(active) && Array.isArray(active.main)) {
        // Remove any existing solo indicator
        const newMain = [...active.main].map((item) => item.replace(SLUG_SOLO_INDICATOR, ''));

        if (active.main[index].includes(SLUG_SOLO_INDICATOR)) {
          newMain[index] = newMain[index].replace(SLUG_SOLO_INDICATOR, '');
        } else {
          newMain[index] = `${SLUG_SOLO_INDICATOR}${newMain[index]}`;
        }

        return { ...active, main: newMain };
      }

      return active;
    }
    case 'increment':
      switch (part) {
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
                if (index > partSize - 2) {
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
      switch (part) {
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
