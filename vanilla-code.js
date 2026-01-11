(() => {
  'use strict';

  const mrr_STATE = new WeakMap(); // originalInput -> state

  const mrr_MONTHS_PT_ABBR = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  const mrr_MONTHS_PT_FULL = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  // DOW no estilo print 2
  const mrr_DOW_PT = ['D','S','T','Q','Q','S','S'];

  const mrr_ICON_CAL = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm0 6H4v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8h-3v1a1 1 0 1 1-2 0V8H8v1a1 1 0 1 1-2 0V8Zm12-2H5a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1Z"/>
    </svg>
  `;

  function mrr_pad2(n){ return String(n).padStart(2, '0'); }
  function mrr_isISO(s){ return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  function mrr_dateUTC(y, mIndex, d){ return new Date(Date.UTC(y, mIndex, d, 0, 0, 0, 0)); }
  function mrr_todayUTC(){
    const now = new Date();
    return mrr_dateUTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }
  function mrr_isoFromUTC(dt){
    return `${dt.getUTCFullYear()}-${mrr_pad2(dt.getUTCMonth()+1)}-${mrr_pad2(dt.getUTCDate())}`;
  }
  function mrr_parseISO(iso){
    if (!mrr_isISO(iso)) return null;
    const [yy, mm, dd] = iso.split('-').map(Number);
    const dt = mrr_dateUTC(yy, mm-1, dd);
    if (dt.getUTCFullYear() !== yy || (dt.getUTCMonth()+1) !== mm || dt.getUTCDate() !== dd) return null;
    return dt;
  }
  function mrr_addDays(dtUTC, days){
    return mrr_dateUTC(dtUTC.getUTCFullYear(), dtUTC.getUTCMonth(), dtUTC.getUTCDate() + days);
  }
  function mrr_fmtBR(iso){
    if (!mrr_isISO(iso)) return '';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function mrr_parseBRorISO(value){
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (mrr_isISO(v)) return v;

    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]), mm = Number(m[2]), yy = Number(m[3]);
    if (!yy || mm<1 || mm>12 || dd<1 || dd>31) return null;
    const dt = mrr_dateUTC(yy, mm-1, dd);
    if (dt.getUTCFullYear() !== yy || (dt.getUTCMonth()+1) !== mm || dt.getUTCDate() !== dd) return null;
    return mrr_isoFromUTC(dt);
  }

  function mrr_el(tag, className, attrs){
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs){
      Object.entries(attrs).forEach(([k,v]) => {
        if (v === null || v === undefined) return;
        el.setAttribute(k, String(v));
      });
    }
    return el;
  }

  function mrr_parseYearBound(val){
    // aceita: "2030" | "+2" | "-5" | "current+2" | "current-10"
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    const cur = new Date().getFullYear();

    if (/^\d{4}$/.test(s)) return Number(s);
    if (/^[+-]\d+$/.test(s)) return cur + Number(s);
    const m = s.match(/^current([+-]\d+)$/i);
    if (m) return cur + Number(m[1]);

    return null;
  }

  function mrr_getAttrBool(el, name, fallback=false){
    const v = el.getAttribute(name);
    if (v === null) return fallback;
    return (v === '1' || v === 'true' || v === 'yes');
  }

  function mrr_readOptions(original){
    const d = original.dataset;

    const curYear = new Date().getFullYear();
    const defaults = {
      weekStartsOn: 0,
      closeOnSelect: true,
      allowManualInput: true,
      showOutsideDays: true,

      min: null,
      max: null,
      disablePast: false,
      disableFuture: false,
      disableWeekdays: [],
      disableMonths: [],
      disabledDates: new Set(),
      isDateDisabled: null,

      placeholder: d.placeholder || 'dd/mm/aaaa',

      // Default dinâmico (bem melhor que 1900-2100)
      yearMin: curYear - 10,
      yearMax: curYear + 2,

      // Range
      range: false,
      rangeSeparator: '|',              // storage
      rangeDisplaySeparator: ' – ',     // display
      rangeTitle: 'Ida e volta',
      rangeLabelStart: 'Ida',
      rangeLabelEnd: 'Volta',
      rangePlaceholderStart: 'Ida',
      rangePlaceholderEnd: 'Volta',
      rangeRequireEnd: true
    };

    // Range por atributo solicitado (não-data)
    const isRange = mrr_getAttrBool(original, 'date-ranger', false) || mrr_getAttrBool(original, 'data-date-ranger', false);
    if (isRange) defaults.range = true;

    // weekStartsOn
    if (d.weekStartsOn !== undefined){
      const w = Number(d.weekStartsOn);
      if (!Number.isNaN(w) && (w===0 || w===1)) defaults.weekStartsOn = w;
    }

    // min/max ISO
    if (d.min && mrr_isISO(d.min)) defaults.min = d.min;
    if (d.max && mrr_isISO(d.max)) defaults.max = d.max;

    // past/future
    if (d.disablePast === '1' || d.disablePast === 'true') defaults.disablePast = true;
    if (d.disableFuture === '1' || d.disableFuture === 'true') defaults.disableFuture = true;

    // weekdays
    if (d.disableWeekdays){
      defaults.disableWeekdays = d.disableWeekdays.split(',')
        .map(s => Number(s.trim()))
        .filter(n => Number.isInteger(n) && n>=0 && n<=6);
    }

    // months
    if (d.disableMonths){
      defaults.disableMonths = d.disableMonths.split(',')
        .map(s => Number(s.trim()))
        .filter(n => Number.isInteger(n) && n>=1 && n<=12);
    }

    // disabled dates
    if (d.disableDates){
      const set = new Set();
      d.disableDates.split(',').map(s => s.trim()).forEach(s => { if (mrr_isISO(s)) set.add(s); });
      defaults.disabledDates = set;
    }

    // toggles
    if (d.closeOnSelect !== undefined) defaults.closeOnSelect = !(d.closeOnSelect === '0' || d.closeOnSelect === 'false');
    if (d.showOutsideDays !== undefined) defaults.showOutsideDays = !(d.showOutsideDays === '0' || d.showOutsideDays === 'false');
    if (d.allowManualInput !== undefined) defaults.allowManualInput = !(d.allowManualInput === '0' || d.allowManualInput === 'false');

    // year bounds (fixo ou relativo)
    // aceita: data-year-min="2020" ou "+0" etc
    const yMin = mrr_parseYearBound(d.yearMin ?? original.getAttribute('year-min'));
    const yMax = mrr_parseYearBound(d.yearMax ?? original.getAttribute('year-max'));

    if (Number.isInteger(yMin)) defaults.yearMin = yMin;
    if (Number.isInteger(yMax)) defaults.yearMax = yMax;

    // também aceita offsets explícitos
    if (d.yearMinOffset){
      const off = Number(d.yearMinOffset);
      if (Number.isFinite(off)) defaults.yearMin = curYear + off;
    }
    if (d.yearMaxOffset){
      const off = Number(d.yearMaxOffset);
      if (Number.isFinite(off)) defaults.yearMax = curYear + off;
    }

    // garante ordem
    if (defaults.yearMax < defaults.yearMin) defaults.yearMax = defaults.yearMin;

    // Range settings
    if (defaults.range){
      if (d.rangeSeparator) defaults.rangeSeparator = String(d.rangeSeparator);
      if (d.rangeDisplaySeparator) defaults.rangeDisplaySeparator = String(d.rangeDisplaySeparator);

      if (d.rangeTitle) defaults.rangeTitle = String(d.rangeTitle);
      if (d.rangeLabelStart) defaults.rangeLabelStart = String(d.rangeLabelStart);
      if (d.rangeLabelEnd) defaults.rangeLabelEnd = String(d.rangeLabelEnd);
      if (d.rangePlaceholderStart) defaults.rangePlaceholderStart = String(d.rangePlaceholderStart);
      if (d.rangePlaceholderEnd) defaults.rangePlaceholderEnd = String(d.rangePlaceholderEnd);

      if (d.rangeRequireEnd !== undefined){
        defaults.rangeRequireEnd = !(d.rangeRequireEnd === '0' || d.rangeRequireEnd === 'false');
      }
    }

    return defaults;
  }

  function mrr_isDisabled(st, iso){
    const dt = mrr_parseISO(iso);
    if (!dt) return true;

    const o = st.opts;

    if (o.min && mrr_isISO(o.min) && iso < o.min) return true;
    if (o.max && mrr_isISO(o.max) && iso > o.max) return true;

    const todayIso = mrr_isoFromUTC(mrr_todayUTC());
    if (o.disablePast && iso < todayIso) return true;
    if (o.disableFuture && iso > todayIso) return true;

    const wd = dt.getUTCDay();
    const mo = dt.getUTCMonth() + 1;

    if (Array.isArray(o.disableWeekdays) && o.disableWeekdays.includes(wd)) return true;
    if (Array.isArray(o.disableMonths) && o.disableMonths.includes(mo)) return true;
    if (o.disabledDates instanceof Set && o.disabledDates.has(iso)) return true;

    if (typeof o.isDateDisabled === 'function'){
      try{
        if (o.isDateDisabled(iso, dt, st.original) === true) return true;
      }catch(_e){
        // contingência: ignora callback quebrado
      }
    }

    return false;
  }

  function mrr_closeAll(exceptWrapper){
    document.querySelectorAll('.mrr_dp[data-open="1"]').forEach(w => {
      if (exceptWrapper && w === exceptWrapper) return;
      w.dataset.open = '0';
      w.classList.remove('mrr_dp--flipY','mrr_dp--alignRight');
      const st = mrr_getStateFromWrapper(w);
      if (st) mrr_closeMenus(st);
    });
  }

  function mrr_getStateFromWrapper(wrapper){
    const original = wrapper.querySelector('input.mrr_dp__original');
    if (!original) return null;
    return mrr_STATE.get(original) || null;
  }

  function mrr_closeMenus(st){
    if (st.monthSelect) st.monthSelect.dataset.open = '0';
    if (st.yearSelect) st.yearSelect.dataset.open = '0';
  }

  function mrr_positionPopover(st){
    // remove flags
    st.wrapper.classList.remove('mrr_dp--flipY','mrr_dp--alignRight');

    const pop = st.popover;
    if (!pop) return;

    const rect = st.wrapper.getBoundingClientRect();

    // precisa estar visível
    const popRect = pop.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;

    const below = vh - rect.bottom;
    const above = rect.top;

    if (popRect.height > below && above > below){
      st.wrapper.classList.add('mrr_dp--flipY');
    }

    // horizontal
    const right = rect.left + popRect.width;
    if (right > vw - 8){
      st.wrapper.classList.add('mrr_dp--alignRight');
    }
  }

  function mrr_buildYearMenu(st, yearMenu){
    yearMenu.innerHTML = '';
    for (let y = st.opts.yearMin; y <= st.opts.yearMax; y++){
      const b = mrr_el('button', 'mrr_dp__menuBtn', { type:'button', 'data-year': String(y) });
      b.textContent = String(y);
      yearMenu.appendChild(b);
    }
  }

  function mrr_buildMonthMenu(monthMenu){
    monthMenu.innerHTML = '';
    mrr_MONTHS_PT_ABBR.forEach((label, idx) => {
      const b = mrr_el('button', 'mrr_dp__menuBtn', { type:'button', 'data-month': String(idx) });
      b.textContent = label;
      monthMenu.appendChild(b);
    });
  }

  function mrr_renderDow(st, dowEl){
    dowEl.innerHTML = '';
    const week = st.opts.weekStartsOn === 1
      ? [...mrr_DOW_PT.slice(1), mrr_DOW_PT[0]]
      : mrr_DOW_PT.slice();

    week.forEach(w => {
      const d = mrr_el('div');
      d.textContent = w;
      dowEl.appendChild(d);
    });
  }

  function mrr_renderMonthGrid(st, baseYear, baseMonthIndex, gridEl, selectedIso, rangeStart, rangeEnd, markEndOutline){
    gridEl.innerHTML = '';

    const first = mrr_dateUTC(baseYear, baseMonthIndex, 1);
    const dow = first.getUTCDay();
    const offset = (dow - st.opts.weekStartsOn + 7) % 7;
    const start = mrr_addDays(first, -offset);

    for (let i=0; i<42; i++){
      const dt = mrr_addDays(start, i);
      const iso = mrr_isoFromUTC(dt);
      const isOutside = dt.getUTCMonth() !== baseMonthIndex;

      if (isOutside && !st.opts.showOutsideDays){
        gridEl.appendChild(mrr_el('div'));
        continue;
      }

      const btn = mrr_el('button', 'mrr_dp__day', {
        type:'button',
        'data-iso': iso,
        'data-outside': isOutside ? '1':'0'
      });
      btn.textContent = String(dt.getUTCDate());

      const isToday = iso === mrr_isoFromUTC(mrr_todayUTC());
      if (isToday) btn.dataset.today = '1';

      if (mrr_isDisabled(st, iso)) btn.disabled = true;

      // selected (single)
      if (selectedIso && iso === selectedIso) btn.dataset.selected = '1';

      // range paint
      if (rangeStart && rangeEnd && iso >= rangeStart && iso <= rangeEnd){
        btn.dataset.inrange = '1';
      }

      // range start/end
      if (rangeStart && iso === rangeStart){
        btn.dataset.selected = '1';
      }
      if (rangeEnd && iso === rangeEnd){
        if (markEndOutline){
          btn.dataset.rangeEnd = '1';
        }else{
          btn.dataset.selected = '1';
        }
      }

      gridEl.appendChild(btn);
    }
  }

  function mrr_parseRangeValue(st, raw){
    // aceita valores já salvos no input original:
    // "YYYY-MM-DD|YYYY-MM-DD" (ou separador custom)
    // "YYYY-MM-DD,YYYY-MM-DD"
    // "YYYY-MM-DD - YYYY-MM-DD"
    if (typeof raw !== 'string' || !raw.trim()) return { start:null, end:null };

    const sep = st.opts.rangeSeparator || '|';
    const v = raw.trim();

    let parts = null;

    if (v.includes(sep)){
      parts = v.split(sep).map(s => s.trim());
    }else if (v.includes(',')){
      parts = v.split(',').map(s => s.trim());
    }else if (v.includes(' - ')){
      parts = v.split(' - ').map(s => s.trim());
    }else if (v.includes('–')){
      parts = v.split('–').map(s => s.trim());
    }

    if (!parts){
      const iso = mrr_parseBRorISO(v);
      return { start: iso, end: null };
    }

    const a = mrr_parseBRorISO(parts[0] || '');
    const b = mrr_parseBRorISO(parts[1] || '');
    return { start: a, end: b };
  }

  function mrr_buildRangeValue(st, startIso, endIso){
    const sep = st.opts.rangeSeparator || '|';
    if (startIso && endIso) return `${startIso}${sep}${endIso}`;
    if (startIso && !endIso) return `${startIso}`;
    return '';
  }

  function mrr_buildRangeDisplay(st, startIso, endIso){
    const sep = st.opts.rangeDisplaySeparator || ' – ';
    if (startIso && endIso) return `${mrr_fmtBR(startIso)}${sep}${mrr_fmtBR(endIso)}`;
    if (startIso && !endIso) return `${mrr_fmtBR(startIso)}`;
    return '';
  }

  function mrr_syncDisplayFromOriginal(st){
    if (!st.opts.range){
      const iso = mrr_isISO(st.original.value) ? st.original.value : null;
      st.display.value = iso ? mrr_fmtBR(iso) : '';
      return;
    }
    const { start, end } = mrr_parseRangeValue(st, st.original.value);
    st.rangeStart = start;
    st.rangeEnd = end;
    st.display.value = mrr_buildRangeDisplay(st, start, end);

    if (st.rangeFieldStartValue) st.rangeFieldStartValue.textContent = start ? mrr_fmtBR(start) : st.opts.rangePlaceholderStart;
    if (st.rangeFieldEndValue) st.rangeFieldEndValue.textContent = end ? mrr_fmtBR(end) : st.opts.rangePlaceholderEnd;

    if (st.btnDone) st.btnDone.disabled = st.opts.rangeRequireEnd ? !(start && end) : !start;
  }

  function mrr_setSingleISO(st, isoOrNull){
    if (!isoOrNull){
      st.original.value = '';
      mrr_syncDisplayFromOriginal(st);
      st.wrapper.classList.remove('mrr_dp--invalid');
      st.original.dispatchEvent(new Event('change', { bubbles:true }));
      return;
    }

    if (!mrr_isISO(isoOrNull)) return;
    if (mrr_isDisabled(st, isoOrNull)) return;

    st.original.value = isoOrNull;
    mrr_syncDisplayFromOriginal(st);
    st.wrapper.classList.remove('mrr_dp--invalid');
    st.original.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function mrr_clearRange(st){
    st.original.value = '';
    st.rangeStart = null;
    st.rangeEnd = null;
    mrr_syncDisplayFromOriginal(st);
    mrr_render(st);
  }

  function mrr_setRangeISO(st, startIso, endIso){
    const v = mrr_buildRangeValue(st, startIso, endIso);
    st.original.value = v;
    st.rangeStart = startIso || null;
    st.rangeEnd = endIso || null;
    mrr_syncDisplayFromOriginal(st);
    st.wrapper.classList.remove('mrr_dp--invalid');
    st.original.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function mrr_buildPopoverSingle(st){
    const pop = mrr_el('div', 'mrr_dp__popover', { role:'dialog', 'aria-label':'Calendário' });

    const top = mrr_el('div', 'mrr_dp__top');
    const prev = mrr_el('button','mrr_dp__nav',{type:'button','aria-label':'Mês anterior'});
    prev.innerHTML = '<span>‹</span>';
    const next = mrr_el('button','mrr_dp__nav',{type:'button','aria-label':'Próximo mês'});
    next.innerHTML = '<span>›</span>';

    const selects = mrr_el('div','mrr_dp__selects');

    const monthSel = mrr_el('div','mrr_dp__select',{'data-open':'0'});
    const monthBtn = mrr_el('button','mrr_dp__selectBtn',{type:'button','aria-label':'Selecionar mês'});
    monthBtn.innerHTML = `<span data-part="monthLabel"></span><span class="mrr_dp__chev">▾</span>`;
    const monthMenu = mrr_el('div','mrr_dp__menu',{'data-part':'monthMenu'});
    mrr_buildMonthMenu(monthMenu);
    monthSel.appendChild(monthBtn);
    monthSel.appendChild(monthMenu);

    const yearSel = mrr_el('div','mrr_dp__select',{'data-open':'0'});
    const yearBtn = mrr_el('button','mrr_dp__selectBtn',{type:'button','aria-label':'Selecionar ano'});
    yearBtn.innerHTML = `<span data-part="yearLabel"></span><span class="mrr_dp__chev">▾</span>`;
    const yearMenu = mrr_el('div','mrr_dp__menu',{'data-part':'yearMenu'});
    mrr_buildYearMenu(st, yearMenu);
    yearSel.appendChild(yearBtn);
    yearSel.appendChild(yearMenu);

    selects.appendChild(monthSel);
    selects.appendChild(yearSel);

    top.appendChild(prev);
    top.appendChild(selects);
    top.appendChild(next);

    const dow = mrr_el('div','mrr_dp__dow',{'aria-hidden':'true'});
    mrr_renderDow(st, dow);

    const grid = mrr_el('div','mrr_dp__grid',{'data-part':'grid'});

    pop.appendChild(top);
    pop.appendChild(dow);
    pop.appendChild(grid);

    st.popover = pop;
    st.btnPrev = prev;
    st.btnNext = next;
    st.monthSelect = monthSel;
    st.monthBtn = monthBtn;
    st.monthLabel = monthBtn.querySelector('[data-part="monthLabel"]');
    st.monthMenu = monthMenu;
    st.yearSelect = yearSel;
    st.yearBtn = yearBtn;
    st.yearLabel = yearBtn.querySelector('[data-part="yearLabel"]');
    st.yearMenu = yearMenu;
    st.gridSingle = grid;

    return pop;
  }

  function mrr_buildPopoverRange(st){
    const pop = mrr_el('div','mrr_dp__popover',{ role:'dialog', 'aria-label':'Calendário (intervalo)' });

    // header: title + reset
    const hdr = mrr_el('div','mrr_dp__rangeHeader');
    const title = mrr_el('div','mrr_dp__rangeTitle');
    title.textContent = st.opts.rangeTitle || 'Ida e volta';
    const reset = mrr_el('button','mrr_dp__link',{ type:'button' });
    reset.textContent = 'Redefinir';
    hdr.appendChild(title);
    hdr.appendChild(reset);

    // fake fields start/end
    const fields = mrr_el('div','mrr_dp__rangeFields');

    const f1 = mrr_el('div','mrr_dp__field');
    const f1l = mrr_el('span','mrr_dp__fieldLabel');
    f1l.textContent = st.opts.rangeLabelStart || 'Ida';
    const f1v = mrr_el('div','mrr_dp__fieldValue');
    f1v.textContent = st.opts.rangePlaceholderStart || 'Ida';
    f1.appendChild(f1l);
    f1.appendChild(f1v);

    const f2 = mrr_el('div','mrr_dp__field');
    const f2l = mrr_el('span','mrr_dp__fieldLabel');
    f2l.textContent = st.opts.rangeLabelEnd || 'Volta';
    const f2v = mrr_el('div','mrr_dp__fieldValue');
    f2v.textContent = st.opts.rangePlaceholderEnd || 'Volta';
    f2.appendChild(f2l);
    f2.appendChild(f2v);

    fields.appendChild(f1);
    fields.appendChild(f2);

    // top nav + year dropdown (mantém identidade visual)
    const top = mrr_el('div','mrr_dp__top');

    const prev = mrr_el('button','mrr_dp__nav',{type:'button','aria-label':'Mês anterior'});
    prev.innerHTML = '<span>‹</span>';
    const next = mrr_el('button','mrr_dp__nav',{type:'button','aria-label':'Próximo mês'});
    next.innerHTML = '<span>›</span>';

    const selects = mrr_el('div','mrr_dp__selects');

    // mês: mantém dropdown (controla o mês da primeira coluna)
    const monthSel = mrr_el('div','mrr_dp__select',{'data-open':'0'});
    const monthBtn = mrr_el('button','mrr_dp__selectBtn',{type:'button','aria-label':'Selecionar mês (ida)'});
    monthBtn.innerHTML = `<span data-part="monthLabel"></span><span class="mrr_dp__chev">▾</span>`;
    const monthMenu = mrr_el('div','mrr_dp__menu',{'data-part':'monthMenu'});
    mrr_buildMonthMenu(monthMenu);
    monthSel.appendChild(monthBtn);
    monthSel.appendChild(monthMenu);

    // ano
    const yearSel = mrr_el('div','mrr_dp__select',{'data-open':'0'});
    const yearBtn = mrr_el('button','mrr_dp__selectBtn',{type:'button','aria-label':'Selecionar ano'});
    yearBtn.innerHTML = `<span data-part="yearLabel"></span><span class="mrr_dp__chev">▾</span>`;
    const yearMenu = mrr_el('div','mrr_dp__menu',{'data-part':'yearMenu'});
    mrr_buildYearMenu(st, yearMenu);
    yearSel.appendChild(yearBtn);
    yearSel.appendChild(yearMenu);

    selects.appendChild(monthSel);
    selects.appendChild(yearSel);

    top.appendChild(prev);
    top.appendChild(selects);
    top.appendChild(next);

    // months container (2 colunas)
    const months = mrr_el('div','mrr_dp__months');

    const m1 = mrr_el('div','mrr_dp__month');
    const m1h = mrr_el('div','mrr_dp__monthHead');
    const m1name = mrr_el('div','mrr_dp__monthName');
    m1h.appendChild(m1name);
    m1.appendChild(m1h);

    const dow1 = mrr_el('div','mrr_dp__dow',{'aria-hidden':'true'});
    mrr_renderDow(st, dow1);
    const grid1 = mrr_el('div','mrr_dp__grid',{'data-part':'gridStart'});
    m1.appendChild(dow1);
    m1.appendChild(grid1);

    const m2 = mrr_el('div','mrr_dp__month');
    const m2h = mrr_el('div','mrr_dp__monthHead');
    const m2name = mrr_el('div','mrr_dp__monthName');
    m2h.appendChild(m2name);
    m2.appendChild(m2h);

    const dow2 = mrr_el('div','mrr_dp__dow',{'aria-hidden':'true'});
    mrr_renderDow(st, dow2);
    const grid2 = mrr_el('div','mrr_dp__grid',{'data-part':'gridEnd'});
    m2.appendChild(dow2);
    m2.appendChild(grid2);

    months.appendChild(m1);
    months.appendChild(m2);

    // footer
    const footer = mrr_el('div','mrr_dp__footer');
    const cancel = mrr_el('button','mrr_dp__ghost',{type:'button'});
    cancel.textContent = 'Cancelar';
    const done = mrr_el('button','mrr_dp__primary',{type:'button'});
    done.textContent = 'Concluído';
    done.disabled = true;

    footer.appendChild(cancel);
    footer.appendChild(done);

    pop.appendChild(hdr);
    pop.appendChild(fields);
    pop.appendChild(top);
    pop.appendChild(months);
    pop.appendChild(footer);

    st.popover = pop;

    st.rangeReset = reset;
    st.rangeFieldStartValue = f1v;
    st.rangeFieldEndValue = f2v;

    st.btnPrev = prev;
    st.btnNext = next;

    st.monthSelect = monthSel;
    st.monthBtn = monthBtn;
    st.monthLabel = monthBtn.querySelector('[data-part="monthLabel"]');
    st.monthMenu = monthMenu;

    st.yearSelect = yearSel;
    st.yearBtn = yearBtn;
    st.yearLabel = yearBtn.querySelector('[data-part="yearLabel"]');
    st.yearMenu = yearMenu;

    st.monthName1 = m1name;
    st.monthName2 = m2name;
    st.gridRange1 = grid1;
    st.gridRange2 = grid2;

    st.btnCancel = cancel;
    st.btnDone = done;

    return pop;
  }

  function mrr_render(st){
    const view = st.viewUTC || mrr_todayUTC();
    const y = view.getUTCFullYear();
    const m = view.getUTCMonth();

    // labels selects
    if (st.monthLabel) st.monthLabel.textContent = mrr_MONTHS_PT_ABBR[m] || '';
    if (st.yearLabel) st.yearLabel.textContent = String(y);

    // marca current nos menus
    if (st.monthMenu){
      st.monthMenu.querySelectorAll('[data-month]').forEach(btn => {
        btn.setAttribute('aria-current', String(Number(btn.dataset.month) === m));
      });
    }
    if (st.yearMenu){
      st.yearMenu.querySelectorAll('[data-year]').forEach(btn => {
        btn.setAttribute('aria-current', String(Number(btn.dataset.year) === y));
      });
    }

    if (!st.opts.range){
      const selected = mrr_isISO(st.original.value) ? st.original.value : null;
      mrr_renderMonthGrid(st, y, m, st.gridSingle, selected, null, null, false);
      return;
    }

    // range: 2 meses (m e m+1)
    const nextMonth = mrr_dateUTC(y, m+1, 1);
    const y2 = nextMonth.getUTCFullYear();
    const m2 = nextMonth.getUTCMonth();

    if (st.monthName1) st.monthName1.textContent = `${mrr_MONTHS_PT_FULL[m]} ${y}`;
    if (st.monthName2) st.monthName2.textContent = `${mrr_MONTHS_PT_FULL[m2]} ${y2}`;

    const start = st.rangeStart || null;
    const end = st.rangeEnd || null;

    mrr_renderMonthGrid(st, y, m, st.gridRange1, null, start, end, true);
    mrr_renderMonthGrid(st, y2, m2, st.gridRange2, null, start, end, true);

    if (st.btnDone){
      st.btnDone.disabled = st.opts.rangeRequireEnd ? !(start && end) : !start;
    }
  }

  function mrr_open(st){
    mrr_closeAll(st.wrapper);
    st.wrapper.dataset.open = '1';

    // sync display/range state from original
    mrr_syncDisplayFromOriginal(st);

    // define view base
    if (!st.opts.range){
      const iso = mrr_isISO(st.original.value) ? st.original.value : null;
      const base = iso ? (mrr_parseISO(iso) || mrr_todayUTC()) : mrr_todayUTC();
      st.viewUTC = mrr_dateUTC(base.getUTCFullYear(), base.getUTCMonth(), 1);
    }else{
      const baseIso = st.rangeStart || st.rangeEnd;
      const base = baseIso ? (mrr_parseISO(baseIso) || mrr_todayUTC()) : mrr_todayUTC();
      st.viewUTC = mrr_dateUTC(base.getUTCFullYear(), base.getUTCMonth(), 1);
      st.wrapper.classList.add('mrr_dp--range');
    }

    mrr_closeMenus(st);
    mrr_render(st);

    // posiciona (flip/align) após render
    requestAnimationFrame(() => mrr_positionPopover(st));
  }

  function mrr_close(st){
    st.wrapper.dataset.open = '0';
    st.wrapper.classList.remove('mrr_dp--flipY','mrr_dp--alignRight');
    mrr_closeMenus(st);
  }

  function mrr_toggle(st){
    if (st.wrapper.dataset.open === '1') mrr_close(st);
    else mrr_open(st);
  }

  function mrr_onDayClickSingle(st, iso){
    if (!mrr_isISO(iso)) return;
    if (mrr_isDisabled(st, iso)) return;

    mrr_setSingleISO(st, iso);
    if (st.opts.closeOnSelect) mrr_close(st);
    else mrr_render(st);
  }

  function mrr_onDayClickRange(st, iso){
    if (!mrr_isISO(iso)) return;
    if (mrr_isDisabled(st, iso)) return;

    let start = st.rangeStart || null;
    let end = st.rangeEnd || null;

    // regra: se não tem start, seta start.
    // se tem start e não tem end, seta end (ou reorganiza).
    // se já tem os dois, reinicia start.
    if (!start || (start && end)){
      start = iso;
      end = null;
    }else if (start && !end){
      if (iso < start){
        // se clicou antes do start, vira novo start
        end = start;
        start = iso;
      }else{
        end = iso;
      }
    }

    mrr_setRangeISO(st, start, end);
    mrr_render(st);

    // close em range somente quando completar fim (se closeOnSelect)
    if (st.opts.closeOnSelect && start && (end || !st.opts.rangeRequireEnd)){
      if (!st.opts.rangeRequireEnd) {
        // permite fechar só com ida
        mrr_close(st);
      } else if (end) {
        mrr_close(st);
      }
    }
  }

  function mrr_handleManualInput(st){
    if (!st.opts.allowManualInput) return;

    const raw = st.display.value;

    if (!st.opts.range){
      const iso = mrr_parseBRorISO(raw);
      if (!iso){
        st.wrapper.classList.add('mrr_dp--invalid');
        st.display.setAttribute('title', 'Data inválida. Use dd/mm/aaaa.');
        return;
      }
      if (mrr_isDisabled(st, iso)){
        st.wrapper.classList.add('mrr_dp--invalid');
        st.display.setAttribute('title', 'Essa data está desabilitada pelas regras.');
        return;
      }
      st.display.removeAttribute('title');
      mrr_setSingleISO(st, iso);
      mrr_render(st);
      return;
    }

    // range manual (opcional): "dd/mm/aaaa – dd/mm/aaaa" ou "YYYY-MM-DD|YYYY-MM-DD"
    const { start, end } = mrr_parseRangeValue(st, raw);
    if (!start){
      st.wrapper.classList.add('mrr_dp--invalid');
      st.display.setAttribute('title', 'Intervalo inválido. Ex: 10/01/2026 – 16/01/2026.');
      return;
    }
    if (start && mrr_isDisabled(st, start)){
      st.wrapper.classList.add('mrr_dp--invalid');
      st.display.setAttribute('title', 'A data inicial está desabilitada.');
      return;
    }
    if (end && mrr_isDisabled(st, end)){
      st.wrapper.classList.add('mrr_dp--invalid');
      st.display.setAttribute('title', 'A data final está desabilitada.');
      return;
    }
    if (end && end < start){
      st.wrapper.classList.add('mrr_dp--invalid');
      st.display.setAttribute('title', 'A data final não pode ser menor que a inicial.');
      return;
    }

    st.display.removeAttribute('title');
    mrr_setRangeISO(st, start, end);
    mrr_render(st);
  }

  function mrr_bind(st){
    st.btn.addEventListener('click', (e) => {
      e.preventDefault();
      mrr_toggle(st);
    });

    st.display.addEventListener('focus', () => mrr_open(st));

    st.display.addEventListener('keydown', (e) => {
      if (!st.opts.allowManualInput) return;

      if (e.key === 'Enter'){
        e.preventDefault();
        mrr_handleManualInput(st);
        mrr_close(st);
      }
      if (e.key === 'Escape'){
        e.preventDefault();
        mrr_close(st);
        st.display.blur();
      }
    });

    st.display.addEventListener('blur', () => {
      if (!st.opts.allowManualInput) return;
      window.setTimeout(() => {
        if (st.wrapper.contains(document.activeElement)) return;
        mrr_handleManualInput(st);
      }, 0);
    });

    // nav month
    st.btnPrev.addEventListener('click', () => {
      const v = st.viewUTC;
      st.viewUTC = mrr_dateUTC(v.getUTCFullYear(), v.getUTCMonth()-1, 1);
      mrr_render(st);
      requestAnimationFrame(() => mrr_positionPopover(st));
    });

    st.btnNext.addEventListener('click', () => {
      const v = st.viewUTC;
      st.viewUTC = mrr_dateUTC(v.getUTCFullYear(), v.getUTCMonth()+1, 1);
      mrr_render(st);
      requestAnimationFrame(() => mrr_positionPopover(st));
    });

    // dropdowns
    st.monthBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const open = st.monthSelect.dataset.open === '1';
      mrr_closeMenus(st);
      st.monthSelect.dataset.open = open ? '0':'1';
    });

    st.yearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const open = st.yearSelect.dataset.open === '1';
      mrr_closeMenus(st);
      st.yearSelect.dataset.open = open ? '0':'1';
      if (st.yearSelect.dataset.open === '1'){
        const y = st.viewUTC.getUTCFullYear();
        const cur = st.yearMenu.querySelector(`[data-year="${y}"]`);
        if (cur) cur.scrollIntoView({ block:'center' });
      }
    });

    st.monthMenu.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest('[data-month]');
      if (!btn) return;
      const m = Number(btn.dataset.month);
      if (!Number.isInteger(m)) return;
      const y = st.viewUTC.getUTCFullYear();
      st.monthSelect.dataset.open = '0';
      st.viewUTC = mrr_dateUTC(y, m, 1);
      mrr_render(st);
      requestAnimationFrame(() => mrr_positionPopover(st));
    });

    st.yearMenu.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest('[data-year]');
      if (!btn) return;
      const y = Number(btn.dataset.year);
      if (!Number.isInteger(y)) return;
      const m = st.viewUTC.getUTCMonth();
      st.yearSelect.dataset.open = '0';
      st.viewUTC = mrr_dateUTC(y, m, 1);
      mrr_render(st);
      requestAnimationFrame(() => mrr_positionPopover(st));
    });

    // clicks em dias
    const onGridClick = (e) => {
      const btn = e.target && e.target.closest('.mrr_dp__day[data-iso]');
      if (!btn || btn.disabled) return;

      if (!st.opts.range) mrr_onDayClickSingle(st, btn.dataset.iso);
      else mrr_onDayClickRange(st, btn.dataset.iso);
    };

    if (st.gridSingle) st.gridSingle.addEventListener('click', onGridClick);
    if (st.gridRange1) st.gridRange1.addEventListener('click', onGridClick);
    if (st.gridRange2) st.gridRange2.addEventListener('click', onGridClick);

    // Range buttons
    if (st.opts.range){
      st.rangeReset.addEventListener('click', (e) => {
        e.preventDefault();
        mrr_clearRange(st);
        requestAnimationFrame(() => mrr_positionPopover(st));
      });

      st.btnCancel.addEventListener('click', (e) => {
        e.preventDefault();
        mrr_close(st);
      });

      st.btnDone.addEventListener('click', (e) => {
        e.preventDefault();
        // exige end?
        if (st.opts.rangeRequireEnd && !(st.rangeStart && st.rangeEnd)) return;
        if (!st.opts.rangeRequireEnd && !st.rangeStart) return;
        mrr_close(st);
      });
    }
  }

  function mrr_enhance(original){
    if (!(original instanceof HTMLInputElement)) return;
    if (!original.classList.contains('mrr-date-picker')) return;
    if (original.dataset.mrrDpEnhanced === '1') return;

    const opts = mrr_readOptions(original);

    const wrapper = mrr_el('div','mrr_dp',{ 'data-open':'0' });
    if (opts.range) wrapper.classList.add('mrr_dp--range');

    // display input (visível)
    const display = mrr_el('input','mrr_dp__display',{
      type:'text',
      inputmode:'numeric',
      autocomplete:'off',
      placeholder: opts.range ? '' : (original.getAttribute('placeholder') || opts.placeholder),
      'aria-label': original.getAttribute('aria-label') || original.name || 'Selecionar data'
    });

    const btn = mrr_el('button','mrr_dp__btn',{ type:'button', 'aria-label':'Abrir calendário' });
    btn.innerHTML = mrr_ICON_CAL;

    // IMPORTANT: move o id para o display (pra label for="" funcionar)
    const originalId = original.id;
    if (originalId){
      display.id = originalId;
      original.removeAttribute('id');
    }

    // transforma original em hidden (submit sempre pelo original)
    original.classList.add('mrr_dp__original');
    original.dataset.mrrDpEnhanced = '1';

    try { original.type = 'hidden'; } catch(_e){
      // contingência (casos raros): se browser bloquear, mantém, mas oculto pelo CSS
    }

    // injeta
    const parent = original.parentNode;
    parent.insertBefore(wrapper, original);
    wrapper.appendChild(display);
    wrapper.appendChild(btn);
    wrapper.appendChild(original);

    const st = {
      original,
      wrapper,
      display,
      btn,
      opts,
      popover: null,
      viewUTC: null,

      // range state
      rangeStart: null,
      rangeEnd: null
    };

    // monta popover
    const pop = opts.range ? mrr_buildPopoverRange(st) : mrr_buildPopoverSingle(st);
    wrapper.appendChild(pop);

    mrr_STATE.set(original, st);

    // sync initial values
    mrr_syncDisplayFromOriginal(st);

    // define view inicial
    if (!opts.range){
      const iso = mrr_isISO(original.value) ? original.value : null;
      const base = iso ? (mrr_parseISO(iso) || mrr_todayUTC()) : mrr_todayUTC();
      st.viewUTC = mrr_dateUTC(base.getUTCFullYear(), base.getUTCMonth(), 1);
    }else{
      const { start, end } = mrr_parseRangeValue(st, original.value);
      st.rangeStart = start;
      st.rangeEnd = end;
      const baseIso = start || end;
      const base = baseIso ? (mrr_parseISO(baseIso) || mrr_todayUTC()) : mrr_todayUTC();
      st.viewUTC = mrr_dateUTC(base.getUTCFullYear(), base.getUTCMonth(), 1);
    }

    mrr_render(st);
    mrr_bind(st);

    return st;
  }

  function mrr_init(root=document){
    const scope = (root instanceof Element || root instanceof Document) ? root : document;
    const inputs = scope.querySelectorAll('input.mrr-date-picker:not([data-mrr-dp-enhanced="1"])');
    inputs.forEach(inp => mrr_enhance(inp));
  }

  // fecha clicando fora
  document.addEventListener('mousedown', (e) => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    const w = t.closest && t.closest('.mrr_dp');
    if (w) return;
    mrr_closeAll(null);
  }, { capture:true });

  // reposiciona quando scroll/resize (para flip/align ficar consistente)
  const mrr_repositionOpen = () => {
    document.querySelectorAll('.mrr_dp[data-open="1"]').forEach(w => {
      const st = mrr_getStateFromWrapper(w);
      if (st) mrr_positionPopover(st);
    });
  };
  window.addEventListener('resize', () => mrr_repositionOpen(), { passive:true });
  document.addEventListener('scroll', () => mrr_repositionOpen(), { capture:true, passive:true });

  // API pública (para casos especiais)
  window.MRRDatePicker = {
    init: mrr_init,
    enhance: mrr_enhance,
    open(original){ const st=mrr_STATE.get(original); if(st) mrr_open(st); },
    close(original){ const st=mrr_STATE.get(original); if(st) mrr_close(st); },
    getValue(original){ return original && typeof original.value==='string' ? original.value : ''; },
    setValue(original, v){
      const st = mrr_STATE.get(original);
      if (!st) return;
      st.original.value = String(v ?? '');
      mrr_syncDisplayFromOriginal(st);
      mrr_render(st);
    }
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => mrr_init(document));
  }else{
    mrr_init(document);
  }
})();
