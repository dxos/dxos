//
// Copyright 2023 DXOS.org
//

const srOnly = Object.entries({
  clip: 'rect(0 0 0 0)',
  'clip-path': 'inset(50%)',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  'white-space': 'nowrap',
  width: '1px'
}).reduce((acc, [key, value]) => `${acc}${key}: ${value};`, '');

const composerStyles = Object.entries({
  border: 0,
  'border-radius': '6px',
  width: '100%',
  height: '100%',
  'margin-bottom': '-5px'
}).reduce((acc, [key, value]) => `${acc}${key}: ${value};`, '');

const issueId = (document.getElementsByName('issue[id]')[0] as HTMLInputElement)?.value;
const issueForm = document.getElementById(`issue-${issueId}-edit-form`);
const commentForm = Array.from(document.getElementsByClassName('js-previewable-comment-form')).find((element) => {
  return issueForm?.contains(element);
});
const cancelButton = Array.from(document.getElementsByClassName('js-comment-cancel-button')).find((element) => {
  return issueForm?.contains(element);
});

if (commentForm) {
  const composer = document.createElement('iframe');
  composer.setAttribute('src', import.meta.env.VITE_COMPOSER_URL ?? 'https://composer.dxos.org');
  composer.setAttribute('style', composerStyles);
  Array.from(commentForm.children).forEach((element) => element.setAttribute('style', srOnly));
  commentForm.appendChild(composer);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cancelButton) {
      (cancelButton as HTMLButtonElement).click();
    }
  });

  console.log('Content script initialized.');
}
