import React, { ReactElement } from 'react';

export type ListProps = {
  isLoading?: boolean;
  empty?: ReactElement;
  children?: ReactElement | ReactElement[];
};

export const List = (props: ListProps) => {
  const { children, empty } = props;
  const isEmpty = Array.isArray(children) ? !children?.length : !children;
  return <ol>{isEmpty ? empty ?? <div>There are no items to show</div> : children}</ol>;
};
