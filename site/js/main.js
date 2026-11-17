/* LOVE IS MORE THAN WE THINK — interactions
   No dependencies. Every widget degrades to readable HTML without JS. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };

  /* ---------- template panels ---------- */
  function makePanel(panel) {
    var tpls = $$('template', panel);
    return {
      tpls: tpls,
      show: function (key, attr) {
        var tpl = tpls.filter(function (t) { return t.getAttribute(attr) === String(key); })[0];
        if (!tpl) return;
        $$(':scope > :not(template)', panel).forEach(function (n) { n.remove(); });
        panel.appendChild(tpl.content.cloneNode(true));
      }
    };
  }

  /* ---------- generic roving tabs ---------- */
  function initTabs(buttons, onSelect, opts) {
    opts = opts || {};
    var stateAttr = opts.stateAttr || 'aria-selected';
    var current = 0;
    buttons.forEach(function (b, i) { if (b.getAttribute(stateAttr) === 'true') current = i; });
    function select(i, focus) {
      current = (i + buttons.length) % buttons.length;
      buttons.forEach(function (b, j) {
        b.setAttribute(stateAttr, j === current ? 'true' : 'false');
        b.tabIndex = j === current ? 0 : -1;
      });
      if (focus) buttons[current].focus();
      onSelect(current, buttons[current]);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(current + 1, true); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(current - 1, true); }
        else if (k === 'Home') { e.preventDefault(); select(0, true); }
        else if (k === 'End') { e.preventDefault(); select(buttons.length - 1, true); }
      });
    });
    select(current);
    return { select: select, get index() { return current; } };
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var els = $$('.reveal, .finale');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
    // safety net: never leave content hidden
    setTimeout(function () {
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) el.classList.add('is-visible');
      });
    }, 2500);
  }

  /* ---------- navigation, progress ---------- */
  function initNav() {
    var bar = $('#progress-bar');
    var topbar = $('#topbar');
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
        if (bar) bar.style.transform = 'scaleX(' + p + ')';
        if (topbar) topbar.classList.toggle('is-scrolled', window.scrollY > 10);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var links = $$('#chapnav-list a');
    var label = $('#current-chapter');
    var sections = $$('[data-chapter-name]');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id;
          if (label) label.textContent = en.target.getAttribute('data-chapter-name');
          links.forEach(function (a) {
            var on = a.getAttribute('data-target') === id;
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -54% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }

    // mobile sheet
    var btn = $('#menu-btn'), sheet = $('#chapnav-sheet'), close = $('#sheet-close');
    if (!btn || !sheet) return;
    function open() {
      sheet.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      close.focus();
    }
    function shut(returnFocus) {
      sheet.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (returnFocus) btn.focus();
    }
    btn.addEventListener('click', open);
    close.addEventListener('click', function () { shut(true); });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) shut(true); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { shut(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) shut(true); });
    sheet.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a, button', sheet);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- survey ---------- */
  var THEMES = {
    family: 'Family & romantic love',
    friends: 'Friendship',
    self: 'Self-love',
    animals: 'Animals & pets',
    culture: 'Music, film & pop culture',
    food: 'Food & everyday pleasures',
    pursuits: 'Hobbies, study & goals',
    life: 'Life, people & feelings',
    open: 'Left as written'
  };

  function initSurvey() {
    var src = $$('#answers-source li');
    if (!src.length) return;
    var answers = src.map(function (li, i) {
      return { n: i + 1, text: li.textContent.trim(), themes: (li.getAttribute('data-themes') || '').split(/\s+/).filter(Boolean) };
    });

    // ticker
    var track = $('#ticker-track');
    if (track) {
      var short = answers.filter(function (a) { return a.text.length <= 42; });
      var html = short.map(function (a) { return '<span class="ticker__item"><b>I LOVE</b>' + escapeHTML(a.text.replace(/^I (really )?love /, '')) + '</span>'; }).join('');
      track.innerHTML = html + html;
    }

    var stage = $('#sv-stage'), card = $('#sv-card'), txt = $('#sv-text'), no = $('#sv-no'),
      themesEl = $('#sv-themes'), idx = $('#sv-index'), tot = $('#sv-total'),
      prev = $('#sv-prev'), next = $('#sv-next'), range = $('#sv-range'),
      filterBox = $('#sv-filter'), filterCount = $('#sv-filter-count'), filterName = $('#sv-filter-name'), filterClear = $('#sv-filter-clear');

    var list = answers.slice();
    var pos = 0;
    var activeTheme = null;

    function paint() {
      var a = list[pos];
      txt.textContent = a.text;
      txt.classList.toggle('is-long', a.text.length > 90);
      txt.classList.toggle('is-medium', a.text.length > 34 && a.text.length <= 90);
      no.textContent = 'Response ' + pad(a.n) + ' of ' + answers.length;
      themesEl.innerHTML = a.themes.map(function (t) { return '<li>' + THEMES[t] + '</li>'; }).join('');
      idx.textContent = pad(pos + 1);
      tot.textContent = pad(list.length);
      range.max = String(list.length);
      range.value = String(pos + 1);
      range.setAttribute('aria-valuetext', 'Answer ' + (pos + 1) + ' of ' + list.length + ': ' + a.text);
      stage.setAttribute('aria-label', 'Survey response ' + (pos + 1) + ' of ' + list.length + '. Use the left and right arrow keys to move between answers.');
    }

    var busy = false;
    function go(to, dir) {
      if (!list.length) return;
      to = (to + list.length) % list.length;
      if (to === pos && dir !== 0) return;
      if (reduceMotion || dir === 0) { pos = to; paint(); return; }
      if (busy) { pos = to; paint(); return; }
      busy = true;
      card.classList.add(dir > 0 ? 'is-leaving-l' : 'is-leaving-r');
      setTimeout(function () {
        pos = to; paint();
        card.classList.remove('is-leaving-l', 'is-leaving-r');
        card.style.transition = 'none';
        card.style.transform = 'translateX(' + (dir > 0 ? 24 : -24) + 'px)';
        card.style.opacity = '0';
        void card.offsetWidth;
        card.style.transition = '';
        card.style.transform = '';
        card.style.opacity = '';
        busy = false;
      }, 200);
    }

    prev.addEventListener('click', function () { go(pos - 1, -1); });
    next.addEventListener('click', function () { go(pos + 1, 1); });
    range.addEventListener('input', function () { go(parseInt(range.value, 10) - 1, 0); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(pos + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos - 1, -1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0, -1); }
      else if (e.key === 'End') { e.preventDefault(); go(list.length - 1, 1); }
    });

    // swipe
    var sx = null, sy = null;
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(pos + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', function () { sx = sy = null; });

    // filter
    function setFilter(theme) {
      activeTheme = theme;
      list = theme ? answers.filter(function (a) { return a.themes.indexOf(theme) !== -1; }) : answers.slice();
      pos = 0;
      filterBox.hidden = !theme;
      if (theme) { filterCount.textContent = list.length; filterName.textContent = THEMES[theme]; }
      $$('.tbar').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme') === theme ? 'true' : 'false'); });
      paint();
    }
    filterClear.addEventListener('click', function () { setFilter(null); stage.focus(); });

    // themes chart
    var chart = $('#themes-chart');
    if (chart) {
      var counts = {};
      Object.keys(THEMES).forEach(function (k) { counts[k] = 0; });
      answers.forEach(function (a) { a.themes.forEach(function (t) { counts[t]++; }); });
      var keys = Object.keys(THEMES).filter(function (k) { return k !== 'open'; }).sort(function (a, b) { return counts[b] - counts[a]; });
      keys.push('open');
      var max = Math.max.apply(null, keys.map(function (k) { return counts[k]; }));
      chart.innerHTML = keys.map(function (k) {
        return '<div role="listitem"><button class="tbar' + (k === 'open' ? ' tbar--open' : '') + '" data-theme="' + k + '" aria-pressed="false" aria-label="' + THEMES[k] + ': ' + counts[k] + ' answers. Show only these in the viewer.">' +
          '<span class="tbar__label">' + THEMES[k] + '</span>' +
          '<span class="tbar__track"><span class="tbar__fill" data-w="' + (counts[k] / max * 100).toFixed(1) + '"></span></span>' +
          '<span class="tbar__n">' + counts[k] + '</span></button></div>';
      }).join('');
      var fills = $$('.tbar__fill', chart);
      var grow = function () { fills.forEach(function (f) { f.style.width = f.getAttribute('data-w') + '%'; }); };
      if ('IntersectionObserver' in window && !reduceMotion) {
        var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { grow(); io.disconnect(); } }, { threshold: 0.2 });
        io.observe(chart);
      } else grow();
      $$('.tbar', chart).forEach(function (b) {
        b.addEventListener('click', function () {
          var t = b.getAttribute('data-theme');
          setFilter(activeTheme === t ? null : t);
          $('#survey-viewer').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
          setTimeout(function () { stage.focus({ preventScroll: true }); }, 400);
        });
      });
    }

    paint();
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---------- Darina timeline ---------- */
  function initTimelines() {
    $$('[data-timeline]').forEach(function (root) {
      var btns = $$('[role="tab"]', root);
      var panel = makePanel($('[role="tabpanel"]', root));
      var pos = $('[data-tl-pos]', root);
      var trackEl = $('.timeline__track', root);
      var prevB = $('[data-tl-prev]', root), nextB = $('[data-tl-next]', root);
      var tabs = initTabs(btns, function (i, b) {
        panel.show(i, 'data-step');
        btns.forEach(function (x, j) { x.classList.toggle('is-past', j < i); });
        pos.textContent = pad(i + 1) + ' / ' + pad(btns.length);
        prevB.disabled = i === 0;
        nextB.disabled = i === btns.length - 1;
        var li = b.parentElement;
        if (trackEl.scrollWidth > trackEl.clientWidth) {
          trackEl.scrollTo({ left: li.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
      prevB.addEventListener('click', function () { tabs.select(tabs.index - 1); });
      nextB.addEventListener('click', function () { tabs.select(tabs.index + 1); });
    });
  }

  /* ---------- simple template tab widgets ---------- */
  function templateTabs(rootSel, btnSel, attr, extra) {
    var root = $(rootSel);
    if (!root) return;
    var btns = $$(btnSel, root);
    var panelEl = $('#' + btns[0].getAttribute('aria-controls'));
    var panel = makePanel(panelEl);
    initTabs(btns, function (i, b) {
      panel.show(b.getAttribute(attr), attr);
      if (extra) extra(i, b, root, panelEl);
    });
  }

  function initWidgets() {
    // Magzhan: ways of expressing friendship
    templateTabs('#expr', '[role="tab"]', 'data-expr');

    // Brain
    templateTabs('#brain', '.brain__tabs [role="tab"]', 'data-mol', function (i, b, root) {
      var mol = b.getAttribute('data-mol');
      root.setAttribute('data-mol', mol);
      $$('.node', root).forEach(function (n) {
        n.classList.toggle('is-on', (n.getAttribute('data-for') || '').split(' ').indexOf(mol) !== -1);
      });
    });

    // Dimensions: keys + view toggle
    templateTabs('#dims', '.dims__keys [role="tab"]', 'data-dim', function (i, b, root) {
      $$('.dims__shapes ellipse', root).forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-dim') === b.getAttribute('data-dim')); });
    });
    var dims = $('#dims');
    if (dims) initTabs($$('.toggle [role="radio"]', dims), function (i, b) { dims.setAttribute('data-view', b.getAttribute('data-view')); }, { stateAttr: 'aria-checked' });

    // Psychology
    templateTabs('.matrix', '[role="tab"]', 'data-m');
    templateTabs('#triad', '[role="tab"]', 'data-edge', function (i, b, root) {
      $$('.triad__edges path', root).forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-edge') === b.getAttribute('data-edge')); });
    });
    templateTabs('#layers', '[role="tab"]', 'data-layer', function (i, b, root) {
      $$('.layers__stage circle', root).forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('data-layer') === b.getAttribute('data-layer')); });
    });

    // Four forms
    templateTabs('#forms-picker', '[role="tab"]', 'data-f', function (i, b, root, panelEl) {
      panelEl.classList.remove('is-swapping');
      void panelEl.offsetWidth;
      if (!reduceMotion) panelEl.classList.add('is-swapping');
    });

    // Rory: affection / responsibility
    var weigh = $('#weigh');
    if (weigh) {
      var wb = $$('[role="tab"]', weigh);
      initTabs(wb, function (i) {
        wb.forEach(function (b, j) { $('#' + b.getAttribute('aria-controls')).hidden = j !== i; });
      });
    }

    // Digital: online / everyday
    var onoff = $('#onoff');
    if (onoff) initTabs($$('.toggle [role="radio"]', onoff), function (i, b) { onoff.setAttribute('data-show', b.getAttribute('data-show')); }, { stateAttr: 'aria-checked' });

    // Aruzhan flip cards
    $$('.flip').forEach(function (f) {
      f.addEventListener('click', function () {
        f.setAttribute('aria-pressed', f.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });

    // Research dots
    $$('[data-dots]').forEach(function (el) {
      var n = parseInt(el.getAttribute('data-dots'), 10) || 0;
      el.innerHTML = new Array(n + 1).join('<i></i>');
    });

    // Exhibition carousel
    var track = $('#ex-track'), exPrev = $('#ex-prev'), exNext = $('#ex-next');
    if (track && exPrev && exNext) {
      var step = function () { var w = $('.work', track); return w ? w.getBoundingClientRect().width + 18 : 300; };
      var update = function () {
        exPrev.disabled = track.scrollLeft < 4;
        exNext.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      };
      exPrev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
      exNext.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
      track.addEventListener('scroll', update, { passive: true });
      track.addEventListener('keydown', function (e) {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
      });
      window.addEventListener('resize', update);
      update();
    }

    // Citation links open their source
    $$('a[href^="#src-"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var d = document.getElementById(a.getAttribute('href').slice(1));
        if (d && d.tagName === 'DETAILS') {
          d.open = true;
          d.classList.remove('is-flash'); void d.offsetWidth; d.classList.add('is-flash');
        }
      });
    });
  }

  function init() {
    initReveal();
    initNav();
    initSurvey();
    initTimelines();
    initWidgets();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
