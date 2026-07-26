/* controls.js — the "Look & light" panel.

   Same six controls the original prototype shipped (time of day, exposure,
   haze, reflectivity, interior lights, greenery), rebuilt in plain DOM so the
   page doesn't carry React + ReactDOM + a runtime JSX compiler for one
   settings panel. Every change is pushed straight into window.campusAPI,
   which campus.js installs once the scene exists. */
(function () {
  'use strict';

  var DEFAULTS = {
    timeOfDay: 'Noon',
    exposure: 1.0,
    reflections: 1.0,
    haze: 0.2,
    greenery: 1.0,
    lights: 'Auto',
  };
  var state = Object.assign({}, DEFAULTS);

  var SECTIONS = [
    {
      label: 'Atmosphere',
      rows: [
        { key: 'timeOfDay', label: 'Time of day', type: 'choice', options: ['Morning', 'Noon', 'Dusk'] },
        { key: 'exposure', label: 'Exposure', type: 'range', min: 0.5, max: 1.8, step: 0.05 },
        { key: 'haze', label: 'Haze', type: 'range', min: 0, max: 1, step: 0.05 },
      ],
    },
    {
      label: 'Building',
      rows: [
        { key: 'reflections', label: 'Reflectivity', type: 'range', min: 0, max: 2, step: 0.1 },
        { key: 'lights', label: 'Interior lights', type: 'choice', options: ['Auto', 'On', 'Off'] },
      ],
    },
    {
      label: 'Landscape',
      rows: [{ key: 'greenery', label: 'Greenery', type: 'range', min: 0, max: 1, step: 0.05 }],
    },
  ];

  var panel = document.getElementById('tweaks');
  var toggle = document.getElementById('btnTweaks');
  if (!panel || !toggle) return;

  /* The scene may not exist yet — campus.js dispatches campus-ready when it
     does. Either way the panel is usable immediately: state is applied on
     arrival. */
  var pending = false;
  function apply() {
    if (window.campusAPI) {
      window.campusAPI.apply(state);
    } else if (!pending) {
      pending = true;
      window.addEventListener('campus-ready', function () {
        pending = false;
        window.campusAPI.apply(state);
      }, { once: true });
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmt(row, v) {
    return row.step < 0.1 ? v.toFixed(2) : v.toFixed(1);
  }

  function buildRange(row) {
    var wrap = el('div', 'tw-row');
    var head = el('div', 'tw-head');
    var id = 'tw-' + row.key;
    var label = el('label', null, row.label);
    label.htmlFor = id;
    var out = el('span', 'tw-val', fmt(row, state[row.key]));
    head.appendChild(label);
    head.appendChild(out);

    var input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = row.min;
    input.max = row.max;
    input.step = row.step;
    input.value = state[row.key];
    input.addEventListener('input', function () {
      state[row.key] = parseFloat(input.value);
      out.textContent = fmt(row, state[row.key]);
      apply();
    });

    wrap.appendChild(head);
    wrap.appendChild(input);
    return wrap;
  }

  function buildChoice(row) {
    var group = el('div', 'tw-row');
    var fieldset = el('fieldset', 'tw-seg');
    var legend = el('legend', null, row.label);
    fieldset.appendChild(legend);
    var options = el('div', 'tw-seg-opts');
    row.options.forEach(function (opt) {
      var id = 'tw-' + row.key + '-' + opt;
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'tw-' + row.key;
      input.id = id;
      input.value = opt;
      input.checked = state[row.key] === opt;
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state[row.key] = opt;
        apply();
      });
      var label = el('label', null, opt);
      label.htmlFor = id;
      options.appendChild(input);
      options.appendChild(label);
    });
    fieldset.appendChild(options);
    group.appendChild(fieldset);
    return group;
  }

  SECTIONS.forEach(function (section) {
    panel.appendChild(el('p', 'tw-section', section.label));
    section.rows.forEach(function (row) {
      panel.appendChild(row.type === 'range' ? buildRange(row) : buildChoice(row));
    });
  });

  var reset = el('button', 'tw-reset', 'Reset to noon');
  reset.type = 'button';
  reset.addEventListener('click', function () {
    state = Object.assign({}, DEFAULTS);
    panel.querySelectorAll('input[type=range]').forEach(function (input) {
      var key = input.id.replace('tw-', '');
      input.value = state[key];
      var out = input.parentElement.querySelector('.tw-val');
      if (out) {
        var row = null;
        SECTIONS.forEach(function (s) { s.rows.forEach(function (r) { if (r.key === key) row = r; }); });
        if (row) out.textContent = fmt(row, state[key]);
      }
    });
    panel.querySelectorAll('input[type=radio]').forEach(function (input) {
      input.checked = state[input.name.replace('tw-', '')] === input.value;
    });
    apply();
  });
  panel.appendChild(reset);

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.classList.toggle('active', open);
  }
  toggle.addEventListener('click', function () {
    setOpen(panel.hidden);
  });
  setOpen(false);

  apply();
})();
