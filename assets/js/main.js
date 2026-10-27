/* ÍndiceMor — interações do site (sem dependências) */
(function () {
  'use strict';

  /* Cabeçalho: sombra ao rolar ------------------------------------------ */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menu móvel ------------------------------------------------------------ */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
    var setOpen = function (open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 1151px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* Entrada suave de elementos -------------------------------------------- */
  var animated = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) {
    animated.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    animated.forEach(function (el) { io.observe(el); });
  }

  /* Formulários ----------------------------------------------------------- */
  var labelText = function (field) {
    var label = field.form.querySelector('label[for="' + field.id + '"]');
    if (!label) return 'este campo';
    var clone = label.cloneNode(true);
    clone.querySelectorAll('.req, .opt').forEach(function (n) { n.remove(); });
    return clone.textContent.trim();
  };

  var digits = function (v) { return v.replace(/\D/g, ''); };

  // Formata telefone brasileiro: (62) 99999-9999 ou (62) 3333-3333
  var maskPhone = function (input) {
    var d = digits(input.value).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
    var out = d;
    if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 6) {
      var split = d.length === 11 ? 7 : 6;
      out = '(' + d.slice(0, 2) + ') ' + d.slice(2, split) + '-' + d.slice(split);
    }
    input.value = out;
  };

  var validate = function (field) {
    var v = (field.value || '').trim();
    var name = labelText(field);
    if (field.type === 'checkbox') {
      return field.required && !field.checked ? 'É necessário autorizar o uso dos dados para continuar.' : '';
    }
    if (field.type === 'file') {
      var file = field.files && field.files[0];
      if (!file) return field.required ? 'Anexe o seu currículo.' : '';
      var ok = /\.(pdf|docx?)$/i.test(file.name);
      if (!ok) return 'Envie o arquivo em PDF, DOC ou DOCX.';
      var max = Number(field.dataset.maxMb || 5);
      if (file.size > max * 1024 * 1024) return 'O arquivo deve ter no máximo ' + max + ' MB.';
      return '';
    }
    if (!v) {
      if (!field.required) return '';
      return field.tagName === 'SELECT' ? 'Selecione uma opção em “' + name + '”.' : 'Preencha o campo “' + name + '”.';
    }
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Informe um e-mail válido, como nome@prefeitura.gov.br.';
    if (field.type === 'tel') {
      var n = digits(v).length;
      if (n < 10 || n > 11) return 'Informe o telefone com DDD, como (62) 99999-9999.';
    }
    if (field.minLength > 0 && v.length < field.minLength) return 'Escreva pelo menos ' + field.minLength + ' caracteres.';
    return '';
  };

  var showError = function (field, msg) {
    var err = document.getElementById(field.id + '-error');
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (!err) return;
    err.textContent = msg;
    err.hidden = !msg;
  };

  // Pré-seleciona a área vinda das páginas de solução (?area=rural)
  var preset = new URLSearchParams(location.search).get('area');
  if (preset) {
    document.querySelectorAll('input[name="areas"]').forEach(function (cb) {
      if (cb.value === preset) cb.checked = true;
    });
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.noValidate = true; // validação própria, com mensagens em português
    var fields = Array.prototype.slice.call(form.querySelectorAll('input[id], select[id], textarea[id]'));
    var status = form.querySelector('.form-status');
    var pending = form.querySelector('template[data-pending]');

    fields.forEach(function (f) {
      if (f.type === 'tel') f.addEventListener('input', function () { maskPhone(f); });
      var evt = f.type === 'checkbox' || f.type === 'file' || f.tagName === 'SELECT' ? 'change' : 'blur';
      f.addEventListener(evt, function () { if (f.dataset.touched || evt === 'change') { f.dataset.touched = '1'; showError(f, validate(f)); } });
      f.addEventListener('blur', function () { if (f.value) f.dataset.touched = '1'; });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true' && !validate(f)) showError(f, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = [];
      fields.forEach(function (f) {
        f.dataset.touched = '1';
        var msg = validate(f);
        showError(f, msg);
        if (msg) errors.push({ field: f, msg: msg });
      });

      status.hidden = false;
      status.innerHTML = '';
      if (errors.length) {
        status.className = 'form-status is-error';
        var h = document.createElement('h3');
        h.textContent = errors.length === 1 ? 'Há 1 campo a corrigir' : 'Há ' + errors.length + ' campos a corrigir';
        var ul = document.createElement('ul');
        errors.forEach(function (er) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + er.field.id;
          a.textContent = er.msg;
          a.addEventListener('click', function (ev) { ev.preventDefault(); er.field.focus(); });
          li.appendChild(a);
          ul.appendChild(li);
        });
        status.appendChild(h);
        status.appendChild(ul);
        errors[0].field.focus();
        return;
      }

      // Sem integração de envio: informa com clareza e não simula sucesso.
      status.className = 'form-status is-info';
      if (pending) status.appendChild(pending.content.cloneNode(true));
      status.focus();
    });
  });
})();
