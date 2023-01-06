//
// Copyright 2022 DXOS.org
//

export const defaultHover = ({ disabled }: { disabled?: boolean }) => {
  return (
    !disabled &&
    'outline outline-3 outline-transparent hover:z-[1] hover:outline-primary-300 dark:hover:outline-primary-400 hover:focus:outline-primary-300 dark:hover:focus:outline-primary-400'
  );
};
