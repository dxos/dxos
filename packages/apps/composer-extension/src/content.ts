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
  'min-height': '30rem',
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
  const baseUrl = import.meta.env.VITE_COMPOSER_URL ?? 'https://composer.dxos.org';
  composer.setAttribute('src', `${baseUrl}/embedded/${window.location.href}`);
  composer.setAttribute('style', composerStyles);
  Array.from(commentForm.children).forEach((element) => element.setAttribute('style', srOnly));
  commentForm.appendChild(composer);

  window.addEventListener('message', (event) => {
    if (event.source !== composer.contentWindow) {
      return;
    }

    if (event.data.type === 'close-embed') {
      (cancelButton as HTMLButtonElement).click();
    }
  });

  console.log('Content script initialized.');
}
