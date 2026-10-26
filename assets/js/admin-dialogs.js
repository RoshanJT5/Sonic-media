(function (global) {
  'use strict';

  const queue = [];
  let active = null;
  let previousFocus = null;

  const icons = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6m0-6-6 6"></path></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>'
  };

  function normalizeOptions(input, extra) {
    const options = typeof input === 'string'
      ? Object.assign({ message: input }, extra || {})
      : Object.assign({}, input || {});
    options.tone = ['info', 'warning', 'danger', 'success'].includes(options.tone) ? options.tone : 'info';
    options.title = options.title || ({
      info: 'Notice', warning: 'Check this before continuing', danger: 'Action could not be completed', success: 'Completed'
    })[options.tone];
    return options;
  }

  function ensureHost() {
    let overlay = document.getElementById('adminDialogOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'adminDialogOverlay';
    overlay.className = 'admin-dialog-overlay';
    overlay.hidden = true;
    document.body.appendChild(overlay);
    return overlay;
  }

  function complete(value) {
    if (!active) return;
    const current = active;
    active = null;
    const overlay = ensureHost();
    overlay.classList.remove('is-open');
    window.setTimeout(() => {
      overlay.hidden = true;
      overlay.innerHTML = '';
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
      current.resolve(value);
      processQueue();
    }, 170);
  }

  function processQueue() {
    if (active || queue.length === 0) return;
    active = queue.shift();
    const options = active.options;
    const overlay = ensureHost();
    previousFocus = document.activeElement;
    const isConfirm = options.mode === 'confirm';
    const isPrompt = options.mode === 'prompt';
    const describedBy = [
      'adminDialogMessage',
      (options.detail || options.recovery) ? 'adminDialogSupport' : '',
      (options.detail && options.recovery) ? 'adminDialogRecovery' : ''
    ].filter(Boolean).join(' ');

    overlay.innerHTML = `
      <section class="admin-dialog admin-dialog--${options.tone}" role="alertdialog" aria-modal="true" aria-labelledby="adminDialogTitle" aria-describedby="${describedBy}">
        <button type="button" class="admin-dialog__close" data-dialog-action="cancel" aria-label="Close message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
        </button>
        <div class="admin-dialog__body">
          <div class="admin-dialog__icon">${icons[options.tone]}</div>
          <div>
            <h2 class="admin-dialog__title" id="adminDialogTitle"></h2>
            <p class="admin-dialog__message" id="adminDialogMessage"></p>
            ${options.detail ? '<p class="admin-dialog__detail" id="adminDialogSupport"></p>' : (options.recovery ? '<p class="admin-dialog__recovery" id="adminDialogSupport"></p>' : '')}
            ${options.detail && options.recovery ? '<p class="admin-dialog__recovery" id="adminDialogRecovery"></p>' : ''}
            ${isPrompt ? '<input class="admin-dialog__input" id="adminDialogInput" autocomplete="off">' : ''}
          </div>
        </div>
        <div class="admin-dialog__actions">
          ${(isConfirm || isPrompt) ? '<button type="button" class="admin-dialog__button" data-dialog-action="cancel"></button>' : ''}
          <button type="button" class="admin-dialog__button admin-dialog__button--primary" data-dialog-action="confirm"></button>
        </div>
      </section>`;

    overlay.querySelector('#adminDialogTitle').textContent = options.title;
    overlay.querySelector('#adminDialogMessage').textContent = options.message || '';
    const support = overlay.querySelector('#adminDialogSupport');
    if (support) support.textContent = options.detail || `Next step: ${options.recovery}`;
    const recovery = overlay.querySelector('#adminDialogRecovery');
    if (recovery) recovery.textContent = `Next step: ${options.recovery}`;
    const input = overlay.querySelector('#adminDialogInput');
    if (input) {
      input.value = options.defaultValue || '';
      input.placeholder = options.placeholder || '';
      input.setAttribute('aria-label', options.inputLabel || options.title);
    }
    const cancel = overlay.querySelector('.admin-dialog__button[data-dialog-action="cancel"]');
    if (cancel) cancel.textContent = options.cancelLabel || 'Cancel';
    const confirm = overlay.querySelector('.admin-dialog__button[data-dialog-action="confirm"]');
    confirm.textContent = options.confirmLabel || (isConfirm ? 'Continue' : isPrompt ? 'Apply' : 'Close');

    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    overlay.querySelectorAll('[data-dialog-action]').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.dialogAction;
        if (action === 'confirm') complete(isPrompt ? input.value : true);
        else complete(isPrompt ? null : false);
      });
    });

    overlay.onkeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        complete(isPrompt ? null : false);
        return;
      }
      if (event.key === 'Enter' && isPrompt && event.target === input) {
        event.preventDefault();
        complete(input.value);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(overlay.querySelectorAll('button:not([disabled]), input:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.setTimeout(() => (input || confirm).focus(), 0);
  }

  function open(input, mode) {
    const options = normalizeOptions(input);
    options.mode = mode;
    return new Promise(resolve => {
      queue.push({ options, resolve });
      processQueue();
    });
  }

  function readableError(error) {
    const raw = String((error && (error.message || error.error_description)) || error || '').trim();
    const value = raw.toLowerCase();
    if (/row-level security|permission denied|unauthori[sz]ed|jwt|session|401|403/.test(value)) {
      return { message: 'Your admin session is no longer authorized.', recovery: 'Sign in again, then retry the action. Your unsaved builder work remains in this browser.' };
    }
    if (/failed to fetch|network|offline|timeout|load failed/.test(value) || (global.navigator && global.navigator.onLine === false)) {
      return { message: 'The admin panel could not reach the server.', recovery: 'Check your internet connection and retry. Your current edits have not been discarded.' };
    }
    if (/duplicate|unique constraint|23505|already exists/.test(value)) {
      return { message: 'That URL identifier is already being used.', recovery: 'Choose a different slug and save again.' };
    }
    if (/storage|bucket|payload too large|file.*large|mime|file type/.test(value)) {
      return { message: 'The image could not be uploaded.', recovery: 'Use a JPG, PNG, WebP, AVIF, or GIF file smaller than 5 MB, then retry.' };
    }
    return { message: 'The requested admin action could not be completed.', recovery: 'Retry once. If it still fails, refresh the admin panel and check the browser console for technical details.' };
  }

  const AdminDialog = {
    alert(input, extra) { return open(normalizeOptions(input, extra), 'alert'); },
    confirm(input) { return open(input, 'confirm'); },
    prompt(input) { return open(input, 'prompt'); },
    error(context, error, recovery) {
      console.error(`[Admin] ${context}:`, error);
      const readable = readableError(error);
      return open({
        tone: 'danger',
        title: `Couldn’t ${context}`,
        message: readable.message,
        recovery: recovery || readable.recovery,
        confirmLabel: 'Close'
      }, 'alert');
    },
    readableError
  };

  global.AdminDialog = AdminDialog;
  global.showAdminMessage = (input, extra) => AdminDialog.alert(input, extra);
  global.showAdminError = (context, error, recovery) => AdminDialog.error(context, error, recovery);
  global.confirmAdminAction = input => AdminDialog.confirm(input);
  global.promptAdminInput = input => AdminDialog.prompt(input);
})(window);
