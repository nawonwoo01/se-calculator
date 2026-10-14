    const $ = (id) => document.getElementById(id);
    const nativeApp = window.SE_RELEASE?.native === true;
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const STORAGE_KEY = 'se-calculator-admin-config-v1';
    const PATIENT_STORAGE_KEY = 'se-calculator-patient-profiles-v1';
    const round = (n, d = 1) => Number.isFinite(n) ? n.toFixed(d).replace(/\.0$/, '') : '-';
    const comparisonMixtures = {};
    let deferredInstallPrompt = null;
    let patientProfiles = [];
    let activePatientId = '';
    let evidenceText = 'Glauser T, Shinnar S, Gloss D, et al. Evidence-based guideline: Treatment of convulsive status epilepticus in children and adults. Epilepsy Curr. 2016;16(1):48-61. Brophy GM, Bell R, Claassen J, et al. Guidelines for the evaluation and management of status epilepticus. Neurocrit Care. 2012;17(1):3-23. Kapur J, Elm J, Chamberlain JM, et al. Randomized trial of three anticonvulsant medications for status epilepticus. N Engl J Med. 2019;381(22):2103-2113. Chamberlain JM, Kapur J, Shinnar S, et al. Efficacy of levetiracetam, fosphenytoin, and valproate for established status epilepticus by age group. Lancet. 2020;395(10231):1217-1224. Woodward HJ, et al. Status epilepticus in older adults: A critical review. Epilepsia. 2025. Joshi S, Kapur J. Status epilepticus: Updates on mechanisms and treatments. Epilepsia Open. 2025.';
    let sedatives = {
      midazolam: { label: 'Midazolam', color: '#1f6fb7', load: 0.2, unit: 'mg/kg/hr', range: '0.05-2 mg/kg/hr', quick: [0.05,0.1,0.2,0.5,1,2], table: { min: 0.05, max: 2, step: 0.05 }, notes: 'Use 0.2 mg/kg IV loading for RSE CIVAD. Watch hypotension, respiratory depression, accumulation with repeated dosing, renal dysfunction, obesity/older age, and tachyphylaxis.' },
      ketamine: { label: 'Ketamine', color: '#0f766e', load: 1, unit: 'mg/kg/hr', range: '1.5-10 mg/kg/hr', quick: [1,1.5,2,3,5,7.5,10], table: { min: 0.5, max: 10, step: 0.5 }, notes: 'NMDA antagonist. Consider as adjunct/alternative in RSE. Watch hypertension/tachycardia, secretions, laryngospasm, myocardial depression in cardiac disease, cholestatic hepatotoxicity.' },
      propofol: { label: 'Propofol', color: '#a32020', load: 2, unit: 'mcg/kg/min', range: '20-200 mcg/kg/min', quick: [20,50,65,100,150,200], table: { min: 20, max: 200, step: 10 }, notes: 'Calculator converts mcg/kg/min to mg/kg/hr. PRIS risk rises with high dose/prolonged use. Monitor TG, CK, lactate, K, renal/liver markers. Avoid/caution mitochondrial disease and ketogenic diet.' },
      pentobarbital: { label: 'Pentobarbital', color: '#8a6500', load: 5, unit: 'mg/kg/hr', range: '0.5-5 mg/kg/hr', quick: [0.5,1,2,5], table: { min: 0.5, max: 5, step: 0.1 }, notes: 'Profound hypotension, respiratory depression, ileus, infection risk, loss of neuro exam. ICU/airway/vasopressor planning required.' },
      thiopental: { label: 'Thiopental', color: '#6b4ca5', load: 3, unit: 'mg/kg/hr', range: '0.5-5 mg/kg/hr', quick: [0.5,1,2,5], table: { min: 0.5, max: 5, step: 0.1 }, notes: 'Barbiturate anesthetic. Respiratory/cardiac depression and hypotension. Use institutional protocol.' }
    };
    let selectedSedatives = ['midazolam'];
    let asms = {
      lev: { label:'Levetiracetam', doses:[40,60], max:4500, unit:'mg', minutes:10, note:'Low interaction and hemodynamic risk. Adjust maintenance in renal impairment; consider dialysis supplement.' },
      fpht: { label:'Fosphenytoin', doses:[20], max:1500, unit:'mg PE', minutes:10, note:'Dose in phenytoin equivalents. ECG/BP monitoring. Avoid/caution Dravet, sodium-channel toxin, conduction disease.' },
      pht: { label:'Phenytoin', doses:[20], max:1500, unit:'mg', minutes:30, note:'NS only. Avoid D5W and feeding tube. Purple glove/extravasation, hypotension, arrhythmia; TDM needed.' },
      vpa: { label:'Valproate', doses:[20,30,40], max:3000, unit:'mg', minutes:20, note:'Minimal hypotension/respiratory depression. Avoid severe hepatic disease, urea-cycle disorder; watch platelets, ammonia, pancreatitis. Carbapenems lower level.' },
      pb: { label:'Phenobarbital', doses:[15,20], max:2000, unit:'mg', minutes:20, note:'Sedation, respiratory depression, hypotension. Older adults have reduced clearance.' },
      lac: { label:'Lacosamide', fixed:[200,400], max:400, unit:'mg', minutes:10, note:'Fixed loading option. Watch PR prolongation, AV block, bradyarrhythmia, cardiac disease/AV blockers.' }
    };
    let warningItems = [
      ['renal','Renal impairment', 'LEV maintenance adjustment; midazolam active metabolite accumulation; consider dialysis supplement where relevant.'],
      ['hepatic','Severe hepatic disease', 'Avoid/caution valproate; sedative metabolism may be prolonged.'],
      ['platelet','Thrombocytopenia/coagulopathy', 'Avoid/caution valproate.'],
      ['preg','Pregnancy/childbearing potential', 'Avoid chronic valproate when possible; single rescue dose requires specialist judgment.'],
      ['cardiac','Conduction disease/AV block', 'Avoid/caution phenytoin, fosphenytoin, lacosamide; ECG/BP monitoring.'],
      ['shock','Shock/hypotension', 'Prefer LEV/VPA when clinically appropriate; caution PHT/fPHT/PB/propofol/barbiturate.'],
      ['dravet','Dravet or sodium-channel toxin', 'Avoid sodium-channel blockers such as PHT/fPHT and often lacosamide.'],
      ['carbapenem','Carbapenem use', 'Avoid valproate or expect major level reduction.']
    ];
    const defaultConfig = JSON.parse(JSON.stringify({ sedatives, asms, warningItems, evidenceText }));
    function loadConfig() {
      if (nativeApp) return;
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (!saved) return;
        SECore.validateConfig(saved);
        if (saved.sedatives) sedatives = saved.sedatives;
        if (saved.asms) asms = saved.asms;
        if (saved.warningItems) warningItems = saved.warningItems;
        if (saved.evidenceText) evidenceText = saved.evidenceText;
        if (saved.selectedSedatives) selectedSedatives = saved.selectedSedatives;
      } catch (error) {
        console.warn('Config load failed', error);
      }
    }
    function currentConfig() {
      return { sedatives, asms, warningItems, evidenceText, selectedSedatives, updatedAt: new Date().toISOString() };
    }
    function loadPatientStore() {
      if (nativeApp) return;
      try {
        const saved = JSON.parse(localStorage.getItem(PATIENT_STORAGE_KEY) || 'null');
        patientProfiles = Array.isArray(saved?.profiles) ? saved.profiles.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.length <= 80) : [];
        activePatientId = saved?.activePatientId || '';
      } catch (error) {
        console.warn('Patient profile load failed', error);
        patientProfiles = [];
        activePatientId = '';
      }
    }
    function savePatientStore() {
      if (!nativeApp) localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify({ profiles: patientProfiles, activePatientId }));
    }
    function readPatientForm() {
      return {
        id: activePatientId || `p_${Date.now()}`,
        name: $('patientName').value.trim().slice(0, 80) || `Case ${patientProfiles.length + 1}`,
        wt: +$('wt').value || 0,
        ht: +$('ht').value || 0,
        sex: $('sex').value,
        dosingWeight: $('dosingWeight').value,
        asmWeight: $('asmWeight').value,
        updatedAt: new Date().toISOString()
      };
    }
    function renderPatientProfiles() {
      $('patientSelect').innerHTML = '<option value="">New / unsaved patient</option>' + patientProfiles
        .slice()
        .sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} · ${escapeHtml(p.wt || '-')} kg · ${escapeHtml(p.ht || '-')} cm</option>`)
        .join('');
      $('patientSelect').value = patientProfiles.some(p => p.id === activePatientId) ? activePatientId : '';
      $('deletePatient').disabled = !$('patientSelect').value;
    }
    function applyPatientProfile(id) {
      const profile = patientProfiles.find(p => p.id === id);
      resetCaseInputs();
      activePatientId = profile ? profile.id : '';
      if (!profile) {
        $('patientName').value = '';
        savePatientStore();
        renderPatientProfiles();
        calcSed(); calcAsm(); calcWarnings(); calcScores();
        return;
      }
      $('patientName').value = profile.name || '';
      $('wt').value = profile.wt || '';
      $('ht').value = profile.ht || '';
      $('sex').value = profile.sex || 'male';
      $('dosingWeight').value = profile.dosingWeight || 'actual';
      $('asmWeight').value = profile.asmWeight || profile.dosingWeight || 'actual';
      savePatientStore();
      renderPatientProfiles();
      calcSed();
      calcAsm();
      calcWarnings(); calcScores();
    }
    function savePatientProfile() {
      try { weights(); } catch (error) { $('caseStatus').textContent = error.message; return; }
      const profile = readPatientForm();
      const idx = patientProfiles.findIndex(p => p.id === profile.id);
      if (idx >= 0) patientProfiles[idx] = profile;
      else patientProfiles.push(profile);
      activePatientId = profile.id;
      savePatientStore();
      renderPatientProfiles();
      $('caseStatus').textContent = nativeApp ? '이 케이스는 앱 실행 중에만 유지됩니다. 앱을 다시 시작하면 삭제됩니다.' : '이 기기에만 저장했습니다. 환자 식별정보를 입력하지 마세요.';
    }
    function deletePatientProfile() {
      const id = $('patientSelect').value;
      if (!id) return;
      patientProfiles = patientProfiles.filter(p => p.id !== id);
      activePatientId = '';
      $('patientName').value = '';
      savePatientStore();
      renderPatientProfiles();
      resetCaseInputs(); calcSed(); calcAsm(); calcWarnings(); calcScores();
    }
    function resetCaseInputs() {
      $('wt').value = ''; $('ht').value = ''; $('sex').value = 'male';
      $('patientName').value = ''; $('dosingWeight').value = 'actual'; $('asmWeight').value = 'actual';
      $('baseMixMg').value = '600'; $('mixMultiplier').value = '1'; $('fluidPreset').value = '500'; $('mixMl').value = '500'; $('rateDose').value = '0.2';
      Object.keys(comparisonMixtures).forEach(k => delete comparisonMixtures[k]);
      renderComparisonMixtures();
      document.querySelectorAll('#warningChecks input,#scores input').forEach(el => { el.checked = false; });
      document.querySelectorAll('#scores select').forEach(el => { el.selectedIndex = 0; });
      $('asmDrug').selectedIndex = 0; updateAsmDoseOptions();
      $('caseStatus').textContent = '새 케이스: 체중과 키를 입력하세요.';
    }
    function clearCases() {
      patientProfiles = []; activePatientId = '';
      localStorage.removeItem(PATIENT_STORAGE_KEY);
      resetCaseInputs(); renderPatientProfiles(); calcSed(); calcAsm(); calcWarnings(); calcScores();
      $('caseStatus').textContent = '저장된 케이스와 현재 입력을 삭제했습니다.';
    }
    function setAdminStatus(message, kind = 'note') {
      const box = $('adminStatus');
      if (!box) return;
      box.className = `note ${kind}`;
      box.textContent = message;
    }
    function renderAdmin() {
      $('sedativeConfig').value = JSON.stringify(sedatives, null, 2);
      $('asmConfig').value = JSON.stringify(asms, null, 2);
      $('evidenceConfig').value = evidenceText;
      $('evidenceText').textContent = evidenceText;
    }
    function saveAdminConfig() {
      if (nativeApp) return;
      try {
        const candidate = SECore.validateConfig({ sedatives: JSON.parse($('sedativeConfig').value), asms: JSON.parse($('asmConfig').value), warningItems, evidenceText: $('evidenceConfig').value.trim() || defaultConfig.evidenceText });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
        ({ sedatives, asms, evidenceText } = candidate);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig()));
        populate();
        updateAsmDoseOptions();
        calcSed();
        calcWarnings();
        calcScores();
        renderAdmin();
        setAdminStatus('Saved to this browser. Refresh-safe on this device.', 'note');
      } catch (error) {
        setAdminStatus(`JSON error: ${error.message}`, 'danger');
      }
    }
    function resetAdminConfig() {
      if (nativeApp) return;
      localStorage.removeItem(STORAGE_KEY);
      sedatives = JSON.parse(JSON.stringify(defaultConfig.sedatives));
      asms = JSON.parse(JSON.stringify(defaultConfig.asms));
      warningItems = JSON.parse(JSON.stringify(defaultConfig.warningItems));
      evidenceText = defaultConfig.evidenceText;
      selectedSedatives = ['midazolam'];
      populate();
      updateAsmDoseOptions();
      calcSed();
      calcWarnings();
      calcScores();
      renderAdmin();
      setAdminStatus('Reset to bundled default values.', 'warn');
    }
    function exportAdminConfig() {
      const blob = new Blob([JSON.stringify(currentConfig(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'se-calculator-config.json';
      a.click();
      URL.revokeObjectURL(url);
      setAdminStatus('Exported JSON configuration.', 'note');
    }
    function importAdminConfig() {
      if (nativeApp) return;
      try {
        const imported = SECore.validateConfig(JSON.parse($('importConfig').value));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        sedatives = imported.sedatives;
        asms = imported.asms;
        warningItems = imported.warningItems || warningItems;
        evidenceText = imported.evidenceText || evidenceText;
        selectedSedatives = imported.selectedSedatives || selectedSedatives;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig()));
        populate();
        updateAsmDoseOptions();
        calcSed();
        calcWarnings();
        calcScores();
        renderAdmin();
        setAdminStatus('Imported and saved to this browser.', 'note');
      } catch (error) {
        setAdminStatus(`Import failed: ${error.message}`, 'danger');
      }
    }
    function weights() {
      return SECore.weights($('wt').value, $('ht').value, $('sex').value);
    }
    function selectedWeight(id) { return SECore.positive(weights()[$(id).value], '투여 체중'); }
    function updateMixtureInputs() {
      if ($('fluidPreset').value !== 'custom') $('mixMl').value = $('fluidPreset').value;
      const base = +$('baseMixMg').value || 0;
      const multiplier = +$('mixMultiplier').value || 1;
      $('mixMg').value = round(base * multiplier, 1);
    }
    function populate() {
      selectedSedatives = selectedSedatives.filter(k => sedatives[k]);
      if (!selectedSedatives.length) selectedSedatives = Object.keys(sedatives).slice(0, 1);
      $('sedativeChecks').innerHTML = Object.entries(sedatives).map(([k,v]) => `<label class="drug-chip" style="border-left-color:${v.color || '#1f6fb7'}"><input type="checkbox" value="${k}" ${selectedSedatives.includes(k) ? 'checked' : ''}> ${escapeHtml(v.label)}<span class="small">${escapeHtml(v.range)}</span></label>`).join('');
      $('asmDrug').innerHTML = Object.entries(asms).map(([k,v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`).join('');
      $('warningChecks').innerHTML = warningItems.map(([id,label]) => `<label class="check"><input id="warn_${id}" type="checkbox"> ${escapeHtml(label)}</label>`).join('');
      renderComparisonMixtures();
    }
    function renderComparisonMixtures() {
      const keys = selectedSedatives.filter(k => sedatives[k]);
      $('primaryMixtureLabel').textContent = keys.length ? `${sedatives[keys[0]].label} 혼합액 · 아래 입력 사용` : '약제를 선택하세요';
      $('rateDoseLabel').textContent = keys.length ? `${sedatives[keys[0]].label} dose (${sedatives[keys[0]].unit})` : 'Rate dose';
      $('comparisonMixtures').innerHTML = keys.slice(1).map(k => {
        const drug = sedatives[k];
        const mix = comparisonMixtures[k] || { mg: '', ml: '' };
        comparisonMixtures[k] = mix;
        return `<div class="drug-note"><b>${escapeHtml(drug.label)} 별도 혼합액</b><div class="row"><div class="field"><label for="compare_${k}_mg">Total drug, mg</label><input id="compare_${k}_mg" type="number" inputmode="decimal" min="0.01" step="any" value="${escapeHtml(mix.mg)}" data-drug="${k}" data-mix="mg"></div><div class="field"><label for="compare_${k}_ml">Final volume, mL</label><input id="compare_${k}_ml" type="number" inputmode="decimal" min="0.01" step="any" value="${escapeHtml(mix.ml)}" data-drug="${k}" data-mix="ml"></div></div></div>`;
      }).join('');
    }
    function selectedSedativeKeys() {
      const checked = Array.from(document.querySelectorAll('#sedativeChecks input:checked')).map(el => el.value);
      selectedSedatives = checked;
      return checked;
    }
    function doseToMgKgHr(drug, dose) {
      return drug.unit === 'mcg/kg/min' ? dose * 0.06 : dose;
    }
    function tableDoses(drug) {
      const t = drug.table || {};
      const min = Number.isFinite(+t.min) ? +t.min : Math.min(...drug.quick);
      const max = Number.isFinite(+t.max) ? +t.max : Math.max(...drug.quick);
      const step = Number.isFinite(+t.step) && +t.step > 0 ? +t.step : 0.1;
      const doses = [];
      for (let v = min, guard = 0; v <= max + step / 2 && guard < 1000; v += step, guard++) doses.push(+v.toFixed(4));
      drug.quick.forEach(v => { if (!doses.some(x => Math.abs(x - v) < 0.0001)) doses.push(v); });
      return doses.sort((a,b) => a-b);
    }
    function calcSed() {
      updateMixtureInputs();
      const keys = selectedSedativeKeys();
      let dw, conc, dose, rate;
      try {
        if (!keys.length) throw new Error('계산할 약제를 선택하세요.');
        dw = selectedWeight('dosingWeight');
        dose = SECore.positive($('rateDose').value, 'Rate dose');
        rate = SECore.infusion(dose, sedatives[keys[0]].unit, dw, $('mixMg').value, $('mixMl').value);
        conc = rate.concentration;
      } catch (error) {
        ['dwOut','concOut','rateOut','loadOut','rangeOut','unitOut'].forEach(id => { $(id).textContent = '—'; });
        $('sedDoseWarning').textContent = '';
        $('rateTable').replaceChildren(); $('sedQuick').replaceChildren(); $('sedNotes').textContent = '';
        $('sedError').textContent = error.message; $('sedError').classList.remove('hidden');
        return;
      }
      $('sedError').classList.add('hidden');
      const primaryRange = sedatives[keys[0]].table;
      $('sedDoseWarning').textContent = dose < primaryRange.min || dose > primaryRange.max ? '선택 약제의 표시 범위를 벗어난 입력입니다. 단위와 기관 프로토콜을 확인하세요.' : '';
      $('dwOut').textContent = `${round(dw,1)} kg`;
      $('concOut').textContent = `${round(conc,2)} mg/mL`;
      $('rateOut').textContent = `${round(rate.mlHr,1)} mL/hr`;
      $('loadOut').textContent = keys.map(k => `${sedatives[k].label}: ${round(sedatives[k].load * dw,1)} mg`).join(' · ');
      $('rangeOut').textContent = keys.map(k => `${sedatives[k].label}: ${sedatives[k].range}`).join(' · ');
      $('unitOut').textContent = `${dose} ${sedatives[keys[0]].unit}`;
      const activeDrug = sedatives[keys[0]];
      $('sedQuick').innerHTML = activeDrug.quick.map(x => `<button class="pill ${x == dose ? 'active':''}" data-dose="${x}">${activeDrug.label} ${x} ${activeDrug.unit}</button>`).join('');
      $('sedQuick').querySelectorAll('button').forEach(b => b.onclick = () => { $('rateDose').value = b.dataset.dose; calcSed(); });
      const rows = keys.flatMap(k => {
        const drug = sedatives[k];
        return tableDoses(drug).map(x => {
          const mgkg = doseToMgKgHr(drug, x);
          let flow = '혼합액 입력 필요', concentration = '—';
          try {
            const mix = k === keys[0] ? { mg: $('mixMg').value, ml: $('mixMl').value } : comparisonMixtures[k];
            const result = SECore.infusion(x, drug.unit, dw, mix?.mg, mix?.ml);
            flow = `${round(result.mlHr,1)} mL/hr`; concentration = `${round(result.concentration,2)} mg/mL`;
          } catch { /* Each comparison drug requires its own valid mixture. */ }
          return `<tr><td style="border-left:6px solid ${drug.color || '#1f6fb7'}"><b>${escapeHtml(drug.label)}</b></td><td>${x} ${drug.unit}</td><td>${round(mgkg,2)} mg/kg/hr</td><td>${concentration}</td><td>${flow}</td></tr>`;
        });
      }).join('');
      $('rateTable').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Drug</th><th>Dose</th><th>mg/kg/hr equivalent</th><th>Concentration</th><th>Infusion rate</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      $('sedNotes').innerHTML = keys.map(k => {
        const drug = sedatives[k];
        return `<div class="drug-note" style="border-left-color:${drug.color || '#1f6fb7'}"><b>${escapeHtml(drug.label)}</b><br>${escapeHtml(drug.notes)}</div>`;
      }).join('');
    }
    function updateAsmDoseOptions() {
      const d = asms[$('asmDrug').value];
      const opts = d.fixed ? d.fixed.map(x => `<option value="fixed:${x}">${x} ${d.unit}</option>`) : d.doses.map(x => `<option value="kg:${x}">${x} ${d.unit}/kg</option>`);
      $('asmDose').innerHTML = opts.join('');
      $('asmDose').selectedIndex = opts.length - 1;
      $('asmMinutes').value = d.minutes;
      calcAsm();
    }
    function calcAsm() {
      const d = asms[$('asmDrug').value];
      const [kind, raw] = $('asmDose').value.split(':');
      const val = +raw;
      let dw, capped, perMinute;
      try {
        dw = selectedWeight('asmWeight');
        ({ capped, perMinute } = SECore.loading(val, kind, dw, d.max, $('asmMinutes').value));
      } catch (error) {
        ['asmDoseOut','asmLoadOut','asmRateOut'].forEach(id => { $(id).textContent = '—'; });
        $('asmAll').replaceChildren(); $('asmNote').textContent = '';
        $('asmError').textContent = error.message; $('asmError').classList.remove('hidden'); return;
      }
      $('asmError').classList.add('hidden');
      $('asmDoseOut').textContent = kind === 'fixed' ? `${val} ${d.unit}` : `${val} ${d.unit}/kg`;
      $('asmLoadOut').textContent = `${round(capped,0)} ${d.unit}`;
      $('asmRateOut').textContent = `${round(perMinute,1)} ${d.unit}/min`;
      $('asmNote').textContent = d.note;
      $('asmAll').innerHTML = '<table><thead><tr><th>Drug</th><th>Default</th><th>Max</th><th>Calculated</th></tr></thead><tbody>' +
        Object.entries(asms).map(([k,x]) => {
          const defaultDose = x.fixed ? x.fixed[x.fixed.length-1] : x.doses[x.doses.length-1];
          const amount = x.fixed ? defaultDose : defaultDose * dw;
          return `<tr><td>${escapeHtml(x.label)}</td><td>${x.fixed ? defaultDose + ' ' + x.unit : defaultDose + ' ' + x.unit + '/kg'}</td><td>${x.max} ${x.unit}</td><td>${round(Math.min(amount, x.max),0)} ${x.unit}</td></tr>`;
        }).join('') + '</tbody></table>';
    }
    function calcWarnings() {
      const active = warningItems.filter(([id]) => $(`warn_${id}`)?.checked);
      $('warningOutput').innerHTML = active.length ? active.map(([,label,msg]) => `<div class="note warn"><b>${escapeHtml(label)}</b><br>${escapeHtml(msg)}</div><br>`).join('') : '<div class="note">No warning flag selected.</div>';
    }
    function calcScores() {
      const select = +$('selectNihss').value + ($('selectLaa').checked?1:0) + ($('selectEarly').checked?3:0) + ($('selectCortical').checked?2:0) + ($('selectMca').checked?1:0);
      const cave = ['caveCortical','caveAge','caveVolume','caveEarly'].reduce((s,id)=>s+($(id).checked?1:0),0);
      const stess = SECore.stess($('stessAge').checked, $('stessNoHx').checked, $('stessType').value, $('stessCon').value);
      $('selectOut').textContent = `${select}/9`;
      $('caveOut').textContent = `${cave}/4`;
      $('stessOut').textContent = `${stess}/6`;
      const caveRisk = ['~0.6%','~3.6%','~9.8%','~34.8%','~46.2%'][cave];
      $('scoreNotes').innerHTML = `CAVE estimated late seizure risk: <b>${caveRisk}</b>. SeLECT requires original risk table/nomogram for exact 1-year/5-year probability. STESS is for escalation/monitoring support, not treatment limitation.`;
    }
    function bind() {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        $('installBtn').textContent = 'Install app';
      });
      document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        btn.classList.add('active'); $(btn.dataset.tab).classList.remove('hidden');
      });
      $('installBtn').addEventListener('click', async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice.catch(() => null);
          deferredInstallPrompt = null;
        } else {
          alert('Android Chrome: 메뉴에서 "홈 화면에 추가"를 선택하세요. iPhone Safari: 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택하세요.');
        }
      });
      $('saveConfig').addEventListener('click', saveAdminConfig);
      $('resetConfig').addEventListener('click', resetAdminConfig);
      $('exportConfig').addEventListener('click', exportAdminConfig);
      $('applyImport').addEventListener('click', importAdminConfig);
      $('patientSelect').addEventListener('change', () => applyPatientProfile($('patientSelect').value));
      $('savePatient').addEventListener('click', savePatientProfile);
      $('deletePatient').addEventListener('click', deletePatientProfile);
      $('clearCases').addEventListener('click', clearCases);
      $('newCase').addEventListener('click', () => applyPatientProfile(''));
      $('fluidPreset').addEventListener('change', calcSed);
      $('mixMl').addEventListener('input', () => { $('fluidPreset').value = 'custom'; calcSed(); });
      ['wt','ht','sex','dosingWeight','baseMixMg','mixMultiplier','rateDose'].forEach(id => $(id).addEventListener('input', calcSed));
      $('sedativeChecks').addEventListener('change', () => {
        const oldPrimary = selectedSedatives[0];
        if (oldPrimary) comparisonMixtures[oldPrimary] = { mg: $('mixMg').value, ml: $('mixMl').value };
        selectedSedativeKeys();
        const primary = selectedSedatives[0];
        if (primary && primary !== oldPrimary) {
          const mix = comparisonMixtures[primary] || { mg: '', ml: '' };
          $('baseMixMg').value = mix.mg; $('mixMultiplier').value = '1';
          $('fluidPreset').value = 'custom'; $('mixMl').value = mix.ml;
          $('rateDose').value = sedatives[primary].quick[0];
        }
        renderComparisonMixtures(); calcSed();
      });
      $('comparisonMixtures').addEventListener('input', event => {
        if (!event.target.dataset.drug) return;
        comparisonMixtures[event.target.dataset.drug][event.target.dataset.mix] = event.target.value;
        calcSed();
      });
      $('asmDrug').addEventListener('change', updateAsmDoseOptions);
      ['asmDose','asmMinutes','asmWeight','wt','ht','sex'].forEach(id => $(id).addEventListener('input', calcAsm));
      $('warningChecks').addEventListener('change', calcWarnings);
      document.querySelectorAll('#scores input,#scores select').forEach(el => el.addEventListener('input', calcScores));
      if (!nativeApp && 'serviceWorker' in navigator && location.protocol !== 'file:') registerServiceWorker();
    }
    function registerServiceWorker() {
      let hadController = Boolean(navigator.serviceWorker.controller), applyingUpdate = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) { hadController = true; return; }
        if (applyingUpdate) { window.location.reload(); return; }
        $('updateNotice').classList.remove('hidden');
      });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((registration) => {
        registration.update();
        if (registration.waiting) $('updateNotice').classList.remove('hidden');
        $('applyUpdate').onclick = () => {
          if (registration.waiting) { applyingUpdate = true; registration.waiting.postMessage({ type: 'SKIP_WAITING' }); }
          else window.location.reload();
        };
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              $('updateNotice').classList.remove('hidden');
            }
          });
        });
      }).catch((error) => console.warn('Service worker registration failed', error));
    }
    loadConfig(); loadPatientStore(); populate(); updateAsmDoseOptions(); bind(); renderAdmin(); renderPatientProfiles(); if (activePatientId) applyPatientProfile(activePatientId); calcSed(); calcAsm(); calcWarnings(); calcScores();
    document.querySelectorAll('.field').forEach(field => {
      const label = field.querySelector('label'), input = field.querySelector('input,select,textarea');
      if (label && input?.id) label.htmlFor = input.id;
    });
    document.querySelectorAll('input[type="number"]').forEach(input => { input.inputMode = 'decimal'; input.step = 'any'; });
    $('appVersion').textContent = `v${window.SE_RELEASE.version} · ${window.SE_RELEASE.clinicalStatus}`;
    if (nativeApp) {
      document.querySelector('.install-box').classList.add('hidden');
      document.querySelector('[data-tab="admin"]').classList.add('hidden');
      $('admin').remove();
      $('profileStorageNote').textContent = '앱의 케이스는 실행 중 메모리에만 유지됩니다. 앱을 다시 시작하면 삭제됩니다. 환자 이름·병록번호를 입력하지 마세요.';
      $('savePatient').textContent = 'Keep case';
    }
