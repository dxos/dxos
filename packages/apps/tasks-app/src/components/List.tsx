import React, { ReactElement } from 'react';

export type ListProps = {
  isLoading?: boolean;
  children?: ReactElement | ReactElement[];
};

export const List = (props: ListProps) => {
  const { children } = props;
  const isEmpty = Array.isArray(children) ? !children?.length : !children;
  return <ol>{isEmpty ? <div>There are no items to show</div> : children}</ol>;
};
