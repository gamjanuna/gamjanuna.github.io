// 판매 페이지(qssok.com/buy/) — 시안 v272를 옮긴 것. 화면은 다시 읽지 않고 갈아 끼운다.
// ⛔ 지금은 「심사용 시험 결제」만 연다(대표 11-09, 포트원 전자결제 심사 11-17): 포트원 테스트 채널(KG이니시스 공용 MID)로
//    결제창만 열고 우리 결제 서버(worker/pay)는 부르지 않는다 → 정식판이 나갈 길이 없다(security 11-09 ㉡).
//    테스트 승인은 그날 자정쯤 자동 취소된다(포트원 답 11-09). 실제 결제를 열 때 이 파일의 TEST 묶음을 걷어내고 /pay/order·/pay/confirm을 잇는다.
// ⛔ 시안의 검사용 장치(화면 바로 가기·예시 값·자동 클릭)는 옮기지 않는다 — 남으면 qssok.com 주소로 가짜 「결제 완료」를 띄울 수 있다(security 11-09).
// ⛔ 주소·결제창에서 돌아온 값은 글자로만 넣는다(esc/textContent).
'use strict';
const SDK = 'https://cdn.portone.io/v2/browser-sdk.js';
const TEST = {   // 포트원 콘솔 › 결제 연동 › 연동 관리 › 테스트 채널 「큐쏙 시험」 — 비밀값 아님(결제창에 넘기는 공개 값)
  storeId: 'store-a36ecae1-4cef-4ba3-877a-c9d970fd0ec7',
  channelKey: 'channel-key-7d5447bd-16c7-4335-bc5c-a3c579f82c7c',
  // 시험 결제라 실제 개인정보가 포트원·결제사로 가지 않게 미리 채운다(legal 11-09 — 처리방침에 아직 이름·휴대폰이 없다)
  machine: 'TESTPAY234', name: '시험결제', phone: '01000000000', email: 'test@qssok.com',
};
const SVG = {
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>',
  spin: '<svg class="spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
};
const P = {
  open3: { title: '<span class="open">오픈 기념</span>첫 3개월', name: '큐쏙 정식판 1개월 이용권 (오픈 기념)', amount: 29700, base: '27,000원', vat: '2,700원', pay: '29,700원', price: '월 27,000원 (VAT 별도, 최종 결제 금액 29,700원)', cond: '이번 결제: 1개월분 · 결제가 열린 날부터 2027년 1월 31일까지 첫 결제 · 첫 결제 포함 3개월' },
  monthly: { title: '매달 결제', name: '큐쏙 정식판 1개월 이용권', amount: 39600, base: '36,000원', vat: '3,600원', pay: '39,600원', price: '월 36,000원 (VAT 별도, 최종 결제 금액 39,600원)', cond: '이번 결제: 1개월분 · 한 달씩 직접 결제' },
};
const MAIL = 'contact@danbilab.com', NOPAID = '결제되지 않았습니다.';
const $ = (id) => document.getElementById(id);
const esc = (t) => { const d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; };
let product = 'open3';
// 결제 방법은 이니시스 결제창 안에서 고른다(카드사·카카오페이·네이버페이 등이 한 창에 나온다) — 대표 11-09.
// 「간편결제」로 따로 부르면 이니시스 V2는 결제사를 미리 정하라며 거절한다(11-09 실측).
const PAY_METHOD = 'CARD';

const links = document.querySelector('#shop .links'), foot = document.querySelector('#shop footer');
document.querySelectorAll('.tail').forEach((t) => t.append(links.cloneNode(true), foot.cloneNode(true)));
document.querySelectorAll('.tail footer').forEach((f) => { f.innerHTML = '<span class="ln">상호 단비 · 대표 이단비 · 사업자등록번호 622-42-01304</span><span class="ln">주소 경상북도 구미시 산호대로25길 41, 204동 7층 5호(옥계동, 부영아파트2차)</span><span class="ln">전화 070-8064-3798 · contact@danbilab.com · 통신판매업 신고 준비 중</span><span class="ln">소비자 피해 보상과 분쟁 처리는 공정거래위원회 소비자분쟁해결기준을 따릅니다.</span><span class="ln">호스팅 제공자 GitHub · 큐쏙(Qssok)™ © 2026</span>'; });
['400', '700'].forEach((w) => document.fonts?.load(`${w} 13.5px "IBM Plex Sans KR"`, document.body.innerText));

function show(id) {
  ['shop', 'pay', 'done'].forEach((k) => ($(k).hidden = k !== id));
  document.body.classList.toggle('narrow', id !== 'shop');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
document.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => toPay(b.dataset.buy, true)));

document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-copy]');
  if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => { c.dataset.label ??= c.textContent; c.textContent = '복사됨'; clearTimeout(c._t); c._t = setTimeout(() => { c.textContent = c.dataset.label; }, 500); }); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === '요금제로 돌아가기') show('shop');
});

// ── 결제 화면 ──
const MACHINE = /^[2-9A-HJ-NP-Z]{10}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (v) => v.replace(/\s+/g, '').toUpperCase();
function setProduct(id) {
  product = id; const p = P[id];
  $('itName').innerHTML = p.title; $('itPrice').innerHTML = p.price.replace(/^월 ([\d,]+원) (\(.*\))$/, '월 <b>$1</b> <small>$2</small>'); $('itCond').textContent = p.cond;
  $('sBase').textContent = p.base; $('sVat').textContent = p.vat; $('sTotal').textContent = p.pay; $('bName').textContent = '[시험] ' + p.name;   // 결제창 주문명과 같게
  unlock();
}
function unlock() { const b = $('payBtn'); b.disabled = false; b.textContent = P[product].pay + ' 시험 결제하기'; $('toCards').disabled = false; $('left').disabled = false; }
function brief() { // 단추 바로 위 — 맞게 넣었을 때만 값을 보인다
  const a = norm($('m1').value), b = norm($('m2').value), e = $('em').value.trim();
  const mOk = MACHINE.test(a) && a === b, eOk = EMAIL.test(e);
  $('bM').textContent = mOk ? a : '입력 전'; $('bM').className = mOk ? 'mono' : 'empty';
  $('bE').textContent = eOk ? e : '입력 전'; $('bE').className = eOk ? '' : 'empty';
}
['m1', 'm2', 'em'].forEach((i) => $(i).addEventListener('input', brief));
function setSlots() {
  const m = $('mSlot'), e = $('eSlot'), a = $('aSlot');
  m.className = 'slot stack'; e.className = 'slot stack'; a.className = 'slot';
  m.innerHTML = '<span class="s-help">시험 결제라 시험용 컴퓨터 번호를 넣어 두었고, 바꿀 수 없습니다.</span><span class="s-err"></span>';
  e.innerHTML = '<span class="s-help">시험 결제라 시험용 이름·휴대폰 번호·이메일을 넣어 두었고, 바꿀 수 없습니다.</span><span class="s-err"></span>';
  $('nSlot').className = $('pSlot').className = 'slot'; $('nSlot').textContent = $('pSlot').textContent = '';
  a.textContent = ''; $('allHint').hidden = false;
}
function slotErr(el, msg) {
  if (el.classList.contains('stack')) { el.classList.add('bad'); el.querySelector('.s-err').innerHTML = SVG.warn + `<span>${esc(msg)}</span>`; }
  else { el.className = 'slot bad'; el.innerHTML = SVG.warn + `<span>${esc(msg)}</span>`; }
}
function fillTest() {   // 시험 결제 — 칸을 시험 값으로 잠근다
  [['m1', TEST.machine], ['m2', TEST.machine], ['nm', TEST.name], ['ph', TEST.phone], ['em', TEST.email]].forEach(([id, v]) => { $(id).value = v; $(id).readOnly = true; });
}
function toPay(id, fresh) {
  if (fresh) history.pushState({ pay: 1 }, '', '#pay');
  show('pay'); setProduct(id); fillTest(); setSlots(); brief();
  document.querySelectorAll('#left [aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
  document.querySelectorAll('.ag.miss').forEach((a) => a.classList.remove('miss'));
}
$('toCards').onclick = () => { show('shop'); if (location.hash === '#pay') history.back(); };
addEventListener('popstate', () => { if (!$('pay').hidden) show('shop'); });
$('noIdBtn').onclick = (e) => { const n = $('noId'); n.hidden = !n.hidden; e.target.setAttribute('aria-expanded', String(!n.hidden)); };

// 전체 동의 — 개별 칸의 실제 상태와 맞물린다
const items = () => [...document.querySelectorAll('.ag input')];
$('agAll').onchange = (e) => { items().forEach((c) => (c.checked = e.target.checked)); document.querySelectorAll('.ag.miss').forEach((g) => g.classList.remove('miss')); if (e.target.checked) { $('aSlot').className = 'slot'; $('aSlot').textContent = ''; $('allHint').hidden = false; } };
items().forEach((c) => (c.onchange = () => { $('agAll').checked = items().every((x) => x.checked); if (c.checked) c.closest('.ag').classList.remove('miss'); }));

function validate() {
  const a = norm($('m1').value), b = norm($('m2').value), em = $('em').value.trim();
  const e1 = !a ? '컴퓨터 번호를 입력해 주세요.' : a.length !== 10 ? `번호는 10자리입니다(지금 ${a.length}자리).` : !MACHINE.test(a) ? '0, 1, I, O는 번호에 없는 글자입니다.' : '';
  const e2 = e1 ? '' : !b ? '번호를 한 번 더 입력해 주세요.' : a !== b ? '두 칸의 번호가 다릅니다.' : '';
  const nm = $('nm').value.trim(), ph = $('ph').value.replace(/[\s-]/g, '');
  const e4 = !nm ? '이름을 입력해 주세요.' : '', e5 = !ph ? '휴대폰 번호를 입력해 주세요.' : !/^01\d{8,9}$/.test(ph) ? '휴대폰 번호를 확인해 주세요.' : '';
  const e3 = !em ? '이메일을 입력해 주세요.' : !EMAIL.test(em) ? '이메일 주소를 확인해 주세요.' : '';
  setSlots();
  $('m1').toggleAttribute('aria-invalid', !!e1); $('m2').toggleAttribute('aria-invalid', !!e2); $('em').toggleAttribute('aria-invalid', !!e3); $('nm').toggleAttribute('aria-invalid', !!e4); $('ph').toggleAttribute('aria-invalid', !!e5);
  if (e4) slotErr($('nSlot'), e4);
  if (e5) slotErr($('pSlot'), e5);
  if (e1 || e2) slotErr($('mSlot'), e1 || e2);
  if (e3) slotErr($('eSlot'), e3);
  let miss = false;
  document.querySelectorAll('.ag').forEach((g) => { const m = !g.querySelector('input').checked; g.classList.toggle('miss', m); if (m) miss = true; });
  if (miss) { $('allHint').hidden = true; slotErr($('aSlot'), '필수 3개에 모두 체크해 주세요.'); }
  const first = e1 ? $('m1') : e2 ? $('m2') : e4 ? $('nm') : e5 ? $('ph') : e3 ? $('em') : miss ? $('agAll') : null;
  if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: 'instant' }); return false; }
  return true;
}
function paying(text) { const b = $('payBtn'); b.disabled = true; b.innerHTML = SVG.spin + `<span>${esc(text)}</span>`; $('toCards').disabled = true; $('left').disabled = true; }

// 포트원 결제창 코드는 단추를 누를 때만 불러온다 — 페이지를 열기만 해서는 포트원에 접속하지 않는다(legal 11-09)
let sdkP = null;
function loadSdk() {
  if (window.PortOne) return Promise.resolve();
  sdkP ??= new Promise((ok, no) => { const s = document.createElement('script'); s.src = SDK; s.onload = ok; s.onerror = () => { sdkP = null; s.remove(); no(new Error('sdk')); }; document.head.append(s); });
  return sdkP;
}
const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const PID = /^test-[0-9a-f]{20}$/;

$('payBtn').onclick = async () => {
  if (!validate()) return;
  paying('결제창을 여는 중');
  try { await loadSdk(); } catch { unlock(); modal('noSdk'); return; }
  paying('결제창에서 진행 중');
  const paymentId = 'test-' + randHex(10);
  let r;
  try {
    r = await window.PortOne.requestPayment({
      storeId: TEST.storeId, channelKey: TEST.channelKey, paymentId,
      orderName: '[시험] ' + P[product].name, totalAmount: P[product].amount, currency: 'CURRENCY_KRW', payMethod: PAY_METHOD,
      customer: { fullName: TEST.name, phoneNumber: TEST.phone, email: TEST.email },
      redirectUrl: location.origin + location.pathname,   // 폰은 결제사 화면으로 넘어갔다가 이 주소로 돌아온다
    });
  } catch { unlock(); modal('noWindow'); return; }
  unlock();
  if (!r) return;                                   // 폰 — 돌아오는 주소에서 이어서 처리
  if (r.code != null) { modal('fail'); return; }
  testDone(paymentId);
};

// ── 결과 ──
const IC = { ok: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.4 14.6-4-4L8 11.2l2.6 2.6 5.4-5.4 1.4 1.4z"/>', alert: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z"/>', info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/>' };
const ic = (n, c) => `<span class="st-ic ${c}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg></span>`;
const row = (a, v, c = '') => `<div class="d-row ${c}"><span>${a}</span><span>${v}</span></div>`;
function frame(icon, cls, title, body) { show('done'); $('doneTitle').innerHTML = `<span class="st-title">${ic(icon, cls)}<span>${esc(title)}</span></span>`; $('doneBody').innerHTML = body; }
function testDone(paymentId, fromRedirect) {   // 정식판 적용 문장은 쓰지 않는다(legal 11-09)
  frame('info', 'ic-info', '시험 결제가 승인되었습니다',
    `<p class="d-p">심사용 시험 결제라 정식판은 적용되지 않습니다.</p><p class="d-p">카드 승인은 결제한 날 자정쯤 자동으로 취소됩니다. 카드사 문자나 내역에는 승인과 취소가 함께 보일 수 있습니다.</p>`
    + `<div class="d-rows">${row('시험 결제 번호', `<code>${esc(paymentId)}</code>`)}${fromRedirect ? '' : row('결제 금액', esc(P[product].pay), 'total')}${row('문의', `<a href="mailto:${MAIL}" style="color:var(--brand-700)">${MAIL}</a>`)}</div>`
    + `<div class="d-act"><button class="d-btn" type="button" data-act="요금제로 돌아가기">요금제로 돌아가기</button></div>`);
}

// 가운데 창 — 방금 누른 행동의 결과에만
const M = {
  fail: ['alert', 'ic-bad', '결제되지 않았습니다', ['결제창이 닫혔거나 승인되지 않았습니다.'], [['닫기'], ['다시 결제하기', 1]]],
  noSdk: ['alert', 'ic-bad', '결제창을 불러오지 못했습니다', [NOPAID + ' 인터넷 연결을 확인한 뒤 ‘다시 결제하기’를 눌러 주세요.'], [['닫기'], ['다시 결제하기', 1]]],
  noWindow: ['alert', 'ic-bad', '결제창을 열지 못했습니다', [NOPAID + ' 브라우저에서 이 사이트의 팝업(새 창)을 허용한 뒤 ‘다시 결제하기’를 눌러 주세요.'], [['닫기'], ['다시 결제하기', 1]]],
};
const dlg = $('ms');
function closeModal() { if (dlg.open) dlg.close(); }
function modal(key) {
  const [i, cls, title, body, acts] = M[key];
  dlg.innerHTML = `<h2 class="ms-t" id="msT">${ic(i, cls)}<span>${esc(title)}</span></h2><div class="ms-b" id="msB">${body.map((p) => `<p>${esc(p)}</p>`).join('')}</div><div class="ms-acts">${acts.map(([t, pri]) => `<button type="button" class="ms-btn ${pri ? 'pri' : ''}" data-ms="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
  closeModal(); dlg.showModal(); (dlg.querySelector('.pri') || dlg.querySelector('button')).focus();
}
dlg.addEventListener('close', () => { if (!$('pay').hidden) $('payBtn').focus({ preventScroll: true }); });
dlg.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ms]'); if (!b) return; const t = b.dataset.ms; closeModal();
  if (t === '다시 결제하기' && !$('pay').hidden) $('payBtn').click();
});

// 폰 — 결제사 화면에서 이 주소로 돌아왔을 때(?paymentId=…&code=…). 모양이 맞는 값만, 글자로만 쓴다
(() => {
  const q = new URLSearchParams(location.search), pid = q.get('paymentId');
  if (!pid) return;
  history.replaceState(null, '', location.pathname);
  if (!PID.test(pid)) return;
  if (q.get('code')) { show('shop'); modal('fail'); return; }
  testDone(pid, true);
})();
