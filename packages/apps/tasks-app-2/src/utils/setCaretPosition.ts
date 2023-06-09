//
// Copyright 2023 DXOS.org
//

export const setCaretPosition = (el: any, pos: number) => {
  if (el.createTextRange) {
    const range = el.createTextRange();
    range.move('character', pos);
    range.select();
  } else {
    if (el.selectionStart) {
      el.focus();
      el.setSelectionRange(pos, pos);
    } else {
      el.focus();
    }
  }
};
