    const $ = (id) => document.getElementById(id);
    const nativeApp = window.SE_RELEASE?.native === true;
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const STORAGE_KEY = 'se-calculator-admin-config-v1';
    const PATIENT_STORAGE_KEY = 'se-calculator-patient-profiles-v1';
    const round = (n, d = 1) => !Number.isFinite(n) ? '—' : n !== 0 && Math.abs(n) < 10 ** -d ? n.toExponential(2) : String(Number(n.toFixed(d)));
    const comparisonMixtures = {};
    const AUTO_MIX_KEYS = ['midazolam', 'ketamine'];
    const infusionFlows = { midazolam: '10', ketamine: '10' };
    const oneTimesFlows = { midazolam: 10, ketamine: 10 };
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
    let selectedSedatives = ['midazolam', 'ketamine'];
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
    // Map the existing patient flags to their relevant ASMs; this never changes dosing.
    const asmWarningTargets = {
      renal: { lev: '신장 기능·투석에 따른 유지용량과 투석 후 보충을 확인하세요. 이 항목만으로 loading 용량을 자동 감량하지 않습니다.' },
      hepatic: { vpa: '중증 간 질환: Valproate 회피·주의 여부를 확인하세요.' },
      platelet: { vpa: '혈소판 감소·응고장애: Valproate 회피·주의 여부를 확인하세요.' },
      preg: { vpa: '임신·가임 가능성: Valproate의 장기 사용과 단회 응급투여를 구분해 전문의가 판단해야 합니다.' },
      cardiac: { pht: '전도장애·AV block: Phenytoin 사용 적합성 및 ECG·혈압 감시를 확인하세요.', fpht: '전도장애·AV block: Fosphenytoin 사용 적합성 및 ECG·혈압 감시를 확인하세요.', lac: '전도장애·AV block: Lacosamide의 PR 연장·서맥 위험 및 ECG 감시를 확인하세요.' },
      shock: { pht: '쇼크·저혈압: Phenytoin의 혈압 저하·부정맥에 주의하세요.', fpht: '쇼크·저혈압: Fosphenytoin의 혈압 저하·부정맥에 주의하세요.', pb: '쇼크·저혈압: Phenobarbital의 저혈압·호흡억제에 주의하세요.' },
      dravet: { pht: 'Dravet 또는 나트륨통로 독성: Phenytoin 같은 나트륨통로 차단제의 회피 여부를 확인하세요.', fpht: 'Dravet 또는 나트륨통로 독성: Fosphenytoin 같은 나트륨통로 차단제의 회피 여부를 확인하세요.', lac: 'Dravet 또는 나트륨통로 독성: Lacosamide를 포함한 나트륨통로 차단제 사용을 재검토하세요.' },
      carbapenem: { vpa: 'Carbapenem 병용: Valproate 농도가 크게 감소할 수 있어 병용 회피·대체 여부를 확인하세요.' }
    };
    function activeWarnings() { return warningItems.filter(([id]) => $(`warn_${id}`)?.checked); }
    function cautionsForAsm(key) {
      return activeWarnings().flatMap(([id,label]) => asmWarningTargets[id]?.[key] ? [{ id, label, message: asmWarningTargets[id][key] }] : []);
    }
    function renderAsmCautions() {
      const key = $('asmDrug').value;
      const flags = cautionsForAsm(key);
      const box = $('asmCautions');
      box.classList.toggle('warn', flags.length > 0);
      box.innerHTML = flags.length ? `<b>${escapeHtml(asms[key].label)} · 선택 항목 관련 주의 ${flags.length}건</b><ul>${flags.map(flag => `<li><b>${escapeHtml(flag.label)}</b>: ${escapeHtml(flag.message)}</li>`).join('')}</ul>` :
        '선택 항목에 대해 이 약제에 자동 연결된 주의 표시가 없습니다. 금기·안전성이 확인되었다는 뜻은 아니며 약제 설명과 기관 프로토콜을 확인하세요.';
    }
    const defaultConfig = JSON.parse(JSON.stringify({ sedatives, asms, warningItems, evidenceText }));
    const evidenceSelections = {};
    function evidenceSelection(key) {
      const profiles = SEEvidence.profiles[key];
      if (!profiles) return null;
      if (!evidenceSelections[key]) {
        const p = profiles[0], prep = SEEvidence.preparations[key];
        evidenceSelections[key] = { profile: p.id, dose: p.defaultDose, load: p.defaultLoad, concentration: prep.concentrations[0], volume: prep.defaultVolume };
      }
      return evidenceSelections[key];
    }
    function selectedEvidence(key) {
      const selection = evidenceSelection(key);
      return selection && SEEvidence.profiles[key].find(p => p.id === selection.profile);
    }
    function effectiveSedative(key) {
      const drug = sedatives[key], p = selectedEvidence(key);
      if (!p || $('mixtureMode').value !== 'auto') return drug;
      return { ...drug, load: evidenceSelection(key).load, unit: p.unit, quick: p.doses,
        range: `${p.min}–${p.max} ${p.unit}${p.startDose ? ` · 시작 ${p.startDose}` : ''} (${SEEvidence.sources[p.source].label})`,
        table: { min: p.min, max: p.max, step: p.step }, notes: `${p.note} ${drug.notes}` };
    }
    function mixtureFactor(key) { return usesAutomaticMix(key) && SEEvidence.preparations[key] ? 1 : Number($('mixMultiplier').value); }
    function renderEvidenceControls() {
      const automatic = $('mixtureMode').value === 'auto';
      $('evidenceControls').classList.toggle('hidden', !automatic);
      $('evidenceControls').innerHTML = automatic ? selectedSedatives.filter(key => SEEvidence.profiles[key]).map(key => {
        const state = evidenceSelection(key), p = selectedEvidence(key), prep = SEEvidence.preparations[key];
        const source = SEEvidence.sources[p.source], prepSource = SEEvidence.sources[prep.source];
        const options = (values, selected, label) => values.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${escapeHtml(label(v))}</option>`).join('');
        return `<div class="drug-note evidence-drug" data-evidence-drug="${key}"><h3>${escapeHtml(sedatives[key].label)} · 근거별 자동 계산</h3>
          <div class="field"><label for="evidence_${key}">투여 용량 근거</label><select id="evidence_${key}" data-evidence-key="${key}" data-evidence-field="profile">${SEEvidence.profiles[key].map(profile => `<option value="${profile.id}" ${profile.id === state.profile ? 'selected' : ''}>${profile.min}–${profile.max} ${profile.unit}_(${SEEvidence.sources[profile.source].label})</option>`).join('')}</select></div>
          <div class="row">
            <div class="field"><label for="evidenceDose_${key}">지속주입 용량 선택</label><select id="evidenceDose_${key}" data-evidence-key="${key}" data-evidence-field="dose">${options(p.doses,state.dose,v => `${v} ${p.unit}_(${source.label}${v === p.startDose ? '·시작' : '·범위 내 선택'})`)}</select></div>
            <div class="field"><label for="evidenceLoad_${key}">Shooting · 단회 loading 선택</label><select id="evidenceLoad_${key}" data-evidence-key="${key}" data-evidence-field="load">${options(p.loads,state.load,v => `${v} mg/kg_(${source.label})`)}</select></div>
          </div>
          <p class="small">${escapeHtml(p.note)} <a href="${source.url}" target="_blank" rel="noopener noreferrer">용량 원문</a></p>
          <div class="row">
            <div class="field"><label for="evidenceConcentration_${key}">제제·희석 농도 선택</label><select id="evidenceConcentration_${key}" data-evidence-key="${key}" data-evidence-field="concentration">${options(prep.concentrations,state.concentration,v => `${v} mg/mL_(${prepSource.label})`)}</select></div>
            <div class="field"><label for="evidenceVolume_${key}">${key === 'thiopental' ? '조제 최종 부피' : '완제품 용량'}</label><select id="evidenceVolume_${key}" data-evidence-key="${key}" data-evidence-field="volume">${options(prep.volumes,state.volume,v => `${v} mL`)}</select></div>
          </div>
          <p class="small">${escapeHtml(prep.note)} <a href="${prepSource.url}" target="_blank" rel="noopener noreferrer">농도 원문</a></p>
          <div id="evidenceResult_${key}" class="note" role="status" aria-live="polite"></div>
        </div>`;
      }).join('') : '';
    }
    function renderEvidenceMetrics() {
      for (const key of selectedSedatives) {
        const box = $(`evidenceResult_${key}`);
        if (!box) continue;
        try {
          const dw = selectedWeight('dosingWeight'), p = selectedEvidence(key), state = evidenceSelection(key);
          if (!p.doses.includes(state.dose) || !p.loads.includes(state.load)) throw new Error('근거별 용량을 다시 선택하세요.');
          const mix = mixtureForDrug(key, dw), rate = SECore.infusion(state.dose,p.unit,dw,mix.mg,mix.ml);
          box.textContent = `${round(+mix.mg,2)} mg / ${mix.ml} mL · ${round(rate.concentration,3)} mg/mL → 선택 용량 ${state.dose} ${p.unit}: ${round(rate.mlHr,2)} mL/hr · ${round(rate.mgKgHr * dw,2)} mg/hr`;
          box.classList.remove('danger');
        } catch (error) { box.textContent = error.message; box.classList.add('danger'); }
      }
    }
    function renderEvidenceReferences() {
      $('evidenceHistory').innerHTML = `<div class="table-wrap"><table><thead><tr><th>검토일 / 약제</th><th>이전</th><th>선택지 / 변경</th><th>변경 고려사항</th></tr></thead><tbody>${SEEvidence.history.map(item => `<tr><th>${item.date}<br>${escapeHtml(item.drug)}</th><td>${escapeHtml(item.before)}</td><td>${escapeHtml(item.after)}</td><td>${escapeHtml(item.considerations)}<br>${item.sources.map(id => `<a href="${SEEvidence.sources[id].url}" target="_blank" rel="noopener noreferrer">${escapeHtml(SEEvidence.sources[id].label)}</a>`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>`;
      $('evidenceSources').innerHTML = Object.entries(SEEvidence.sources).map(([id,source]) => `<div class="drug-note" id="ref_${id}"><b><a href="${source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a></b><p class="small">발표/개정: ${source.published} · 원문 대조일: ${source.reviewedAt} · 기관 임상 검토 전</p>${escapeHtml(source.scope)}</div>`).join('');
    }
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
      $('mixtureMode').value = 'auto';
      Object.keys(sedatives).forEach(key => { infusionFlows[key] = '10'; oneTimesFlows[key] = 10; });
      Object.keys(comparisonMixtures).forEach(k => delete comparisonMixtures[k]);
      Object.keys(evidenceSelections).forEach(k => delete evidenceSelections[k]);
      renderEvidenceControls();
      if (SEEvidence.profiles[selectedSedatives[0]]) $('rateDose').value = effectiveSedative(selectedSedatives[0]).quick[0];
      renderComparisonMixtures();
      document.querySelectorAll('#warningChecks input,#scores input').forEach(el => { el.checked = false; });
      document.querySelectorAll('#scores select').forEach(el => { el.selectedIndex = 0; });
      $('asmDrug').selectedIndex = 0; updateAsmDoseOptions();
      $('bodyOptions').open = false;
      $('caseStatus').textContent = '새 케이스: 체중을 입력하세요. 키는 선택 사항입니다.';
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
      selectedSedatives = ['midazolam', 'ketamine'];
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
    function selectedWeight(id) {
      const mode = $(id).value;
      const values = mode === 'actual' ? SECore.weights($('wt').value, '', $('sex').value) : weights();
      if (mode !== 'actual' && values[mode] == null) throw new Error('IBW·LBW·AdjBW 계산에는 키와 성별이 필요합니다. 실제 체중은 키 없이 사용할 수 있습니다.');
      return SECore.positive(values[mode], '투여 체중');
    }
    function calcBodyMetrics() {
      try {
        const w = weights();
        $('bodyMetrics').textContent = w.bmi == null ? '키를 입력하면 BMI와 보정 체중을 확인할 수 있습니다.' :
          `BMI ${round(w.bmi,1)} kg/m² · IBW ${round(w.ibw,1)} kg · LBW ${round(w.lbw,1)} kg · AdjBW ${round(w.adj,1)} kg`;
      } catch (error) { $('bodyMetrics').textContent = error.message; }
    }
    function calcShooting() {
      let dw;
      try { dw = selectedWeight('dosingWeight'); }
      catch (error) {
        $('loadOut').replaceChildren(); $('loadingWeight').textContent = '';
        $('loadingError').textContent = error.message; $('loadingError').classList.remove('hidden'); return;
      }
      $('loadingError').classList.add('hidden');
      const modeLabel = { actual: '실제 체중', ibw: 'IBW', lbw: 'LBW', adj: 'AdjBW' }[$('dosingWeight').value];
      $('loadingWeight').textContent = `계산 체중: ${modeLabel} ${round(dw,1)} kg`;
      $('loadOut').innerHTML = selectedSedatives.map(key => {
        const drug = effectiveSedative(key);
        if (!drug) return `<div class="metric"><div class="k">${key === 'midazolam' ? 'Midazolam' : 'Ketamine'}</div><p class="small">현재 설정에 약제가 없습니다.</p></div>`;
        const dose = Number(drug.load) * dw;
        return `<div class="metric"><div class="k">${escapeHtml(drug.label)} · IV loading</div><div class="v" id="${key}LoadingOut">${round(dose,1)} mg</div><p class="small">${escapeHtml(drug.load)} mg/kg × ${round(dw,1)} kg${usesAutomaticMix(key) && selectedEvidence(key) ? ` · ${escapeHtml(SEEvidence.sources[selectedEvidence(key).source].label)}` : ''}</p></div>`;
      }).join('');
    }
    function calcAutoMixtures() {
      try {
        const dw = selectedWeight('dosingWeight');
        const keys = selectedSedatives.filter(key => sedatives[key]);
        if (!keys.length) throw new Error('계산할 약제를 선택하세요.');
        const multiplier = SECore.positive($('mixMultiplier').value, 'Mix 배수');
        const automaticKeys = keys.filter(key => usesAutomaticMix(key) && AUTO_MIX_KEYS.includes(key));
        const weightLabel = { actual: '실제 체중', ibw: 'IBW', lbw: 'LBW', adj: 'AdjBW' }[$('dosingWeight').value];
        $('autoMixWeight').textContent = `계산 체중: ${weightLabel} ${round(dw,1)} kg · ${$('mixtureMode').value === 'auto' ? 'MDZ/Ket ' : ''}${multiplier}배`;
        $('autoMixError').classList.add('hidden');
        const recipeKeys = keys.filter(key => AUTO_MIX_KEYS.includes(key));
        $('oneMixTable').innerHTML = recipeKeys.length ? `<div class="compact-table"><table><thead><tr><th>최종 부피</th>${recipeKeys.map(key => `<th>${escapeHtml(sedatives[key].label)}</th>`).join('')}</tr></thead><tbody>${[100,250,500,1000].map(ml => {
          const mg = SECore.weightBasedMixture(dw, ml).drugMg;
          return `<tr data-volume="${ml}"><th>${ml} mL</th>${recipeKeys.map(() => `<td>${round(mg,2)} mg</td>`).join('')}</tr>`;
        }).join('')}</tbody></table></div>` : '<p class="small">이 자동 1배 정의는 Midazolam·Ketamine에 적용됩니다.</p>';
        $('mixtureSummary').innerHTML = keys.map(key => {
          const drug = effectiveSedative(key);
          try {
            const mix = mixtureForDrug(key, dw);
            SECore.infusionFromFlow(0, dw, mix?.mg, mix?.ml);
            return `<div class="metric"><b>${escapeHtml(drug.label)}</b><div>${round(+mix.mg,2)} mg / ${round(+mix.ml,1)} mL</div><p class="small">${round(+mix.mg / +mix.ml,3)} mg/mL · ${usesAutomaticMix(key) && SEEvidence.preparations[key] ? '선택 농도 고정' : mixtureFactor(key) + '배'} · ${usesAutomaticMix(key) ? (SEEvidence.preparations[key] ? '제제·희석 기준 자동' : '체중 기준 자동') : '약제별 입력 기준'}</p></div>`;
          } catch { return `<div class="metric"><b>${escapeHtml(drug.label)}</b><p class="flow-error">혼합액 입력 필요 · 위에서 실제 농도를 확인해 입력하세요.</p></div>`; }
        }).join('');
        $('scaledMixResults').innerHTML = keys.map(key => {
          if (!Object.hasOwn(infusionFlows, key)) { infusionFlows[key] = '10'; oneTimesFlows[key] = 10 * multiplier; }
          let amount = '혼합액 입력 필요', description = '';
          try {
            const mix = mixtureForDrug(key, dw);
            SECore.infusionFromFlow(0, dw, mix?.mg, mix?.ml);
            amount = `${round(+mix.mg,2)} mg`;
            description = `최종 ${round(+mix.ml,1)} mL · ${round(+mix.mg / +mix.ml,3)} mg/mL`;
          } catch { /* Keep the flow field available while the mixture is being entered. */ }
          return `<div class="metric"><div class="k">${escapeHtml(sedatives[key].label)} · ${usesAutomaticMix(key) && SEEvidence.preparations[key] ? '선택 농도' : mixtureFactor(key) + '배'}</div><div class="v" id="${key}MixMg">${amount}</div><p class="small">${description}</p>
            <div class="field flow-input"><label for="${key}Flow">${escapeHtml(sedatives[key].label)} 주입속도 · cc/hr (=mL/hr)</label><input id="${key}Flow" type="number" min="0" step="any" inputmode="decimal" data-flow-drug="${key}" value="${escapeHtml(infusionFlows[key])}"></div>
            <div id="${key}FlowError" class="small flow-error hidden" role="status"></div>
            <dl class="flow-metrics" aria-live="polite"><dt>환산 투여량</dt><dd id="${key}FlowDose">—</dd><dt>24시간 수액량</dt><dd id="${key}DailyFluid">—</dd><dt>계산상 수액 소진시간</dt><dd id="${key}BagDuration">—</dd></dl>
          </div>`;
        }).join('');
        renderFlowMetrics();
        $('mixEquivalent').classList.toggle('hidden', !automaticKeys.length);
        $('mixEquivalent').textContent = automaticKeys.length ? `${multiplier}배 자동 mix: 10 mL/hr = ${round(multiplier * 0.1,3)} mg/kg/hr · 0.1 mg/kg/hr = ${round(10 / multiplier,2)} mL/hr` : '';
        renderOverviewTables(keys, dw);
      } catch (error) {
        ['oneMixTable','scaledMixResults','flowOverviewTable','mixtureSummary','rateTable'].forEach(id => $(id).replaceChildren());
        $('autoMixWeight').textContent = ''; $('mixEquivalent').textContent = '';
        $('autoMixError').textContent = error.message; $('autoMixError').classList.remove('hidden');
      }
    }
    function renderOverviewTables(keys, dw) {
      // Show all flow rows without requiring a single-flow or target-dose input.
      const flows = [1,2,2.5,5,7.5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,125,150,175,200,225,250];
      const cells = flow => keys.map(key => {
        const drug = effectiveSedative(key);
        try {
          const mix = mixtureForDrug(key, dw);
          const dose = SECore.infusionFromFlow(flow, dw, mix?.mg, mix?.ml).doseMgKgHr;
          const nativeDose = drug.unit === 'mcg/kg/min' ? dose / 0.06 : dose;
          const outside = nativeDose < drug.table.min || nativeDose > drug.table.max;
          return `<td data-drug="${key}" class="${outside ? 'dose-outside' : ''}"${outside ? ' title="선택 기준 표시 범위 밖 · 투여 권고 아님"' : ''}>${round(dose,3)}${key === 'propofol' ? `<span class="native-dose">${round(dose / 0.06,2)} mcg/kg/min</span>` : ''}</td>`;
        } catch { return `<td data-drug="${key}" class="small">혼합액 입력 필요</td>`; }
      }).join('');
      $('flowOverviewTable').innerHTML = `<div class="table-wrap flow-overview" tabindex="0" role="region" aria-label="주입속도별 전체 투여량 표"><table><thead><tr><th scope="col">cc/hr<br><span class="small">=mL/hr</span></th>${keys.map(key => `<th scope="col">${escapeHtml(sedatives[key].label)}<span class="native-dose">mg/kg/hr</span>${usesAutomaticMix(key) && selectedEvidence(key) ? `<span class="native-dose">${escapeHtml(SEEvidence.sources[selectedEvidence(key).source].label)}</span>` : ''}</th>`).join('')}</tr></thead><tbody>${flows.map(flow => `<tr data-flow="${flow}"><th scope="row">${flow}</th>${cells(flow)}</tr>`).join('')}</tbody></table></div><p class="small">연한 회색 셀은 선택 기준의 표시 범위 밖입니다. 모든 셀은 계산값이며 투여 권고가 아닙니다.</p>`;
      const rows = keys.flatMap(key => {
        const drug = effectiveSedative(key);
        return tableDoses(drug).map(dose => {
          let flow = '혼합액 입력 필요', concentration = '—';
          try {
            const mix = mixtureForDrug(key, dw);
            const rate = SECore.infusion(dose, drug.unit, dw, mix?.mg, mix?.ml);
            flow = `${round(rate.mlHr,2)} mL/hr`; concentration = `${round(rate.concentration,3)} mg/mL`;
          } catch { /* A missing mixture only affects this drug. */ }
          return `<tr data-drug="${key}" data-dose="${dose}"><td><b>${escapeHtml(drug.label)}</b></td><td>${dose} ${escapeHtml(drug.unit)}</td><td>${round(doseToMgKgHr(drug, dose),3)} mg/kg/hr</td><td>${concentration}</td><td>${flow}</td></tr>`;
        });
      }).join('');
      $('rateTable').innerHTML = `<div class="table-wrap"><table><thead><tr><th>약제</th><th>용량</th><th>mg/kg/hr 환산</th><th>농도</th><th>주입속도</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    function formatBagDuration(hours) {
      if (hours == null) return '— (0 mL/hr)';
      if (hours * 60 < 1) return '1분 미만';
      if (hours > 1000000) return `${round(hours,1)}시간`;
      const minutes = Math.round(hours * 60);
      const wholeHours = Math.floor(minutes / 60), remainder = minutes % 60;
      return `${wholeHours ? wholeHours + '시간' : ''}${remainder ? (wholeHours ? ' ' : '') + remainder + '분' : ''}`;
    }
    function renderFlowMetrics() {
      for (const key of selectedSedatives) {
        const input = $(`${key}Flow`), errorBox = $(`${key}FlowError`);
        if (!input) continue;
        try {
          const dw = selectedWeight('dosingWeight');
          const mix = mixtureForDrug(key, dw);
          const result = SECore.infusionFromFlow(infusionFlows[key], dw, mix?.mg, mix?.ml);
          $(`${key}FlowDose`).textContent = `${round(result.doseMgKgHr,3)} mg/kg/hr${key === 'propofol' ? ` · ${round(result.doseMgKgHr / 0.06,2)} mcg/kg/min` : ''}`;
          $(`${key}DailyFluid`).textContent = `${round(result.dailyVolumeMl,1)} mL/24 hr`;
          $(`${key}BagDuration`).textContent = formatBagDuration(result.bagHours);
          errorBox.classList.add('hidden'); input.removeAttribute('aria-invalid');
        } catch (error) {
          ['FlowDose','DailyFluid','BagDuration'].forEach(suffix => { $(`${key}${suffix}`).textContent = '—'; });
          errorBox.textContent = error.message; errorBox.classList.remove('hidden'); input.setAttribute('aria-invalid', 'true');
        }
      }
    }
    function changeMixMultiplier() {
      const next = Number($('mixMultiplier').value);
      for (const key of Object.keys(infusionFlows)) {
        if (oneTimesFlows[key] == null || (usesAutomaticMix(key) && SEEvidence.preparations[key])) continue;
        try { infusionFlows[key] = String(Number(SECore.flowForMultiplier(oneTimesFlows[key], 1, next).toPrecision(12))); }
        catch { /* Retain an invalid/blank input so that its error remains visible. */ }
      }
      calcSed();
    }
    function usesAutomaticMix(key) { return $('mixtureMode').value === 'auto' && (AUTO_MIX_KEYS.includes(key) || Object.hasOwn(SEEvidence.preparations,key)); }
    function mixtureForDrug(key, dw) {
      if (usesAutomaticMix(key) && SEEvidence.preparations[key]) {
        const state = evidenceSelection(key), prep = SEEvidence.preparations[key];
        if (!prep.concentrations.includes(state.concentration) || !prep.volumes.includes(state.volume)) throw new Error('제제·희석 기준을 다시 선택하세요.');
        return SECore.fixedMixture(state.concentration,state.volume);
      }
      if (usesAutomaticMix(key)) {
        const ml = SECore.positive($('fluidPreset').value, '최종 혼합 부피');
        return { mg: SECore.weightBasedMixture(dw, ml, $('mixMultiplier').value).drugMg, ml };
      }
      if (key === selectedSedatives[0]) return { mg: $('mixMg').value, ml: $('mixMl').value };
      const mix = comparisonMixtures[key];
      const baseMg = SECore.positive(mix?.mg, '1배 총 약물량 (mg)');
      return { mg: baseMg * SECore.positive($('mixMultiplier').value, 'Mix 배수'), ml: mix?.ml };
    }
    function updateMixtureInputs() {
      if (usesAutomaticMix(selectedSedatives[0])) {
        try {
          const mix = mixtureForDrug(selectedSedatives[0], selectedWeight('dosingWeight'));
          $('baseMixMg').value = mix.mg / mixtureFactor(selectedSedatives[0]);
          $('mixMg').value = mix.mg; $('mixMl').value = mix.ml;
        } catch { $('baseMixMg').value = ''; $('mixMg').value = ''; }
        return;
      }
      const raw = $('baseMixMg').value;
      $('mixMg').value = raw === '' ? '' : Number(raw) * Number($('mixMultiplier').value);
    }
    function populate() {
      selectedSedatives = selectedSedatives.filter(k => sedatives[k]);
      if (!selectedSedatives.length) selectedSedatives = Object.keys(sedatives).slice(0, 1);
      const previousPrimary = document.querySelector('#sedativeChecks input:checked')?.value;
      const nextPrimary = selectedSedatives[0];
      if (nextPrimary !== previousPrimary && !usesAutomaticMix(nextPrimary)) {
        const mix = comparisonMixtures[nextPrimary] || { mg: '', ml: '' };
        $('baseMixMg').value = mix.mg; $('mixMl').value = mix.ml;
        $('rateDose').value = sedatives[nextPrimary].quick[0];
      }
      $('sedativeChecks').innerHTML = Object.entries(sedatives).map(([k,v]) => `<label class="drug-chip" style="border-left-color:${v.color || '#1f6fb7'}"><input type="checkbox" value="${k}" ${selectedSedatives.includes(k) ? 'checked' : ''}> ${escapeHtml(v.label)}</label>`).join('');
      $('asmDrug').innerHTML = Object.entries(asms).map(([k,v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`).join('');
      $('warningChecks').innerHTML = warningItems.map(([id,label]) => `<label class="check"><input id="warn_${id}" type="checkbox"> ${escapeHtml(label)}</label>`).join('');
      renderComparisonMixtures(); renderEvidenceControls(); renderEvidenceReferences();
    }
    function renderComparisonMixtures() {
      const keys = selectedSedatives.filter(k => sedatives[k]);
      const automatic = usesAutomaticMix(keys[0]);
      $('primaryManualMixture').classList.toggle('hidden', automatic);
      $('primaryMixtureLabel').classList.toggle('hidden', automatic);
      $('primaryMixtureLabel').textContent = keys.length ? `${sedatives[keys[0]].label} 혼합액 · ${automatic ? '위에서 선택한 자동 혼합액 사용' : '아래 직접 입력 사용'}` : '약제를 선택하세요';
      $('rateDoseLabel').textContent = keys.length ? `${sedatives[keys[0]].label} 추가 환산 용량 (${effectiveSedative(keys[0]).unit})` : '추가 환산 용량';
      $('comparisonMixtures').innerHTML = keys.slice(1).filter(k => !usesAutomaticMix(k)).map(k => {
        const drug = effectiveSedative(k);
        const mix = comparisonMixtures[k] || { mg: '', ml: '' };
        comparisonMixtures[k] = mix;
        return `<div class="drug-note"><b>${escapeHtml(drug.label)} 별도 혼합액</b><div class="row"><div class="field"><label for="compare_${k}_mg">1배 총 약물량 (mg)</label><input id="compare_${k}_mg" type="number" inputmode="decimal" min="0.01" step="any" value="${escapeHtml(mix.mg)}" data-drug="${k}" data-mix="mg"></div><div class="field"><label for="compare_${k}_ml">최종 혼합 부피 (mL)</label><input id="compare_${k}_ml" type="number" inputmode="decimal" min="0.01" step="any" value="${escapeHtml(mix.ml)}" data-drug="${k}" data-mix="ml"></div></div></div>`;
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
      const keys = selectedSedativeKeys();
      if (keys.length) $('rateDoseLabel').textContent = `${sedatives[keys[0]].label} 추가 환산 용량 (${effectiveSedative(keys[0]).unit})`;
      document.querySelector('label[for="mixMultiplier"]').textContent = $('mixtureMode').value === 'auto' ? 'MDZ/Ket mix 배수' : '직접 혼합액 배수 (N)';
      updateMixtureInputs();
      calcBodyMetrics(); calcShooting(); calcAutoMixtures(); renderEvidenceMetrics();
      $('sedNotes').innerHTML = keys.map(k => {
        const drug = effectiveSedative(k);
        return `<div class="drug-note" style="border-left-color:${drug.color || '#1f6fb7'}"><b>${escapeHtml(drug.label)}</b><br>${escapeHtml(drug.notes)}</div>`;
      }).join('');
      let dw, conc, dose, rate;
      try {
        if (!keys.length) throw new Error('계산할 약제를 선택하세요.');
        dw = selectedWeight('dosingWeight');
        dose = SECore.positive($('rateDose').value, 'Rate dose');
        const mix = mixtureForDrug(keys[0], dw);
        rate = SECore.infusion(dose, effectiveSedative(keys[0]).unit, dw, mix?.mg, mix?.ml);
        conc = rate.concentration;
      } catch (error) {
        ['dwOut','concOut','rateOut','rangeOut','unitOut'].forEach(id => { $(id).textContent = '—'; });
        $('sedDoseWarning').textContent = '';
        $('sedQuick').replaceChildren();
        $('sedError').textContent = error.message; $('sedError').classList.remove('hidden');
        return;
      }
      $('sedError').classList.add('hidden');
      const primaryRange = effectiveSedative(keys[0]).table;
      $('sedDoseWarning').textContent = (dose < primaryRange.min || dose > primaryRange.max) && dose !== selectedEvidence(keys[0])?.startDose ? '선택 약제의 표시 범위를 벗어난 입력입니다. 단위와 기관 프로토콜을 확인하세요.' : '';
      $('dwOut').textContent = `${round(dw,1)} kg`;
      $('concOut').textContent = `${round(conc,2)} mg/mL`;
      $('rateOut').textContent = `${round(rate.mlHr,1)} mL/hr`;
      $('rangeOut').textContent = keys.map(k => `${sedatives[k].label}: ${effectiveSedative(k).range}`).join(' · ');
      $('unitOut').textContent = `${dose} ${effectiveSedative(keys[0]).unit}`;
      const activeDrug = effectiveSedative(keys[0]);
      $('sedQuick').innerHTML = activeDrug.quick.map(x => `<button class="pill ${x == dose ? 'active':''}" data-dose="${x}">${activeDrug.label} ${x} ${activeDrug.unit}</button>`).join('');
      $('sedQuick').querySelectorAll('button').forEach(b => b.onclick = () => { $('rateDose').value = b.dataset.dose; calcSed(); });
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
      renderAsmCautions();
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
      $('asmAll').innerHTML = '<div class="table-wrap"><table><thead><tr><th>약제</th><th>기본 용량</th><th>상한</th><th>계산값</th><th>선택 항목 관련 주의</th></tr></thead><tbody>' +
        Object.entries(asms).map(([k,x]) => {
          const defaultDose = x.fixed ? x.fixed[x.fixed.length-1] : x.doses[x.doses.length-1];
          const amount = x.fixed ? defaultDose : defaultDose * dw;
          const flags = cautionsForAsm(k);
          return `<tr data-asm="${k}" class="${flags.length ? 'asm-caution-row' : ''}"><td><b>${escapeHtml(x.label)}</b>${flags.length ? '<span class="caution-badge">⚠ 주의</span>' : ''}</td><td>${x.fixed ? defaultDose + ' ' + x.unit : defaultDose + ' ' + x.unit + '/kg'}</td><td>${x.max} ${x.unit}</td><td>${round(Math.min(amount, x.max),0)} ${x.unit}</td><td>${flags.length ? flags.map(flag => `<div><b>${escapeHtml(flag.label)}</b><br>${escapeHtml(flag.message)}</div>`).join('<br>') : '자동 연결 항목 없음'}</td></tr>`;
        }).join('') + '</tbody></table></div>';
    }
    function calcWarnings() {
      const active = activeWarnings();
      $('warningOutput').innerHTML = active.length ? active.map(([,label,msg]) => `<div class="note warn"><b>${escapeHtml(label)}</b><br>${escapeHtml(msg)}</div><br>`).join('') : '<div class="note">선택한 주의사항이 없습니다.</div>';
      calcAsm();
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
      $('mixMl').addEventListener('input', calcSed);
      $('mixtureMode').addEventListener('change', () => { renderComparisonMixtures(); renderEvidenceControls(); if (SEEvidence.profiles[selectedSedatives[0]]) $('rateDose').value = effectiveSedative(selectedSedatives[0]).quick[0]; calcSed(); });
      ['wt','ht','sex','dosingWeight','baseMixMg','rateDose'].forEach(id => $(id).addEventListener('input', calcSed));
      $('mixMultiplier').addEventListener('input', changeMixMultiplier);
      $('scaledMixResults').addEventListener('input', event => {
        const key = event.target.dataset.flowDrug;
        if (!sedatives[key]) return;
        infusionFlows[key] = event.target.value;
        try { oneTimesFlows[key] = SECore.flowForMultiplier(infusionFlows[key], mixtureFactor(key), 1); }
        catch { oneTimesFlows[key] = null; }
        renderFlowMetrics();
      });
      $('sedativeChecks').addEventListener('change', () => {
        const oldPrimary = selectedSedatives[0];
        if (oldPrimary) comparisonMixtures[oldPrimary] = { mg: $('baseMixMg').value, ml: $('mixMl').value };
        selectedSedativeKeys();
        const primary = selectedSedatives[0];
        if (primary && primary !== oldPrimary) {
          const mix = comparisonMixtures[primary] || { mg: '', ml: '' };
          $('baseMixMg').value = mix.mg;
          $('mixMl').value = mix.ml;
          $('rateDose').value = effectiveSedative(primary).quick[0];
        }
        renderComparisonMixtures(); renderEvidenceControls(); calcSed();
      });
      $('comparisonMixtures').addEventListener('input', event => {
        if (!event.target.dataset.drug) return;
        comparisonMixtures[event.target.dataset.drug][event.target.dataset.mix] = event.target.value;
        calcSed();
      });
      $('evidenceControls').addEventListener('change', event => {
        const key = event.target.dataset.evidenceKey, field = event.target.dataset.evidenceField;
        if (!SEEvidence.profiles[key]) return;
        const state = evidenceSelection(key);
        if (field === 'profile') {
          const profile = SEEvidence.profiles[key].find(p => p.id === event.target.value);
          if (!profile) return;
          Object.assign(state,{ profile: profile.id, dose: profile.defaultDose, load: profile.defaultLoad });
          if (key === selectedSedatives[0]) $('rateDose').value = profile.defaultDose;
          renderEvidenceControls();
        } else if (['dose','load','concentration','volume'].includes(field)) {
          const profile = selectedEvidence(key), prep = SEEvidence.preparations[key];
          const values = { dose: profile.doses, load: profile.loads, concentration: prep.concentrations, volume: prep.volumes }[field];
          const value = Number(event.target.value);
          if (!values.includes(value)) return;
          if (field === 'concentration') {
            const previous = state.concentration;
            try { infusionFlows[key] = String(Number((SECore.flowForMultiplier(infusionFlows[key],previous,value)).toPrecision(12))); oneTimesFlows[key] = Number(infusionFlows[key]); } catch { /* Leave invalid flow for validation. */ }
          }
          state[field] = value;
        }
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
