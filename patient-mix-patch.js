(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('wt') || $('patientSelect')) return;
  const STORE = 'se-calculator-patient-profiles-v1';
  const getStore = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); }
    catch { return {}; }
  };
  const setStore = (data) => localStorage.setItem(STORE, JSON.stringify(data));
  let store = getStore();
  let profiles = Array.isArray(store.profiles) ? store.profiles : [];
  let active = store.activePatientId || '';
  const aside = document.querySelector('#sedation aside.panel');
  const firstRow = $('wt').closest('.row');
  firstRow.insertAdjacentHTML('beforebegin', `<div class="field"><label>Saved patient profile</label><select id="patientSelect"></select></div><div class="profile-actions"><div class="field"><label>Patient ID / initials</label><input id="patientName" type="text" placeholder="예: KGD, ER-01, 병록번호 등"></div><button id="savePatient" class="button" type="button">Save patient</button><button id="deletePatient" class="button secondary" type="button">Delete</button></div>`);
  const drugRow = $('mixMg').closest('.row3');
  drugRow.outerHTML = `<div class="row3"><div class="field"><label>1x drug amount, mg</label><input id="baseMixMg" type="number" value="${$('mixMg').value || 600}" min="1"></div><div class="field"><label>Mix multiplier</label><select id="mixMultiplier"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option><option value="4">4x</option><option value="5">5x</option><option value="6">6x</option><option value="8">8x</option><option value="10">10x</option></select></div><div class="field"><label>Total drug amount, mg</label><input id="mixMg" type="number" value="600" min="1" readonly></div></div><div class="row3"><div class="field"><label>Fluid volume preset</label><select id="fluidPreset"><option value="50">50 mL</option><option value="100">100 mL</option><option value="250">250 mL</option><option value="500" selected>500 mL</option><option value="1000">1000 mL</option><option value="custom">Custom</option></select></div><div class="field"><label>Final mixed fluid volume, mL</label><input id="mixMl" type="number" value="500" min="1"></div><div class="field"><label>Rate dose</label><input id="rateDose" type="number" value="0.2" min="0" step="0.05"></div></div>`;
  const saveStore = () => setStore({ profiles, activePatientId: active });
  const render = () => {
    $('patientSelect').innerHTML = '<option value="">New / unsaved patient</option>' + profiles.slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).map(p => `<option value="${p.id}">${p.name} · ${p.wt || '-'} kg · ${p.ht || '-'} cm</option>`).join('');
    $('patientSelect').value = profiles.some(p => p.id === active) ? active : '';
    $('deletePatient').disabled = !$('patientSelect').value;
  };
  const apply = (id) => {
    const p = profiles.find(x => x.id === id);
    active = p ? p.id : '';
    if (!p) { $('patientName').value = ''; render(); return; }
    $('patientName').value = p.name || '';
    $('wt').value = p.wt || '';
    $('ht').value = p.ht || '';
    $('sex').value = p.sex || 'male';
    $('dosingWeight').value = p.dosingWeight || 'actual';
    if ($('asmWeight')) $('asmWeight').value = p.asmWeight || p.dosingWeight || 'actual';
    saveStore(); render(); window.calcSed?.(); window.calcAsm?.();
  };
  $('patientSelect').addEventListener('change', () => apply($('patientSelect').value));
  $('savePatient').addEventListener('click', () => {
    const p = { id: active || `p_${Date.now()}`, name: $('patientName').value.trim() || `Patient ${profiles.length + 1}`, wt: +$('wt').value || 0, ht: +$('ht').value || 0, sex: $('sex').value, dosingWeight: $('dosingWeight').value, asmWeight: $('asmWeight')?.value || $('dosingWeight').value, updatedAt: new Date().toISOString() };
    const idx = profiles.findIndex(x => x.id === p.id);
    if (idx >= 0) profiles[idx] = p; else profiles.push(p);
    active = p.id; saveStore(); render(); apply(p.id);
  });
  $('deletePatient').addEventListener('click', () => { const id = $('patientSelect').value; profiles = profiles.filter(p => p.id !== id); active = ''; $('patientName').value = ''; saveStore(); render(); });
  const updateMix = () => {
    if ($('fluidPreset').value !== 'custom') $('mixMl').value = $('fluidPreset').value;
    $('mixMg').value = ((+$('baseMixMg').value || 0) * (+$('mixMultiplier').value || 1)).toFixed(1).replace(/\.0$/, '');
  };
  const recalc = () => { updateMix(); window.calcSed?.(); };
  ['baseMixMg','mixMultiplier','fluidPreset'].forEach(id => $(id).addEventListener('input', recalc));
  $('mixMl').addEventListener('input', () => { $('fluidPreset').value = 'custom'; recalc(); });
  if (!document.querySelector('style[data-patient-mix]')) {
    document.head.insertAdjacentHTML('beforeend', '<style data-patient-mix>.profile-actions{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end}.profile-actions .button{min-height:38px;white-space:nowrap}@media(max-width:860px){.profile-actions{grid-template-columns:1fr}}</style>');
  }
  render(); if (active) apply(active); recalc();
})();
