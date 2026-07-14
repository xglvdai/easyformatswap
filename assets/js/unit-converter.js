// Unit Converter — length, weight, temperature, currency (static demo rates).
// All math runs locally; no network calls for conversion.
(function () {
  'use strict';

  const cats = {
    length: {
      units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
      label: 'Meter-based',
    },
    weight: {
      units: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.45359237, oz: 0.028349523125 },
      label: 'Kilogram-based',
    },
    temp: { units: { C: 'C', F: 'F', K: 'K' }, label: 'Special formula', special: true },
    currency: {
      units: { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 157, CAD: 1.36, AUD: 1.52, CNY: 7.24 },
      label: 'Demo rates (1 USD =)',
    },
  };

  let cat = 'length';
  const catTabs = document.getElementById('catTabs');
  const fromVal = document.getElementById('fromVal');
  const toVal = document.getElementById('toVal');
  const fromUnit = document.getElementById('fromUnit');
  const toUnit = document.getElementById('toUnit');
  const swap = document.getElementById('swap');
  const rateNote = document.getElementById('rateNote');

  function fillUnits() {
    const u = cats[cat].units;
    const keys = Object.keys(u);
    [fromUnit, toUnit].forEach((sel) => {
      sel.innerHTML = keys.map((k) => '<option value="' + k + '">' + k + '</option>').join('');
    });
    if (cat === 'temp') {
      fromUnit.value = 'C'; toUnit.value = 'F';
    } else {
      fromUnit.value = keys[0]; toUnit.value = keys[1] || keys[0];
    }
    updateNote();
  }

  function toBase(v, unit) {
    if (cats[cat].special) return v;
    return v * cats[cat].units[unit];
  }
  function fromBase(b, unit) {
    if (cats[cat].special) return b;
    return b / cats[cat].units[unit];
  }
  function convTemp(v, from, to) {
    let c = from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
    return to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
  }

  function convert(dir) {
    const fv = parseFloat(fromVal.value);
    const tv = parseFloat(toVal.value);
    if (cat === 'temp') {
      if (dir === 'f') toVal.value = round(convTemp(fv, fromUnit.value, toUnit.value));
      else fromVal.value = round(convTemp(tv, toUnit.value, fromUnit.value));
      return;
    }
    if (dir === 'f') {
      const base = toBase(fv, fromUnit.value);
      toVal.value = round(fromBase(base, toUnit.value));
    } else {
      const base = toBase(tv, toUnit.value);
      fromVal.value = round(fromBase(base, fromUnit.value));
    }
  }

  function round(n) { return Math.round(n * 1e6) / 1e6; }

  function updateNote() {
    rateNote.textContent = cat === 'currency'
      ? 'Demo rates, 1 ' + Object.keys(cats.currency.units)[0] + ' = ' +
        Object.entries(cats.currency.units).slice(1).map(([k, v]) => v + ' ' + k).join(', ')
      : cats[cat].label + '.';
  }

  catTabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab'); if (!t) return;
    cat = t.dataset.cat;
    [...catTabs.children].forEach((c) => c.classList.toggle('active', c === t));
    fillUnits(); fromVal.value = 1; convert('f');
  });
  fromVal.addEventListener('input', () => convert('f'));
  toVal.addEventListener('input', () => convert('t'));
  fromUnit.addEventListener('change', () => convert('f'));
  toUnit.addEventListener('change', () => convert('f'));
  swap.addEventListener('click', () => {
    const a = fromUnit.value; fromUnit.value = toUnit.value; toUnit.value = a; convert('f');
  });

  fillUnits();
  convert('f');
})();
