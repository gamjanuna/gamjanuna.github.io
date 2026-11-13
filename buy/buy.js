// 판매 페이지(qssok.com/buy/) — 시안 v272를 옮긴 것. 화면은 다시 읽지 않고 갈아 끼운다.
// ⛔ 지금은 「심사용 시험 결제」만 연다(대표 11-09, 포트원 전자결제 심사 11-17): 포트원 테스트 채널(KG이니시스 공용 MID)로
//    결제창만 열고 우리 결제 서버(worker/pay)는 부르지 않는다 → 정식판이 나갈 길이 없다(security 11-09 ㉡).
//    테스트 승인은 그날 자정쯤 자동 취소된다(포트원 답 11-09). 실제 결제를 열 때 이 파일의 TEST 묶음을 걷어내고 /pay/order·/pay/confirm을 잇는다.
// ⛔ 시안의 검사용 장치(화면 바로 가기·예시 값·자동 클릭)는 옮기지 않는다 — 남으면 qssok.com 주소로 가짜 「결제 완료」를 띄울 수 있다(security 11-09).
// ⛔ 주소·결제창에서 돌아온 값은 글자로만 넣는다(esc/textContent).
'use strict';
// 판매 방식 — 'test' = 위 심사용 시험 결제(결제 서버 안 부름) · 'live' = 결제 서버(worker/pay)로 실제 판매.
// ⛔ 'live'는 통신판매업 신고번호를 바닥글에 넣고 처리방침 결제판·약관 1.2가 시행된 뒤에만(legal 11-09, 가드 §14p).
//    진짜 문은 결제 서버의 PAY_OPEN이다 — 여기만 'live'여도 서버가 닫혀 있으면 결제창이 열리기 전에 막힌다(security 11-09).
const MODE = 'test';
// 내 컴퓨터 시험(localhost)에선 실제 결제 길을 돈다 — 결제 서버는 같은 주소의 /pay/로 대신 받는다(시험 도구가 넘겨 줌).
// ⛔ localhost 주소를 코드·CSP에 적지 않는다(운영 페이지가 내 컴퓨터를 부르게 된다 — security 11-09).
const LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const LIVE = MODE === 'live' || LOCAL;
const API = LOCAL ? '' : 'https://pay.danbilab.com';
const TERMS_VER = '1.3';   // = worker/pay/wrangler.toml TERMS_VER — 다르면 서버가 「약관 바뀜」으로 막는다(가드 §14p)
const SDK = 'https://cdn.portone.io/v2/browser-sdk.js';
const TEST = {   // 포트원 콘솔 › 결제 연동 › 연동 관리 › 테스트 채널 「큐쏙 시험」 — 비밀값 아님(결제창에 넘기는 공개 값)
  storeId: 'store-a36ecae1-4cef-4ba3-877a-c9d970fd0ec7',
  channelKey: 'channel-key-7d5447bd-16c7-4335-bc5c-a3c579f82c7c',
  // ⛔ 실연동 채널(KG MID MOI8530416, channel-key-0071b289-b583-4ee2-b248-307b7cae8b03)로 바꾸지 말 것 — 11-09 5a88012에서 바꿨더니
  //    카드사 심사 전인데도 실제 승인됐다(29,700원, 대표 카드, 콘솔 취소). 신고번호 전 실결제 = 신고 전 판매 → 테스트 채널로 되돌림(대표 ㉠).
  //    KG가 검수 때 실 MID 결제창을 요구하면 그 확인 동안만 바꾸고 바로 되돌린다.
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
if (LIVE) document.querySelector('.test-band').hidden = true;   // 「결제하지 마세요」 띠는 시험판에만
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
  else if (a.dataset.act === '다시 확인' && checking) check(checking, checkingAfterFail);   // 결제창 실패 뒤였다는 표시도 같이(독립 리뷰)
});

// ── 결제 화면 ──
const MACHINE = /^[2-9A-HJ-NP-Z]{10}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (v) => v.replace(/\s+/g, '').toUpperCase();
function setProduct(id) {
  product = id; const p = P[id];
  $('itName').innerHTML = p.title; $('itPrice').innerHTML = p.price.replace(/^월 ([\d,]+원) (\(.*\))$/, '월 <b>$1</b> <small>$2</small>'); $('itCond').textContent = p.cond;
  $('sBase').textContent = p.base; $('sVat').textContent = p.vat; $('sTotal').textContent = p.pay; $('bName').textContent = (LIVE ? '' : '[시험] ') + p.name;   // 결제창 주문명과 같게
  unlock();
}
function unlock() { const b = $('payBtn'); b.disabled = false; b.textContent = P[product].pay + ' 결제창 열기'; $('toCards').disabled = false; $('left').disabled = false; }
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
  m.innerHTML = LIVE ? '<span class="s-help">앱에서 ‘구매하기’를 눌렀다면 두 칸에 붙여 넣어 주세요(Ctrl+V).</span><span class="s-err"></span>'
    : '<span class="s-help">지금은 구매할 수 없어 예시 컴퓨터 번호를 넣어 두었습니다. 바꿀 수 없습니다.</span><span class="s-err"></span>';
  e.innerHTML = LIVE ? '<span class="s-help">결제 내용과 계약 내용을 이 주소로 보내 드립니다.</span><span class="s-err"></span>'
    : '<span class="s-help">지금은 구매할 수 없어 예시 이름·휴대폰 번호·이메일을 넣어 두었습니다. 바꿀 수 없습니다.</span><span class="s-err"></span>';
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
  show('pay'); setProduct(id); if (!LIVE) fillTest(); setSlots(); brief();
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
  if (LIVE) { payLive(); return; }
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

// ── 실제 결제 길(LIVE) — 주문 접수 → 결제창 → 결제 서버에 결과 확인 ──
// ⛔ 결과는 결제창·주소의 값이 아니라 /pay/confirm 답으로만 정한다(security 11-09). 서버 값은 글자로만 넣는다.
// ⛔ 이름·휴대폰·이메일은 포트원 결제창으로만 — 결제 서버엔 보내지 않는다(판매 페이지 「결제 서버에 저장하지 않고」, legal 11-09).
const ORDER = /^[0-9a-f]{32}$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(path, body) {   // 네트워크가 끊기면 던진다
  // 한 요청이 매달려 「확인 중」이 끝나지 않는 일이 없게 15초 제한(독립 리뷰) — AbortSignal.timeout이 없는 옛 사파리·인앱 브라우저도 되게 AbortController로
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
  try {   // 본문 읽기까지 제한 안에(머리글만 오고 본문이 멈추는 경우)
    const res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal });
    let j = {}; try { j = await res.json(); } catch (e) { if (ac.signal.aborted) throw e; }
    return { ok: res.ok, code: res.status, j };
  } finally { clearTimeout(t); }
}
const ORDER_ERR = { closed: 'S10b', not_configured: 'S10b', not_eligible: 'S14e', product_ended: 'S14c', rate_limited: 'S14a', terms_changed: 'S14b' };
async function payLive() {
  paying('주문을 접수하는 중');
  let o;
  try { o = await post('/pay/order', { product, machine_id: norm($('m1').value), agreed: { terms: true, period: true, ai_key: true }, terms_ver: TERMS_VER }); }
  catch { unlock(); modal('S14d'); return; }
  if (!o.ok) { unlock(); if (o.j.error === 'machine_unknown') numberNotFound(); else modal(ORDER_ERR[o.j.error] || 'S14d'); return; }
  const d = o.j;
  if (!ORDER.test(d.order_id ?? '') || d.amount !== P[product].amount) { unlock(); modal('S14d'); return; }   // 화면 금액과 다른 주문으로는 결제창을 열지 않는다
  try { await loadSdk(); } catch { unlock(); modal('noSdk'); return; }
  paying('결제창에서 진행 중');
  let r;
  try {
    r = await window.PortOne.requestPayment({
      storeId: d.store_id, channelKey: d.channel_key, paymentId: d.order_id,
      orderName: d.order_name, totalAmount: d.amount, currency: 'CURRENCY_KRW', payMethod: PAY_METHOD,
      customer: { fullName: $('nm').value.trim(), phoneNumber: $('ph').value.replace(/[\s-]/g, ''), email: $('em').value.trim() },
      redirectUrl: location.origin + location.pathname,
    });
  } catch { unlock(); modal('noWindow'); return; }
  unlock();
  if (!r) return;                                   // 폰 — 돌아오는 주소에서 이어서 처리
  if (r.code != null) { paying('결제를 확인하는 중'); await notPaid(d.order_id); return; }   // 확인하는 동안 단추를 다시 못 누르게(독립 리뷰)
  await check(d.order_id);
}
// 결제창이 실패를 알렸을 때 — 그래도 서버에 한 번 물어 정말 결제가 안 됐는지 본다(창을 닫는 사이 승인된 경우)
// 「결제되지 않았습니다(다시 결제)」는 서버가 「안 됐다」고 확정한 답일 때만 — 주문만 있고 결제 없음(pending)·승인 실패(failed)·주문 없음(404).
// 그 밖(확인 중·결제됨·적용 전·서버 오류·답 없음·모르는 값)은 전부 1분 확인 화면으로 — 「안 됐다」고 잘못 말하면 두 번 결제된다(독립 리뷰 2회)
// 404는 서버의 「주문 없음」 답일 때만 믿는다(경로·중간 서버의 404와 가르기 — 서버 fetchPayment의 PAYMENT_NOT_FOUND와 짝)
const noOrder = (s) => s.code === 404 && s.j.error === 'not_found';
async function notPaid(id) {
  let s; try { s = await post('/pay/confirm', { order_id: id }); } catch { check(id, true); return; }
  if (noOrder(s) || (s.ok && (s.j.status === 'pending' || s.j.status === 'failed'))) { failModal(); return; }
  check(id, true);
}
// 결제 화면이 있으면 「결제창 다시 열기」, 폰에서 돌아와 요금제 화면이면 「요금제를 골라 다시」(그 화면엔 다시 열 결제창이 없다 — 독립 리뷰)
function failModal() { unlock(); if ($('m1').value) { show('pay'); modal('fail'); } else { show('shop'); modal('S6c'); } }
const FINAL = new Set(['paid', 'mismatch', 'failed', 'cancelled', 'partial_cancelled']);   // 모르는 값은 「확인 중」으로 — 계속 묻는다
const WAITS = [0, 1.5, 3, 5, 5, 10, 10, 15, 15];   // 합쳐 약 1분(시안 v272 「길어도 1분쯤」)
let checking = null, checkingAfterFail = false, run = 0;   // run = 확인 차례 번호 — 「다시 확인」을 연타해도 마지막 하나만 돈다(독립 리뷰)
const CHECK_MS = 75000;          // 요청이 느려도 「길어도 1분쯤」을 넘겨 돌지 않게 전체 마감
// afterFail = 결제창이 실패를 알린 뒤 — 그때는 서버의 「결제 없음(pending)」 확정도 받아 「결제되지 않았습니다」로(성공 뒤엔 결제가 들어오는 중일 수 있어 계속 묻는다)
async function check(id, afterFail = false) {
  checking = id; checkingAfterFail = afterFail; const my = ++run, until = Date.now() + CHECK_MS;
  frame('spin', '', '결제를 확인하고 있습니다', '<p class="d-p" role="status">이 화면을 닫지 말고 기다려 주세요. 길어도 1분쯤 걸립니다.</p>');
  let last = null;
  for (const w of WAITS) {
    await sleep(w * 1000);
    if (run !== my) return;
    if (Date.now() > until) break;
    let s; try { s = await post('/pay/confirm', { order_id: id }); } catch { continue; }
    if (run !== my) return;
    if (noOrder(s)) { result(id, { status: 'not_found' }); return; }
    if (afterFail && s.ok && s.j.status === 'pending') { failModal(); return; }
    if (s.ok) last = s.j;
    // 「결제됨·아직 적용 전」은 적용이 끝나는 중일 수 있다 — 끝까지 묻고, 그래도 그대로면 그때 「적용 못 함」(독립 리뷰)
    if (s.ok && FINAL.has(s.j.status) && !(s.j.status === 'paid' && !s.j.applied)) { result(id, s.j); return; }
  }
  result(id, last?.status === 'paid' ? last : { status: 'unknown' });
}
function result(id, s) {
  checking = null;
  const oid = `<span class="d-oid"><code>${esc(id)}</code><button class="sbtn" type="button" data-copy="${esc(id)}">복사</button></span>`;
  const p = P[s.product], ask = row('문의', `<a href="mailto:${MAIL}" style="color:var(--brand-700)">${MAIL}</a>`);
  const amt = typeof s.amount === 'number' ? s.amount.toLocaleString('ko-KR') + '원' : '';
  if (s.status === 'paid' && s.applied) {
    frame('ok', 'ic-ok', '결제가 완료되었습니다', `<p class="d-lead">아래 컴퓨터 번호에 정식판 1개월을 적용했습니다</p><p class="d-sub">인터넷에 연결해 큐쏙을 다시 켜면 반영됩니다.</p>`
      + `<div class="d-sec"><h2 class="d-sec-t">주문 내역</h2><div class="d-rows">${p ? row('상품', esc(p.name)) : ''}${s.machine_id ? row('컴퓨터 번호', `<span class="mono">${esc(s.machine_id)}</span>`) : ''}${row('주문 번호', oid)}${amt ? row('결제 금액', esc(amt), 'total') : ''}</div></div>`
      + `<dl class="notice d-notice"><dt>이용 기간</dt><dd>1개월. 남은 체험·결제 기간이 있으면 끝난 다음 날부터 시작합니다. <span class="must">시작일과 종료일은 결제 이메일로 보내 드립니다.</span></dd><dt>환불</dt><dd>결제한 날이나 시작 전에는 전액, 그 뒤에는 지난 일수를 뺀 금액</dd>`
      + `<dt>문의</dt><dd>메일이 오지 않거나 앱에 반영되지 않을 때, 번호를 잘못 입력했을 때는 주문 번호를 ${MAIL}으로 보내 주세요. <span class="must">번호를 잘못 입력했다면 정식판이 적용된 날의 다음 날까지 알려 주셔야 전액 환불됩니다.</span></dd></dl>`);
  } else if (s.status === 'paid') {
    frame('alert', 'ic-warn', '결제되었지만 정식판을 아직 적용하지 못했습니다', `<p class="d-p">다시 결제하지 마세요.</p><p class="d-p">처리 안내는 결제 이메일로 보내 드립니다.</p><div class="d-rows">${row('주문 번호', oid)}${amt ? row('결제 금액', esc(amt)) : ''}${ask}</div>`);
  } else if (s.status === 'mismatch') {
    frame('alert', 'ic-warn', '결제 금액 확인이 필요합니다', `<p class="d-p">주문 금액과 결제 금액이 달라 정식판을 적용하지 않았습니다.</p><p class="d-p">다시 결제하지 마세요. 처리 안내는 결제 이메일로 보내 드립니다.</p><div class="d-rows">${row('주문 번호', oid)}${ask}</div>`);
  } else if (s.status === 'cancelled' || s.status === 'partial_cancelled') {
    frame('info', 'ic-info', '이 결제는 취소 처리되었습니다', `<p class="d-p">취소 금액과 이용 기간은 메일로 안내합니다.</p><p class="d-p">환불되는 날은 결제 수단마다 다를 수 있습니다.</p><div class="d-rows">${row('주문 번호', oid)}${ask}</div><div class="d-act"><button class="d-btn" type="button" data-act="요금제로 돌아가기">요금제로 돌아가기</button></div>`);
  } else if (s.status === 'failed') {
    failModal();
  } else if (s.status === 'not_found') {
    frame('alert', 'ic-warn', '주문을 찾지 못했습니다', `<p class="d-p">주소가 잘렸거나 30일이 지난 주문일 수 있습니다.</p><p class="d-p">이미 결제했다면 다시 결제하지 말고 문의해 주세요.</p><div class="d-rows">${ask}</div><div class="d-act"><button class="d-btn" type="button" data-act="요금제로 돌아가기">요금제로 돌아가기</button></div>`);
  } else {   // 1분이 지나도 답이 없음
    checking = id;
    frame('alert', 'ic-warn', '결제 결과를 확인하지 못했습니다', `<p class="d-p">결제되었을 수 있으니 다시 결제하지 마세요.</p><p class="d-p">주문 번호를 ${MAIL}으로 보내 주시면 확인해 드립니다.</p><div class="d-rows">${row('주문 번호', oid)}${ask}</div><div class="d-act"><button class="d-btn" type="button" data-act="다시 확인">다시 확인</button></div>`);
  }
}
function numberNotFound() { setSlots(); $('m1').setAttribute('aria-invalid', ''); slotErr($('mSlot'), '이 번호를 찾지 못했습니다. 큐쏙 앱 설정 › 이용 상태의 번호를 확인해 주세요.'); $('m1').focus({ preventScroll: true }); $('m1').scrollIntoView({ block: 'center', behavior: 'instant' }); }

// ── 결과 ──
const IC = { ok: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.4 14.6-4-4L8 11.2l2.6 2.6 5.4-5.4 1.4 1.4z"/>', alert: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z"/>', info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/>' };
const ic = (n, c) => `<span class="st-ic ${c}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg></span>`;
const row = (a, v, c = '') => `<div class="d-row ${c}"><span>${a}</span><span>${v}</span></div>`;
function frame(icon, cls, title, body) { show('done'); $('doneTitle').innerHTML = `<span class="st-title">${icon === 'spin' ? `<span class="st-ic">${SVG.spin}</span>` : ic(icon, cls)}<span>${esc(title)}</span></span>`; $('doneBody').innerHTML = body; }   // spin = 확인 중(시안 v272 frame과 같게)
function testDone(paymentId, fromRedirect) {   // 정식판 적용 문장은 쓰지 않는다(legal 11-09)
  frame('info', 'ic-info', '시험 결제가 승인되었습니다',
    `<p class="d-p">심사용 시험 결제라 정식판은 적용되지 않습니다.</p><p class="d-p">카드 승인은 결제한 날 자정쯤 자동으로 취소됩니다. 카드사 문자나 내역에는 승인과 취소가 함께 보일 수 있습니다.</p>`
    + `<div class="d-rows">${row('시험 결제 번호', `<code>${esc(paymentId)}</code>`)}${fromRedirect ? '' : row('결제 금액', esc(P[product].pay), 'total')}${row('문의', `<a href="mailto:${MAIL}" style="color:var(--brand-700)">${MAIL}</a>`)}</div>`
    + `<div class="d-act"><button class="d-btn" type="button" data-act="요금제로 돌아가기">요금제로 돌아가기</button></div>`);
}

// 가운데 창 — 방금 누른 행동의 결과에만
const M = {
  fail: ['alert', 'ic-bad', '결제되지 않았습니다', ['결제창이 닫혔거나 승인되지 않았습니다.'], [['닫기'], ['결제창 다시 열기', 1]]],
  noSdk: ['alert', 'ic-bad', '결제창을 불러오지 못했습니다', [NOPAID + ' 인터넷 연결을 확인한 뒤 ‘결제창 다시 열기’를 눌러 주세요.'], [['닫기'], ['결제창 다시 열기', 1]]],
  noWindow: ['alert', 'ic-bad', '결제창을 열지 못했습니다', [NOPAID + ' 브라우저에서 이 사이트의 팝업(새 창)을 허용한 뒤 ‘결제창 다시 열기’를 눌러 주세요.'], [['닫기'], ['결제창 다시 열기', 1]]],
  // 주문 접수 오류(실제 결제 길) — 문구 정본 = 시안 v272(design·ux-writing 11-07)
  S14e: ['alert', 'ic-bad', '이 컴퓨터 번호는 오픈 기념 금액 대상이 아닙니다', [NOPAID + ' 매달 결제는 이용할 수 있습니다.', '컴퓨터를 옮겼다면 ' + MAIL + '으로 문의해 주세요.'], [['번호 고치기'], ['매달 결제로 바꾸기', 1]]],
  S14c: ['alert', 'ic-bad', '오픈 기념 금액 판매가 종료되었습니다', [NOPAID + ' 매달 결제는 이용할 수 있습니다.'], [['닫기'], ['매달 결제로 바꾸기', 1]]],
  S14a: ['alert', 'ic-bad', '오늘 결제 시도가 너무 많습니다', [NOPAID + ' 내일 다시 결제해 주세요.', '급하면 ' + MAIL + '으로 문의해 주세요.'], [['닫기', 1]]],
  S14b: ['info', 'ic-info', '페이지를 새로고침해 주세요', ['이 페이지를 연 사이 이용약관이 바뀌어 결제되지 않았습니다.', '새로고침한 뒤 입력과 동의를 다시 해 주세요.'], [['새로고침', 1]]],
  S14d: ['alert', 'ic-bad', '주문을 접수하지 못했습니다', [NOPAID + ' 잠시 뒤 다시 시도해 주세요.', '계속 안 되면 인터넷 연결을 확인해 주세요.'], [['닫기'], ['다시 시도', 1]]],
  S6c: ['info', 'ic-info', '결제되지 않았습니다', ['결제창이 닫혔거나 승인되지 않아 결제가 진행되지 않았습니다.', '요금제를 골라 다시 결제할 수 있습니다.'], [['닫기', 1]]],
  S10b: ['info', 'ic-info', '지금은 정식판 구매를 받지 않고 있습니다', ['이 페이지를 연 사이 구매가 닫혀 결제되지 않았습니다.', '7일 무료 체험은 지금도 이용할 수 있습니다.'], [['닫기', 1]]],
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
  if ((t === '결제창 다시 열기' || t === '다시 시도') && !$('pay').hidden) $('payBtn').click();
  else if (t === '매달 결제로 바꾸기') { setProduct('monthly'); $('payBtn').scrollIntoView({ block: 'center', behavior: 'instant' }); }
  else if (t === '번호 고치기') { $('m1').focus({ preventScroll: true }); $('m1').scrollIntoView({ block: 'center', behavior: 'instant' }); }
  else if (t === '새로고침') location.reload();
});

// 폰 — 결제사 화면에서 이 주소로 돌아왔을 때(?paymentId=…&code=…). 모양이 맞는 값만, 글자로만 쓴다
(() => {
  const q = new URLSearchParams(location.search), pid = q.get('paymentId');
  if (!pid) return;
  history.replaceState(null, '', location.pathname);
  if (LIVE) {   // 실제 결제 길 — 주문 번호 모양만 받고, 결과는 결제 서버 답으로(주소의 code는 「실패일 수 있다」는 신호로만)
    if (!ORDER.test(pid)) return;
    if (q.get('code')) notPaid(pid); else check(pid);
    return;
  }
  if (!PID.test(pid)) return;
  if (q.get('code')) { show('shop'); modal('S6c'); return; }
  testDone(pid, true);
})();
