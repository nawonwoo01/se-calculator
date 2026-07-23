    const $ = (id) => document.getElementById(id);
    const STORAGE_KEY = 'se-calculator-admin-config-v1';
    const PATIENT_STORAGE_KEY = 'se-calculator-patient-profiles-v1';
    const round = (n, d = 1) => Number.isFinite(n) ? n.toFixed(d).replace(/\\.0$/, '') : '-';
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
    let selectedSedatives = ['midazolam', 'ketamine', 'propofol'];
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
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (!saved) return;
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
      try {
        const saved = JSON.parse(localStorage.getItem(PATIENT_STORAGE_KEY) || 'null');
        patientProfiles = Array.isArray(saved?.profiles) ? saved.profiles : [];
        activePatientId = saved?.activePatientId || '';
      } catch (error) {
        console.warn('Patient profile load failed', error);
        patientProfiles = [];
        activePatientId = '';
      }
    }
    function savePatientStore() {
      localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify({ profiles: patientProfiles, activePatientId }));
    }
    function readPatientForm() {
      return {
        id: activePatientId || `p_${Date.now()}`,
        name: $('patientName').value.trim() || `Patient ${patientProfiles.length + 1}`,
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
        .sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        .map(p => `<option value="${p.id}">${p.name} · ${p.wt || '-'} kg · ${p.ht || '-'} cm</option>`)
        .join('');
      $('patientSelect').value = patientProfiles.some(p => p.id === activePatientId) ? activePatientId : '';
      $('deletePatient').disabled = !$('patientSelect').value;
    }
    function applyPatientProfile(id) {
      const profile = patientProfiles.find(p => p.id === id);
      activePatientId = profile ? profile.id : '';
      if (!profile) {
        $('patientName').value = '';
        renderPatientProfiles();
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
    }
    function savePatientProfile() {
      const profile = readPatientForm();
      const idx = patientProfiles.findIndex(p => p.id === profile.id);
      if (idx >= 0) patientProfiles[idx] = profile;
      else patientProfiles.push(profile);
      activePatientId = profile.id;
      savePatientStore();
      renderPatientProfiles();
      applyPatientProfile(profile.id);
    }
    function deletePatientProfile() {
      const id = $('patientSelect').value;
      if (!id) return;
      patientProfiles = patientProfiles.filter(p => p.id !== id);
      activePatientId = '';
      $('patientName').value = '';
      savePatientStore();
      renderPatientProfiles();
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
      try {
        sedatives = JSON.parse($('sedativeConfig').value);
        asms = JSON.parse($('asmConfig').value);
        evidenceText = $('evidenceConfig').value.trim() || defaultConfig.evidenceText;
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
      localStorage.removeItem(STORAGE_KEY);
      sedatives = JSON.parse(JSON.stringify(defaultConfig.sedatives));
      asms = JSON.parse(JSON.stringify(defaultConfig.asms));
      warningItems = JSON.parse(JSON.stringify(defaultConfig.warningItems));
      evidenceText = defaultConfig.evidenceText;
      selectedSedatives = ['midazolam', 'ketamine', 'propofol'];
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
      try {
        const imported = JSON.parse($('importConfig').value);
        if (!imported.sedatives || !imported.asms) throw new Error('sedatives and asms are required');
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
      const wt = +$('wt').value || 0, ht = +$('ht').value || 0, sex = $('sex').value;
      const inches = ht / 2.54;
      const ibw = Math.max(0, (sex === 'male' ? 50 : 45.5) + 2.3 * (inches - 60));
      const lbw = sex === 'male' ? (9270 * wt) / (6680 + 216 * (wt / ((ht/100)**2))) : (9270 * wt) / (8780 + 244 * (wt / ((ht/100)**2)));
      const adj = wt > ibw ? ibw + 0.4 * (wt - ibw) : wt;
      return { actual: wt, ibw, lbw, adj };
    }
    function selectedWeight(id) { const w = weights(); return w[$(id).value] || w.actual; }
    function updateMixtureInputs() {
      if ($('fluidPreset').value !== 'custom') $('mixMl').value = $('fluidPreset').value;
      const base = +$('baseMixMg').value || 0;
      const multiplier = +$('mixMultiplier').value || 1;
      $('mixMg').value = round(base * multiplier, 1);
    }
    function populate() {
      selectedSedatives = selectedSedatives.filter(k => sedatives[k]);
      if (!selectedSedatives.length) selectedSedatives = Object.keys(sedatives).slice(0, 1);
      $('sedativeChecks').innerHTML = Object.entries(sedatives).map(([k,v]) => `<label class="drug-chip" style="border-left-color:${v.color || '#1f6fb7'}"><input type="checkbox" value="${k}" ${selectedSedatives.includes(k) ? 'checked' : ''}> ${v.label}<span class="small">${v.range}</span></label>`).join('');
      $('asmDrug').innerHTML = Object.entries(asms).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
      $('warningChecks').innerHTML = warningItems.map(([id,label]) => `<label class="check"><input id="warn_${id}" type="checkbox"> ${label}</label>`).join('');
    }
    function selectedSedativeKeys() {
      const checked = Array.from(document.querySelectorAll('#sedativeChecks input:checked')).map(el => el.value);
      selectedSedatives = checked.length ? checked : selectedSedatives.filter(k => sedatives[k]);
      return selectedSedatives.length ? selectedSedatives : Object.keys(sedatives).slice(0, 1);
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
      const keys = selectedSedativeKeys(), dw = selectedWeight('dosingWeight'), conc = (+$('mixMg').value || 0) / (+$('mixMl').value || 1);
      let dose = +$('rateDose').value || 0;
      $('dwOut').textContent = `${round(dw,1)} kg`;
      $('concOut').textContent = `${round(conc,2)} mg/mL`;
      $('rateOut').textContent = `${keys.length} selected`;
      $('loadOut').textContent = keys.map(k => `${sedatives[k].label}: ${round(sedatives[k].load * dw,1)} mg`).join(' · ');
      $('rangeOut').textContent = keys.map(k => `${sedatives[k].label}: ${sedatives[k].range}`).join(' · ');
      $('unitOut').textContent = 'see table';
      const activeDrug = sedatives[keys[0]];
      $('sedQuick').innerHTML = activeDrug.quick.map(x => `<button class="pill ${x == dose ? 'active':''}" data-dose="${x}">${activeDrug.label} ${x} ${activeDrug.unit}</button>`).join('');
      $('sedQuick').querySelectorAll('button').forEach(b => b.onclick = () => { $('rateDose').value = b.dataset.dose; calcSed(); });
      const rows = keys.flatMap(k => {
        const drug = sedatives[k];
        return tableDoses(drug).map(x => {
          const mgkg = doseToMgKgHr(drug, x);
          return `<tr><td style="border-left:6px solid ${drug.color || '#1f6fb7'}"><b>${drug.label}</b></td><td>${x} ${drug.unit}</td><td>${round(mgkg,2)} mg/kg/hr</td><td>${round(mgkg * dw / conc,1)} mL/hr</td></tr>`;
        });
      }).join('');
      $('rateTable').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Drug</th><th>Dose</th><th>mg/kg/hr equivalent</th><th>Infusion rate</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      $('sedNotes').innerHTML = keys.map(k => {
        const drug = sedatives[k];
        return `<div class="drug-note" style="border-left-color:${drug.color || '#1f6fb7'}"><b>${drug.label}</b><br>${drug.notes}</div>`;
      }).join('');
    }
    function updateAsmDoseOptions() {
      const d = asms[$('asmDrug').value];
      const opts = d.fixed ? d.fixed.map(x => `<option value="fixed:${x}">${x} ${d.unit}</option>`) : d.doses.map(x => `<option value="kg:${x}">${x} mg/kg</option>`);
      $('asmDose').innerHTML = opts.join('');
      $('asmMinutes').value = d.minutes;
      calcAsm();
    }
    function calcAsm() {
      const d = asms[$('asmDrug').value], dw = selectedWeight('asmWeight');
      const [kind, raw] = $('asmDose').value.split(':');
      const val = +raw;
      const uncapped = kind === 'fixed' ? val : val * dw;
      const capped = Math.min(uncapped, d.max);
      const mins = +$('asmMinutes').value || d.minutes;
      $('asmDoseOut').textContent = kind === 'fixed' ? `${val} ${d.unit}` : `${val} mg/kg`;
      $('asmLoadOut').textContent = `${round(capped,0)} ${d.unit}`;
      $('asmRateOut').textContent = `${round(capped / mins,1)} ${d.unit}/min`;
      $('asmNote').textContent = d.note;
      $('asmAll').innerHTML = '<table><thead><tr><th>Drug</th><th>Default</th><th>Max</th><th>Calculated</th></tr></thead><tbody>' +
        Object.entries(asms).map(([k,x]) => {
          const defaultDose = x.fixed ? x.fixed[x.fixed.length-1] : x.doses[x.doses.length-1];
          const amount = x.fixed ? defaultDose : defaultDose * dw;
          return `<tr><td>${x.label}</td><td>${x.fixed ? defaultDose + ' ' + x.unit : defaultDose + ' mg/kg'}</td><td>${x.max} ${x.unit}</td><td>${round(Math.min(amount, x.max),0)} ${x.unit}</td></tr>`;
        }).join('') + '</tbody></table>';
    }
    function calcWarnings() {
      const active = warningItems.filter(([id]) => $(`warn_${id}`)?.checked);
      $('warningOutput').innerHTML = active.length ? active.map(([,label,msg]) => `<div class="note warn"><b>${label}</b><br>${msg}</div><br>`).join('') : '<div class="note">No warning flag selected.</div>';
    }
    function calcScores() {
      const select = +$('selectNihss').value + ($('selectLaa').checked?1:0) + ($('selectEarly').checked?3:0) + ($('selectCortical').checked?2:0) + ($('selectMca').checked?1:0);
      const cave = ['caveCortical','caveAge','caveVolume','caveEarly'].reduce((s,id)=>s+($(id).checked?1:0),0);
      const stess = ($('stessAge').checked?2:0) + ($('stessNoHx').checked?1:0) + (+$('stessType').value) + (+$('stessCon').value);
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
      $('fluidPreset').addEventListener('change', calcSed);
      $('mixMl').addEventListener('input', () => { $('fluidPreset').value = 'custom'; calcSed(); });
      ['wt','ht','sex','dosingWeight','baseMixMg','mixMultiplier','rateDose'].forEach(id => $(id).addEventListener('input', calcSed));
      $('sedativeChecks').addEventListener('change', calcSed);
      $('asmDrug').addEventListener('change', updateAsmDoseOptions);
      ['asmDose','asmMinutes','asmWeight','wt','ht','sex'].forEach(id => $(id).addEventListener('input', calcAsm));
      $('warningChecks').addEventListener('change', calcWarnings);
      document.querySelectorAll('#scores input,#scores select').forEach(el => el.addEventListener('input', calcScores));
      if ('serviceWorker' in navigator && location.protocol !== 'file:') registerServiceWorker();
    }
    function registerServiceWorker() {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((registration) => {
        registration.update();
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch((error) => console.warn('Service worker registration failed', error));
    }
    loadConfig(); loadPatientStore(); populate(); updateAsmDoseOptions(); bind(); renderAdmin(); renderPatientProfiles(); if (activePatientId) applyPatientProfile(activePatientId); calcSed(); calcAsm(); calcWarnings(); calcScores();
