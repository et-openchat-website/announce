let regionsData = {};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('targetDate').valueAsDate = new Date();
  await loadAllConfig();
  toggleRegionSelect();

  // イベントリスナー設定
  document.getElementById('regionType').addEventListener('change', toggleRegionSelect);
  document.getElementById('btnGenerate').addEventListener('click', generateText);

  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => copyToClipboard(e.target.dataset.target));
  });

  document.querySelectorAll('.btn-line').forEach(btn => {
    btn.addEventListener('click', (e) => shareToLine(e.target.dataset.target));
  });

  // モーダル閉じるイベント
  document.getElementById('modalCloseBtn').addEventListener('click', hideModal);
  document.getElementById('customModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('customModal')) hideModal();
  });
});

/* モーダル表示制御関数 */
function showModal(message, icon = "✅") {
  document.getElementById('modalIcon').textContent = icon;
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('customModal').classList.remove('hidden');
}

function showErrorModal(message) {
  showModal(message, "⚠️");
}

function hideModal() {
  document.getElementById('customModal').classList.add('hidden');
}

async function loadAllConfig() {
  try {
    const [rTypes, rGeneral, rDetail, rPref, rRiver, conds, tokubetsu, shindo, statuses] = await Promise.all([
      fetch('data/region_types.json').then(r => r.json()),
      fetch('data/regions_general.json').then(r => r.json()),
      fetch('data/regions_detail.json').then(r => r.json()),
      fetch('data/regions_prefecture.json').then(r => r.json()),
      fetch('data/regions_river.json').then(r => r.json()),
      fetch('data/conditions.json').then(r => r.json()),
      fetch('data/tokubetsu_types.json').then(r => r.json()),
      fetch('data/shindo_types.json').then(r => r.json()),
      fetch('data/statuses.json').then(r => r.json())
    ]);

    regionsData = {
      region: rGeneral,
      detail_region: rDetail,
      prefecture: rPref,
      river: rRiver
    };

    // 対象地域の種類
    const rTypeSelect = document.getElementById('regionType');
    rTypeSelect.innerHTML = rTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('');

    // 発令種別
    const condContainer = document.getElementById('conditionGroup');
    condContainer.innerHTML = conds.map(c => {
      let handler = '';
      if (c.hasSub === 'tokubetsu') handler = 'data-sub="tokubetsu"';
      else if (c.hasSub === 'jishin') handler = 'data-sub="jishin"';
      else if (c.hasSub === 'other') handler = 'data-sub="other"';
      return `<label class="chip"><input type="checkbox" id="${c.id}" ${handler}><span>${c.label}</span></label>`;
    }).join('');

    // サブオプションの連動イベント設定
    document.getElementById('checkTokubetsu')?.addEventListener('change', toggleTokubetsuOptions);
    document.getElementById('checkJishin')?.addEventListener('change', toggleJishinOptions);
    document.getElementById('checkOther')?.addEventListener('change', toggleOtherOption);

    // 特別警報の種別
    document.getElementById('tokubetsuGroup').innerHTML = tokubetsu.map(t =>
      `<label class="chip"><input type="checkbox" class="tokubetsu-detail" value="${t}"><span>${t.replace('特別警報', '')}</span></label>`
    ).join('');

    // 最大震度
    document.getElementById('shindoSelect').innerHTML = shindo.map(s => `<option value="${s}">${s}</option>`).join('');

    // 状態
    document.getElementById('statusGroup').innerHTML = statuses.map(s =>
      `<label class="chip"><input type="checkbox" class="status-check" value="${s}"><span>${s}</span></label>`
    ).join('');

  } catch (err) {
    showErrorModal("JSONデータの読み込みに失敗しました。`data/` フォルダ内の各ファイル構成を確認してください。");
  }
}

function toggleRegionSelect() {
  const type = document.getElementById('regionType').value;
  const selectElem = document.getElementById('regionSelect');
  const customInput = document.getElementById('customRegionInput');

  selectElem.innerHTML = '';

  if (type === 'custom') {
    selectElem.classList.add('hidden');
    customInput.classList.remove('hidden');
    return;
  }
  selectElem.classList.remove('hidden');
  customInput.classList.add('hidden');

  const data = regionsData[type];
  if (!data) return;

  if (Array.isArray(data)) {
    data.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item; opt.textContent = item;
      selectElem.appendChild(opt);
    });
  } else {
    for (const [group, list] of Object.entries(data)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group;
      list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = (type === 'river') ? item + "流域" : item;
        opt.textContent = item;
        optgroup.appendChild(opt);
      });
      selectElem.appendChild(optgroup);
    }
  }
}

function toggleTokubetsuOptions() {
  const check = document.getElementById('checkTokubetsu');
  const opt = document.getElementById('tokubetsuOptions');
  if (check && opt) {
    opt.classList.toggle('hidden', !check.checked);
    if (!check.checked) opt.classList.remove('has-error');
  }
}

function toggleJishinOptions() {
  const check = document.getElementById('checkJishin');
  const opt = document.getElementById('jishinOptions');
  if (check && opt) opt.classList.toggle('hidden', !check.checked);
}

function toggleOtherOption() {
  const check = document.getElementById('checkOther');
  const opt = document.getElementById('otherOption');
  const input = document.getElementById('otherInput');
  if (check && opt && input) {
    opt.classList.toggle('hidden', !check.checked);
    if (!check.checked) {
      opt.classList.remove('has-error');
      input.classList.remove('has-error');
    }
  }
}

function formatDate(dateString) {
  if (!dateString) return "令和y年mm月dd日";
  const date = new Date(dateString);
  return `令和${date.getFullYear() - 2018}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function clearErrors() {
  document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
}

function generateText() {
  clearErrors();

  const dateValue = document.getElementById('targetDate').value;
  const regionType = document.getElementById('regionType').value;
  let region = (regionType === 'custom')
    ? document.getElementById('customRegionInput').value.trim()
    : document.getElementById('regionSelect').value;

  let firstErrorElem = null;

  if (!dateValue) {
    document.getElementById('groupDate').classList.add('has-error');
    firstErrorElem = firstErrorElem || document.getElementById('groupDate');
  }

  if (!region) {
    document.getElementById('groupRegion').classList.add('has-error');
    firstErrorElem = firstErrorElem || document.getElementById('groupRegion');
  }

  let conditions = [];
  let isConditionError = false;

  const checkTokubetsu = document.getElementById('checkTokubetsu');
  if (checkTokubetsu && checkTokubetsu.checked) {
    const selected = Array.from(document.querySelectorAll('.tokubetsu-detail:checked')).map(cb => cb.value);
    if (selected.length > 0) {
      conditions.push(selected.join('および'));
    } else {
      const opt = document.getElementById('tokubetsuOptions');
      opt.classList.add('has-error');
      firstErrorElem = firstErrorElem || opt;
      isConditionError = true;
    }
  }

  if (document.getElementById('checkAnzen')?.checked) conditions.push("緊急安全確保");

  if (document.getElementById('checkJishin')?.checked) {
    conditions.push(`最大震度${document.getElementById('shindoSelect').value}の地震`);
  }

  if (document.getElementById('checkOotsunami')?.checked) conditions.push("大津波警報");
  if (document.getElementById('checkTsunami')?.checked) conditions.push("津波警報");
  if (document.getElementById('checkNankai')?.checked) conditions.push("南海トラフ地震臨時情報");
  if (document.getElementById('checkSanriku')?.checked) conditions.push("北海道・三陸沖後発地震注意情報");

  if (document.getElementById('checkOther')?.checked) {
    const otherVal = document.getElementById('otherInput').value.trim();
    if (otherVal) {
      conditions.push(otherVal);
    } else {
      document.getElementById('otherOption').classList.add('has-error');
      firstErrorElem = firstErrorElem || document.getElementById('otherOption');
      isConditionError = true;
    }
  }

  if (conditions.length === 0 && !isConditionError) {
    document.getElementById('groupCondition').classList.add('has-error');
    firstErrorElem = firstErrorElem || document.getElementById('groupCondition');
  }

  const selectedStatuses = Array.from(document.querySelectorAll('.status-check:checked')).map(cb => cb.value);
  if (selectedStatuses.length === 0) {
    document.getElementById('groupStatus').classList.add('has-error');
    firstErrorElem = firstErrorElem || document.getElementById('groupStatus');
  }

  if (firstErrorElem) {
    firstErrorElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showErrorModal("未選択・未入力の項目があります");
    return;
  }

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const dateStr = formatDate(dateValue);
  const conditionText = conditions.join('および');
  const statusText = selectedStatuses.join('/');

  if (mode === "禁止") {
    document.getElementById('mainResult').value = `⚠️副官以外の情報提供の禁止⚠️\n\n${dateStr}、${region}において${conditionText}が${statusText}されました。\n\nつきましては、今後は副官による情報提供のみとし、副官以外の情報提供はお控えくださいますようお願いいたします。`;
    document.getElementById('chatResult').value = `⚠️メイントークルームにおける副官以外の情報提供の禁止⚠️\n\n${dateStr}、${region}において${conditionText}が${statusText}されました。\n\nつきましては、今後はメイントークルームにおける副官による情報提供のみとし、副官以外の情報提供はお控えくださいますようお願いいたします。`;
  } else {
    document.getElementById('mainResult').value = `🟩副官以外の情報提供の禁止の解除🟩\n\n${dateStr}、${region}に${statusText}されておりました${conditionText}に伴う「副官以外の情報提供の禁止措置」につきまして、状況の改善を確認したため解除いたします。\n\nこれより通常どおり情報提供を行っていただいて構いません。\n\nなお、引き続き災害情報や緊急情報の共有にご協力いただき、混乱を招く恐れのある情報の拡散にはご注意ください。\n\nご協力ありがとうございました。`;
    document.getElementById('chatResult').value = `🟩メイントークルームにおける副官以外の情報提供の禁止の解除🟩\n\n${dateStr}、${region}に${statusText}されておりました${conditionText}に伴う「メイントークルームにおける副官以外の情報提供の禁止措置」につきまして、状況の改善を確認したため解除いたします。\n\nこれより通常どおり情報提供を行っていただいて構いません。\n\nなお、引き続き災害情報や緊急情報の共有にご協力いただき、混乱を招く恐れのある情報の拡散にはご注意ください。\n\nご協力ありがとうございました。`;
  }
}

function copyToClipboard(elementId) {
  const textarea = document.getElementById(elementId);
  if (!textarea || !textarea.value) {
    showErrorModal("文言が生成されていません");
    return;
  }
  navigator.clipboard.writeText(textarea.value)
    .then(() => showModal("クリップボードにコピーしました！"))
    .catch(() => showErrorModal("コピーに失敗しました"));
}

function shareToLine(elementId) {
  const textarea = document.getElementById(elementId);
  if (!textarea || !textarea.value) {
    showErrorModal("文言が生成されていません");
    return;
  }
  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(textarea.value)}`, '_blank');
}
