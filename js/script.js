/* ============================================================================
   NETORA - Landing behaviour
   ----------------------------------------------------------------------------
   Four jobs, nothing more:
     1. Mobile navigation panel
     2. Sticky-header border, driven by a sentinel (not a scroll listener)
     3. Scroll reveal via IntersectionObserver
     4. Contact form with real validation and real submit states

   Deliberately NOT used anywhere in this file:
     - window.addEventListener('scroll')  -> fires every frame, janks on mobile
     - alert()                            -> blocks the thread, cannot be styled
   ========================================================================= */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasObserver = 'IntersectionObserver' in window;

  /* -------------------------------------------------------------------------
     1. MOBILE NAVIGATION
     ---------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('primaryNav');
    if (!toggle || !nav) return;

    var icon = toggle.querySelector('i');

    function setOpen(open) {
      nav.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      if (icon) icon.className = open ? 'ph ph-x' : 'ph ph-list';
    }

    toggle.addEventListener('click', function () {
      setOpen(nav.dataset.open !== 'true');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.dataset.open === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    var desktop = window.matchMedia('(min-width: 901px)');
    var onBreakpoint = function (event) { if (event.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else desktop.addListener(onBreakpoint); // Safari < 14
  }

  /* -------------------------------------------------------------------------
     2. STICKY HEADER
     A 1px sentinel at the top of the document. When it scrolls out of view
     the header gains its border. This is the observer-based equivalent of a
     scroll listener, at zero per-frame cost.
     ---------------------------------------------------------------------- */
  function initHeader() {
    var header = document.getElementById('siteHeader');
    if (!header || !hasObserver) return;

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);

    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* -------------------------------------------------------------------------
     3. SCROLL REVEAL
     One observer for the page. Each element is unobserved the moment it
     reveals, so the observer's work shrinks as the user scrolls.
     Reason for this animation: hierarchy. It walks the eye down the page in
     reading order instead of dropping every section in at once.
     ---------------------------------------------------------------------- */
  function initReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (prefersReducedMotion || !hasObserver) {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, {
      // Fire slightly before the element reaches the fold so the transition
      // has finished by the time it is properly in view.
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.1
    });

    Array.prototype.forEach.call(targets, function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------------------------
     4. CONTACT FORM
     Posts to the same Formspree endpoint the previous site used, with the
     email / subject / message field names unchanged, so nothing downstream
     breaks. The extra fields (nombre, empresa, ruc, telefono) ride along.
     ---------------------------------------------------------------------- */
  var FORMSPREE_ENDPOINT = 'https://formspree.io/f/mldlyzvy';

  function initForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    var status = document.getElementById('formStatus');
    var button = document.getElementById('formSubmit');
    var labelEl = button ? button.querySelector('[data-label]') : null;
    var defaultLabel = labelEl ? labelEl.textContent : 'Enviar';

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function fieldOf(input) { return input.closest('.field'); }

    function setInvalid(input, invalid) {
      var field = fieldOf(input);
      if (!field) return;
      field.classList.toggle('is-invalid', invalid);
      input.setAttribute('aria-invalid', String(invalid));
    }

    function showStatus(kind, message) {
      if (!status) return;
      status.className = 'form-status is-visible ' + (kind === 'ok' ? 'is-ok' : 'is-error');
      status.innerHTML =
        '<i class="ph ' + (kind === 'ok' ? 'ph-check-circle' : 'ph-warning-circle') + '" aria-hidden="true"></i>' +
        '<span></span>';
      status.querySelector('span').textContent = message; // textContent: no HTML injection
    }

    function clearStatus() {
      if (!status) return;
      status.className = 'form-status';
      status.textContent = '';
    }

    /* Validate one field. Returns true when it passes.
       RUC is Peru's tax ID: exactly 11 digits. */
    function validate(input) {
      var value = (input.value || '').trim();
      var ok;

      if (input.type === 'email') ok = EMAIL_RE.test(value);
      else if (input.id === 'ruc') ok = /^\d{11}$/.test(value.replace(/\s/g, ''));
      else if (input.id === 'telefono') ok = value.replace(/\D/g, '').length >= 6;
      else ok = value.length > 0;

      setInvalid(input, !ok);
      return ok;
    }

    var required = form.querySelectorAll('[required]');

    // Clear the error as soon as the user fixes the field.
    Array.prototype.forEach.call(required, function (input) {
      input.addEventListener('input', function () {
        var field = fieldOf(input);
        if (field && field.classList.contains('is-invalid')) validate(input);
      });
      input.addEventListener('blur', function () {
        if ((input.value || '').trim()) validate(input);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearStatus();

      var firstInvalid = null;
      Array.prototype.forEach.call(required, function (input) {
        if (!validate(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        showStatus('error', 'Revisa los campos marcados para poder enviar tu solicitud.');
        firstInvalid.focus();
        return;
      }

      // Busy state on the button instead of a blocking dialog.
      if (button) button.dataset.busy = 'true';
      if (labelEl) labelEl.textContent = 'Enviando';

      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Formspree respondió ' + response.status);
          form.reset();
          showStatus('ok', 'Recibimos tu solicitud. Un consultor te contacta el mismo día hábil.');
        })
        .catch(function () {
          // Never leave the user without a path forward: offer WhatsApp.
          showStatus('error', 'No pudimos enviar el mensaje. Escríbenos por WhatsApp al +51 997 086 750.');
        })
        .then(function () {
          if (button) button.dataset.busy = 'false';
          if (labelEl) labelEl.textContent = defaultLabel;
        });
    });
  }

  /* -------------------------------------------------------------------------
     BOOT. The script is deferred, so the DOM is already parsed.
     ---------------------------------------------------------------------- */
  initNav();
  initHeader();
  initReveal();
  initForm();
})();
