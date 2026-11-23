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
const TERMS_VER = '1.7';   // = worker/pay/wrangler.toml TERMS_VER — 다르면 서버가 「약관 바뀜」으로 막는다(가드 §14p)
const SDK = 'https://cdn.portone.io/v2/browser-sdk.js';
const TEST = {   // 포트원 콘솔 › 결제 연동 › 연동 관리 › 테스트 채널 「큐쏙 시험」 — 비밀값 아님(결제창에 넘기는 공개 값)
  storeId: 'store-a36ecae1-4cef-4ba3-877a-c9d970fd0ec7',
  channelKey: 'channel-key-7d5447bd-16c7-4335-bc5c-a3c579f82c7c',
  // ⛔ 실연동 채널(KG MID MOI8530416, channel-key-0071b289-b583-4ee2-b248-307b7cae8b03)로 바꾸지 말 것 — 11-09 5a88012에서 바꿨더니
  //    카드사 심사 전인데도 실제 승인됐다(29,700원, 대표 카드, 콘솔 취소). 신고번호 전 실결제 = 신고 전 판매 → 테스트 채널로 되돌림(대표 ㉠).
  //    KG가 검수 때 실 MID 결제창을 요구하면 그 확인 동안만 바꾸고 바로 되돌린다.
  // 시험 결제라 실제 개인정보가 포트원·결제사로 가지 않게 미리 채운다(legal 11-09 — 처리방침에 아직 이름·휴대폰이 없다)
  machine: 'TESTPAY234', name: '시험결제', phone: '01000000000', email: 'test@qssok.com',
  // 자동 결제의 카드 등록 창(KG 신규계약 11-18: 정기결제도 테스트 결제창이 뜨면 된다) — 포트원 테스트 채널(KG이니시스 정기결제·빌링)
  // ⛔ 실연동 정기결제 채널(KG MID MOI3766296)을 넣지 말 것 — 위 11-09 사고와 같은 길
  billKey: 'channel-key-7fd8f41d-1f2f-48be-bc74-faa76c0ec790',   // 테스트 채널 「큐쏙 시험 정기」(공용 MID INIBillTst, 11-18)
};
const SVG = {
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>',
  spin: '<svg class="spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
};
const P = {
  open3: { title: '<span class="open">오픈 기념</span>첫 3개월', name: '큐쏙 정식판 1개월 이용권 (오픈 기념)', amount: 29700, base: '27,000원', vat: '2,700원', pay: '29,700원', price: '월 27,000원 (VAT 별도, 최종 결제 금액 29,700원)', cond: '이번 결제: 1개월분 · 결제가 열린 날부터 2027년 1월 31일까지 첫 결제 · 첫 결제 포함 3개월' },
  // 자동 결제 둘(bill = 결제창 대신 카드 등록 창, 대표 11-18 ㉡: 오픈 기념 대상은 첫 3번 27,000원 → 4번째부터 32,000원) — 문구 ux-writing·legal 11-18
  open3auto: { bill: 1, title: '<span class="open">오픈 기념</span>첫 3개월 · 자동 결제', name: '큐쏙 정식판 1개월 이용권 (오픈 기념 · 자동 결제)', amount: 29700, base: '27,000원', vat: '2,700원', pay: '29,700원', price: '월 27,000원 (VAT 별도, 최종 결제 금액 29,700원)', cond: '이번 단계: 카드 등록 · 첫 3개월 매달 29,700원 자동 결제 · 4개월째(35,200원)는 그때 다시 동의하신 경우에만',
    // 4개월째 금액은 그때 따로 동의(약관 제8조의2 제4항 — 처음 계약 때 미리 받지 않는다, legal 11-23 [빨강] B · 문구 ux-writing 11-23)
    agree: '[필수] 첫 3개월간 월 29,700원(월 27,000원, VAT 별도) 자동 결제에 동의합니다.', term: '첫 3개월 매달 1개월씩 29,700원 · 4개월째부터 35,200원은 다시 동의하신 경우에만',
    note: '4개월째부터 월 35,200원으로 전환되며, 전환 전 별도 동의를 받습니다(동의하지 않거나 답이 없으면 자동 결제 종료). 해지할 때까지 매달 같은 날 결제되며, 다음 결제 예정일 7일 전 안내 메일을 드립니다. 언제든 큐쏙 앱 설정이나 이 페이지에서 해지할 수 있으며, 해지하면 다음 결제부터 이루어지지 않고 이미 결제한 이용 기간은 끝날 때까지 쓸 수 있습니다(위약금 없음).' },
  auto: { bill: 1, title: '자동 결제', name: '큐쏙 정식판 1개월 이용권 (자동 결제)', amount: 35200, base: '32,000원', vat: '3,200원', pay: '35,200원', price: '월 32,000원 (VAT 별도, 최종 결제 금액 35,200원)', cond: '이번 단계: 카드 등록 · 해지할 때까지 매달 35,200원 자동 결제',
    // 동의 칸 짧은 판(대표 11-23) — 결제일·해지 장소·다음 결제 7일 전 안내는 남긴다(약관 제8조의2 제2·5항 = 구매 화면에서 확인, legal 11-23)
    agree: '[필수] 월 35,200원(월 32,000원, VAT 별도) 자동 결제에 동의합니다.', term: '해지할 때까지 매달 1개월씩',
    note: '해지할 때까지 매달 같은 날 결제되며, 다음 결제 예정일 7일 전 안내 메일을 드립니다. 요금 변경 시 사전 동의를 받습니다. 언제든 큐쏙 앱 설정이나 이 페이지에서 해지할 수 있으며, 해지하면 다음 결제부터 이루어지지 않고 이미 결제한 이용 기간은 끝날 때까지 쓸 수 있습니다(위약금 없음).' },
  monthly: { title: '매달 결제', name: '큐쏙 정식판 1개월 이용권', amount: 39600, base: '36,000원', vat: '3,600원', pay: '39,600원', price: '월 36,000원 (VAT 별도, 최종 결제 금액 39,600원)', cond: '이번 결제: 1개월분 · 한 달씩 직접 결제' },
};
const MAIL = 'contact@danbilab.com', NOPAID = '결제되지 않았습니다.';
const $ = (id) => document.getElementById(id);
const esc = (t) => { const d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; };
let product = 'open3';
// 결제 방법은 이니시스 결제창 안에서 고른다(카드사·카카오페이·네이버페이 등이 한 창에 나온다) — 대표 11-09.
// 「간편결제」로 따로 부르면 이니시스 V2는 결제사를 미리 정하라며 거절한다(11-09 실측).
const PAY_METHOD = 'CARD';

// 메일 링크(?renew=열쇠 · ?cancel=열쇠) — 다른 무엇보다 먼저 주소에서 걷는다(방문 기록·북마크·포트원 같은 바깥 요청에 열쇠가 남지 않게).
// 열쇠는 이 탭의 메모리와 sessionStorage에만 — sessionStorage는 새로고침했을 때만 다시 읽는다(나중에 판매 페이지를 다시 열면 요금제 화면)
// 7일 전 안내 메일의 [카드 변경하러 가기](#m=번호) — 번호만 칸에 채우고 주소에서 지운다(번호는 메일에 이미 있는 값 · 강사 역할 리뷰 11-21)
// ⛔ ?m=(쿼리)로 되돌리지 말 것 — 쿼리는 페이지를 올려 둔 곳(GitHub·Cloudflare) 접속 기록에 남는다. # 뒤는 서버로 안 간다(legal 11-21 ㉡, 처리방침에 안 적은 이유)
const PREFILL_M = (() => {
  const m = /^#m=([2-9A-HJ-NP-Z]{10})$/.exec(location.hash);
  if (m) history.replaceState(null, '', location.pathname + location.search + '#cancel');
  return m ? m[1] : '';
})();
const AP_LINK = (() => {
  const lq = new URLSearchParams(location.search), kind = lq.has('cancel') ? 'cancel' : lq.has('renew') ? 'renew' : lq.has('card') ? 'card' : '';   // card = 카드 변경 링크(11-21)
  if (kind) {
    const v = { kind, t: lq.get(kind) || '', no: lq.get('pick') === 'no' };   // pick=no = 메일의 「계속하지 않기」 단추
    history.replaceState(null, '', location.pathname);
    try { sessionStorage.setItem('apLink', JSON.stringify(v)); } catch { /* 저장 못 해도 이번 화면은 그대로 */ }
    return v;
  }
  try {
    if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') { sessionStorage.removeItem('apLink'); return null; }
    const v = JSON.parse(sessionStorage.getItem('apLink'));
    return v && (v.kind === 'renew' || v.kind === 'cancel' || v.kind === 'card') && typeof v.t === 'string' ? v : null;
  } catch { return null; }
})();

if (PREFILL_M && !AP_LINK) {   // 메일 단추로 왔다 — 번호 칸만 채우고 그 칸으로(주소의 #m=은 위에서 이미 지웠다)
  $('cm').value = PREFILL_M;
  addEventListener('load', () => $('cancel')?.scrollIntoView({ block: 'start' }));
}

// 결제·완료 화면 맨 아래 = 첫 화면과 같은 공통 바닥글(tools/site_footer.py) + 분쟁 처리 문장. 결제 중에 같은 탭에서 약관을 열면
// 입력한 이름·번호가 날아가므로 새 창으로(design 11-19). 바닥글 안엔 id가 없다(복제해도 겹치지 않게).
const disp = document.querySelector('#shop .dispute'), foot = document.querySelector('#shop footer.sf');
document.querySelectorAll('.tail').forEach((t) => {
  const f = foot.cloneNode(true);
  f.querySelector('.sf-brand').remove();   // 결제 화면엔 안 보이는 자리 + 로고 그림의 이름표(sf-…)가 한 페이지에 겹치지 않게
  f.querySelectorAll('a:not([target])').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
  t.append(disp.cloneNode(true), f);
});
if (LIVE) document.querySelector('.test-band').hidden = true;   // 「결제하지 마세요」 띠는 시험판에만
['400', '700'].forEach((w) => document.fonts?.load(`${w} 13.5px "IBM Plex Sans KR"`, document.body.innerText));

function show(id) {
  ['shop', 'pay', 'done', 'ap'].forEach((k) => ($(k).hidden = k !== id));
  document.body.classList.toggle('narrow', id !== 'shop');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
// 오픈 기념 카드는 결제 방식 고르기(기본 = 직접 결제 — 자동은 손님이 눌러야, legal 11-18)를 따른다
document.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => toPay(b.dataset.buy === 'open3' ? (document.querySelector('input[name="o3"]:checked')?.value || 'open3') : b.dataset.buy, true)));
// 실제 판매(LIVE)엔 자동 결제 길(결제 서버 빌링·약관 자동 결제 장·온라인 해지)이 아직 없다 → 「준비 중」으로 되돌린다(legal 11-18 🔴 · 랜딩·앱과 같게)
if (LIVE) {
  document.querySelectorAll('[data-auto]').forEach((e) => (e.hidden = true));
  const a = document.querySelector('[data-card="auto"]'); a.classList.add('is-soon'); a.querySelector('.go').outerHTML = '<p class="soon">준비 중</p>';
}

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
// 번호·이메일 확인 — 결제 화면과 해지 칸이 같은 함수(같은 말)
const machineErr = (a) => !a ? '컴퓨터 번호를 입력해 주세요.' : a.length !== 10 ? `번호는 10자리입니다(지금 ${a.length}자리).` : !MACHINE.test(a) ? '0, 1, I, O는 번호에 없는 글자입니다.' : '';
const emailErr = (em) => !em ? '이메일을 입력해 주세요.' : !EMAIL.test(em) ? '이메일 주소를 확인해 주세요.' : '';
function setProduct(id) {
  product = id; const p = P[id];
  $('itName').innerHTML = p.title; $('itPrice').innerHTML = p.price.replace(/^월 ([\d,]+원) (\(.*\))$/, '월 <b>$1</b> <small>$2</small>'); $('itCond').textContent = p.cond;
  $('sBase').textContent = p.base; $('sVat').textContent = p.vat; $('sTotal').textContent = p.pay; $('bName').textContent = (LIVE ? '' : '[시험] ') + p.name;   // 결제창 주문명과 같게
  // 자동 결제면 결제 화면의 말이 달라진다 — 「자동으로 결제되지 않습니다」를 숨기고 넷째 필수 동의(미리 체크 ⛔)를 연다(legal 11-18)
  $('methodNote').textContent = p.bill ? '자동 결제는 카드만 등록할 수 있습니다. 카드 정보는 ‘카드 등록 창 열기’를 누른 뒤 열리는 창에서 넣습니다.' : '카드와 간편결제(카카오페이·네이버페이·토스페이·페이코)는 결제창 열기를 누른 뒤 열리는 결제창에서 고릅니다.';
  $('autoDd').textContent = p.bill ? '해지할 때까지 등록한 카드로 매달 결제됩니다. 지금은 심사용 시험판이라 카드를 등록해도 자동 결제가 시작되지 않습니다.' : '자동으로 결제되지 않습니다. 다음 달은 직접 결제해 주세요.';
  $('agAuto').hidden = !p.bill; $('agAuto').querySelector('input').checked = false; $('agAutoT').textContent = p.agree || ''; $('agAutoN').textContent = p.note || ''; $('agN').textContent = String(items().length); $('agAll').checked = false;
  $('bTerm').textContent = p.term || '1개월 (시작일·종료일은 메일로 안내)'; $('bPay').textContent = p.bill ? '카드 (카드 등록 창에서 입력)' : '결제창에서 선택';
  $('sTotalL').textContent = p.bill ? '매달 결제 금액' : '최종 결제 금액';
  unlock();
}
function unlock() { const b = $('payBtn'); b.disabled = false; b.textContent = P[product].bill ? '카드 등록 창 열기' : P[product].pay + ' 결제창 열기'; $('toCards').disabled = false; $('left').disabled = false; }
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
const items = () => [...document.querySelectorAll('.ag:not([hidden]) input')];   // 숨은 넷째(자동 결제 동의)는 세지 않는다
$('agAll').onchange = (e) => { items().forEach((c) => (c.checked = e.target.checked)); document.querySelectorAll('.ag.miss').forEach((g) => g.classList.remove('miss')); if (e.target.checked) { $('aSlot').className = 'slot'; $('aSlot').textContent = ''; $('allHint').hidden = false; } };
items().forEach((c) => (c.onchange = () => { $('agAll').checked = items().every((x) => x.checked); if (c.checked) c.closest('.ag').classList.remove('miss'); }));

function validate() {
  const a = norm($('m1').value), b = norm($('m2').value), em = $('em').value.trim();
  const e1 = machineErr(a);
  const e2 = e1 ? '' : !b ? '번호를 한 번 더 입력해 주세요.' : a !== b ? '두 칸의 번호가 다릅니다.' : '';
  const nm = $('nm').value.trim(), ph = $('ph').value.replace(/[\s-]/g, '');
  const e4 = !nm ? '이름을 입력해 주세요.' : '', e5 = !ph ? '휴대폰 번호를 입력해 주세요.' : !/^01\d{8,9}$/.test(ph) ? '휴대폰 번호를 확인해 주세요.' : '';
  const e3 = emailErr(em);
  setSlots();
  $('m1').toggleAttribute('aria-invalid', !!e1); $('m2').toggleAttribute('aria-invalid', !!e2); $('em').toggleAttribute('aria-invalid', !!e3); $('nm').toggleAttribute('aria-invalid', !!e4); $('ph').toggleAttribute('aria-invalid', !!e5);
  if (e4) slotErr($('nSlot'), e4);
  if (e5) slotErr($('pSlot'), e5);
  if (e1 || e2) slotErr($('mSlot'), e1 || e2);
  if (e3) slotErr($('eSlot'), e3);
  let miss = false;
  document.querySelectorAll('.ag:not([hidden])').forEach((g) => { const m = !g.querySelector('input').checked; g.classList.toggle('miss', m); if (m) miss = true; });
  if (miss) { $('allHint').hidden = true; slotErr($('aSlot'), `필수 ${items().length}개에 모두 체크해 주세요.`); }
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
  if (P[product].bill) { if (!LIVE) payBill(); return; }   // LIVE엔 자동 결제 카드가 「준비 중」이라 오지 않는다(위)
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

// ── 자동 결제(시험판) — 포트원 빌링키 발급 창(정기결제의 결제창)만 연다 · 실제 매달 청구는 결제 서버 몫(아직 없음) ──
// ⛔ 돌아온 빌링키는 있는지만 본다 — 화면·console·저장소·결제 서버 어디에도 쓰지 않는다(security·legal 11-18, 「큐쏙에 저장하지 않습니다」의 근거)
async function payBill() {
  paying('카드 등록 창을 여는 중');
  try { await loadSdk(); } catch { unlock(); modal('billNoSdk'); return; }
  paying('카드 등록 창에서 진행 중');
  const issueId = 'bill-' + randHex(10);
  let r;
  try {
    r = await window.PortOne.requestIssueBillingKey({
      storeId: TEST.storeId, channelKey: TEST.billKey, billingKeyMethod: 'CARD', issueId,
      issueName: '[시험] ' + P[product].name,   // 결제 화면 「상품」 줄과 같게
      customer: { fullName: TEST.name, phoneNumber: TEST.phone, email: TEST.email },
      redirectUrl: location.origin + location.pathname,   // 폰은 결제사 화면에 갔다가 이 주소로 돌아온다(아래 복귀 처리)
    });
  } catch { unlock(); modal('billNoWindow'); return; }
  unlock();
  if (!r) return;                                   // 폰 — 돌아오는 주소에서 이어서 처리
  if (r.code != null || !r.billingKey) { modal('billFail'); return; }
  billDone(issueId);
}

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
const ORDER_ERR = { closed: 'S10b', not_configured: 'S10b', not_eligible: 'S14e', product_ended: 'S14c', rate_limited: 'S14a', terms_changed: 'S14b', pay_pending: 'S14h' };
// 서버 날짜(confirm_early·too_far의 end·from) — 모양이 맞을 때만 「12월 30일」로. 아니면 날짜 없는 판(S14g·S14j)
const kDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '') ? `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일` : '';
// earlyOk = 확인창(S14f·S14g)에서 「계속 결제」를 누른 뒤 — 끝나는 날까지 일주일 넘게 남아도 막지 않고 묻기만 한다(대표 11-16)
async function payLive(earlyOk = false) {
  paying('주문을 접수하는 중');
  let o;
  try { o = await post('/pay/order', { product, machine_id: norm($('m1').value), agreed: { terms: true, period: true, ai_key: true }, terms_ver: TERMS_VER, ...(earlyOk ? { early_ok: true } : {}) }); }
  catch { unlock(); modal('S14d'); return; }
  if (!o.ok) { unlock(); if (o.j.error === 'machine_unknown') numberNotFound(); else if (o.j.error === 'confirm_early') modal(kDay(o.j.end) ? 'S14f' : 'S14g', { 날짜: kDay(o.j.end) });
    else if (o.j.error === 'too_far') modal(kDay(o.j.end) && kDay(o.j.from) ? 'S14i' : 'S14j', { '끝나는 날': kDay(o.j.end), '가능한 날': kDay(o.j.from) }); else modal(ORDER_ERR[o.j.error] || 'S14d'); return; }
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
function billDone(issueId) {   // testDone과 짝(ux-writing 11-18) · 「돈이 나가지 않았다」 ⛔ — KG 시험 창의 소액 승인 여부 실측 전(legal)
  frame('info', 'ic-info', '시험 카드 등록이 승인되었습니다',
    `<p class="d-p">심사용 시험이라 정식판은 적용되지 않고, 자동 결제도 시작되지 않습니다.</p><p class="d-p">등록한 카드 정보는 큐쏙에 저장하지 않습니다.</p>`
    + `<div class="d-rows">${issueId ? row('시험 등록 번호', `<code>${esc(issueId)}</code>`) : ''}${row('문의', `<a href="mailto:${MAIL}" style="color:var(--brand-700)">${MAIL}</a>`)}</div>`
    + `<div class="d-act"><button class="d-btn" type="button" data-act="요금제로 돌아가기">요금제로 돌아가기</button></div>`);
}

// 가운데 창 — 방금 누른 행동의 결과에만
const M = {
  fail: ['alert', 'ic-bad', '결제되지 않았습니다', ['결제창이 닫혔거나 승인되지 않았습니다.'], [['닫기'], ['결제창 다시 열기', 1]]],
  noSdk: ['alert', 'ic-bad', '결제창을 불러오지 못했습니다', [NOPAID + ' 인터넷 연결을 확인한 뒤 ‘결제창 다시 열기’를 눌러 주세요.'], [['닫기'], ['결제창 다시 열기', 1]]],
  noWindow: ['alert', 'ic-bad', '결제창을 열지 못했습니다', [NOPAID + ' 브라우저에서 이 사이트의 팝업(새 창)을 허용한 뒤 ‘결제창 다시 열기’를 눌러 주세요.'], [['닫기'], ['결제창 다시 열기', 1]]],
  // 「카드 등록 시험」 짝(ux-writing 11-18) — 「결제」 낱말·NOPAID ⛔(결제하려던 거였나로 읽힌다) · 다시 열기는 카드 등록 단추로
  billFail: ['alert', 'ic-bad', '카드가 등록되지 않았습니다', ['카드 등록 창이 닫혔거나 등록이 승인되지 않았습니다. 자동 결제는 신청되지 않았습니다.'], [['닫기'], ['카드 등록 창 다시 열기', 1]]],
  billNoSdk: ['alert', 'ic-bad', '카드 등록 창을 불러오지 못했습니다', ['자동 결제는 신청되지 않았습니다. 인터넷 연결을 확인한 뒤 ‘카드 등록 창 다시 열기’를 눌러 주세요.'], [['닫기'], ['카드 등록 창 다시 열기', 1]]],
  billNoWindow: ['alert', 'ic-bad', '카드 등록 창을 열지 못했습니다', ['자동 결제는 신청되지 않았습니다. 브라우저에서 이 사이트의 팝업(새 창)을 허용한 뒤 ‘카드 등록 창 다시 열기’를 눌러 주세요.'], [['닫기'], ['카드 등록 창 다시 열기', 1]]],
  // 주문 접수 오류(실제 결제 길) — 문구 정본 = 시안 v272(design·ux-writing 11-07)
  S14e: ['alert', 'ic-bad', '이 컴퓨터 번호는 오픈 기념 금액 대상이 아닙니다', [NOPAID + ' 매달 결제는 이용할 수 있습니다.', '컴퓨터를 옮겼다면 ' + MAIL + '으로 문의해 주세요.'], [['번호 고치기'], ['매달 결제로 바꾸기', 1]]],
  S14c: ['alert', 'ic-bad', '오픈 기념 금액 판매가 종료되었습니다', [NOPAID + ' 매달 결제는 이용할 수 있습니다.'], [['닫기'], ['매달 결제로 바꾸기', 1]]],
  S14a: ['alert', 'ic-bad', '오늘 결제 시도가 너무 많습니다', [NOPAID + ' 내일 다시 결제해 주세요.', '급하면 ' + MAIL + '으로 문의해 주세요.'], [['닫기', 1]]],
  S14b: ['info', 'ic-info', '페이지를 새로고침해 주세요', ['이 페이지를 연 사이 이용약관이 바뀌어 결제되지 않았습니다.', '새로고침한 뒤 입력과 동의를 다시 해 주세요.'], [['새로고침', 1]]],
  S14d: ['alert', 'ic-bad', '주문을 접수하지 못했습니다', [NOPAID + ' 잠시 뒤 다시 시도해 주세요.', '계속 안 되면 인터넷 연결을 확인해 주세요.'], [['닫기'], ['다시 시도', 1]]],
  // 끝나는 날까지 일주일 넘게 남았을 때(결제·무료·체험 가리지 않음) — 막지 않고 묻는다(대표 11-16 · 문구 ux-writing · 주황 「!」 = 결정 필요, design 11-16). {…}는 modal 둘째 인자
  // ⛔ NOPAID로 시작하지 말 것(결제 실패로 읽힌다) · 제목을 「결제되어 있습니다」로 쓰지 말 것(방금 결제가 끝났다로 읽힌다) · 「결제한 기간」 ⛔(무료 손님에겐 틀린 말)
  S14f: ['alert', 'ic-warn', '이용 기간이 {날짜}까지 남아 있습니다', ['지금 결제하시면 {날짜}이 지난 다음 날부터 1개월이 이어집니다.', '다른 컴퓨터 번호를 넣으셨다면 ‘번호 고치기’를 눌러 주세요.'], [['번호 고치기'], ['그만두기'], ['계속 결제', 1]]],
  S14g: ['alert', 'ic-warn', '이용 기간이 일주일 넘게 남아 있습니다', ['지금 결제하시면 지금 기간이 끝난 다음 날부터 1개월이 이어집니다. 끝나는 날은 큐쏙 앱의 설정 › 이용 상태에서 볼 수 있습니다.', '다른 컴퓨터 번호를 넣으셨다면 ‘번호 고치기’를 눌러 주세요.'], [['번호 고치기'], ['그만두기'], ['계속 결제', 1]]],
  // 이번 결제까지 붙이면 끝나는 날이 오늘부터 3개월을 넘을 때(KG 「총 이용 3개월 이내」 — 6→3 11-23) — 막는다(서버 too_far, 대표 11-16 · 문구 ux-writing). 「도용」·「안전장치」 같은 이유는 쓰지 않는다
  S14i: ['alert', 'ic-bad', '미리 결제는 오늘부터 3개월 안까지만 할 수 있습니다', [NOPAID + ' 지금 이용 기간이 {끝나는 날}까지라, 1개월을 더하면 오늘부터 3개월을 넘습니다.', '{가능한 날}부터 다시 결제할 수 있습니다.', '그 전에 결제가 꼭 필요하시면 ' + MAIL + '으로 문의해 주세요.'], [['닫기', 1]]],
  S14j: ['alert', 'ic-bad', '미리 결제는 오늘부터 3개월 안까지만 할 수 있습니다', [NOPAID + ' 지금 결제하면 1개월을 더한 이용 기간이 오늘부터 3개월을 넘습니다.', '지금 이용 기간이 끝나는 날은 큐쏙 앱의 설정 › 이용 상태에서 볼 수 있습니다. 끝나는 날이 가까워지면 다시 결제해 주세요.', '그 전에 결제가 꼭 필요하시면 ' + MAIL + '으로 문의해 주세요.'], [['닫기', 1]]],
  // ⛔ NOPAID로 시작하지 말 것 — 방금 결제한 분이 「앞 결제가 안 됐다」로 읽는다 · 「다시 결제」 안내 금지(두 번 결제된다)
  // 「몇 분 안에 적용」 같은 약속 금지 — 비상 정지·오픈 기념 횟수 넘침도 이 창에 온다(독립 리뷰 11-16)
  S14h: ['info', 'ic-info', '이 번호로 방금 한 결제를 확인하고 있습니다', ['앞 결제를 확인하는 중이라 이번 결제는 진행하지 않았습니다. 다시 결제하지 않으셔도 됩니다.', '확인이 끝나면 결제 이메일로 알려 드립니다.', '메일이 오지 않으면 ' + MAIL + '으로 문의해 주세요.'], [['닫기', 1]]],
  S6c: ['info', 'ic-info', '결제되지 않았습니다', ['결제창이 닫혔거나 승인되지 않아 결제가 진행되지 않았습니다.', '요금제를 골라 다시 결제할 수 있습니다.'], [['닫기', 1]]],
  S10b: ['info', 'ic-info', '지금은 정식판 구매를 받지 않고 있습니다', ['이 페이지를 연 사이 구매가 닫혀 결제되지 않았습니다.', '7일 무료 체험은 지금도 이용할 수 있습니다.'], [['닫기', 1]]],
};
const dlg = $('ms');
function closeModal() { if (dlg.open) dlg.close(); }
function modal(key, vars = {}) {   // vars = { 날짜: '12월 30일', … } — 문구의 {날짜} 자리에
  const [i, cls, title, body, acts] = M[key];
  const fill = (t) => t.replace(/\{([^}]+)\}/g, (all, k) => vars[k] ?? all);
  dlg.innerHTML = `<h2 class="ms-t" id="msT">${ic(i, cls)}<span>${esc(fill(title))}</span></h2><div class="ms-b" id="msB">${body.map((p) => `<p>${esc(fill(p))}</p>`).join('')}</div><div class="ms-acts">${acts.map(([t, pri]) => `<button type="button" class="ms-btn ${pri ? 'pri' : ''}" data-ms="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
  // 묻는 창(그만두기 있음)은 처음 선택을 「그만두기」에 — Enter 한 번에 결제창이 열리지 않게(design 11-16). 나머지는 주 단추
  closeModal(); dlg.showModal(); (dlg.querySelector('[data-ms="그만두기"]') || dlg.querySelector('.pri') || dlg.querySelector('button')).focus();
}
dlg.addEventListener('close', () => { if (!$('pay').hidden) $('payBtn').focus({ preventScroll: true }); });
dlg.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ms]'); if (!b) return; const t = b.dataset.ms; closeModal();
  if ((t === '결제창 다시 열기' || t === '다시 시도') && !$('pay').hidden) $('payBtn').click();
  else if (t === '카드 등록 창 다시 열기' && !$('pay').hidden) $('payBtn').click();
  else if (t === '매달 결제로 바꾸기') { setProduct('monthly'); $('payBtn').scrollIntoView({ block: 'center', behavior: 'instant' }); }
  // 창이 닫힐 때(close 이벤트, 나중에 온다) 결제 단추로 돌아가는 포커스를 덮어쓰게 한 박자 뒤에 — 안 그러면 Enter가 결제 단추를 또 누른다(리뷰 11-16)
  else if (t === '번호 고치기') { $('m1').scrollIntoView({ block: 'center', behavior: 'instant' }); setTimeout(() => $('m1').focus({ preventScroll: true }), 0); }
  else if (t === '새로고침') location.reload();
  else if (t === '계속 결제' && !$('pay').hidden && LIVE && validate()) payLive(true);   // 결제 단추와 같은 입력 확인을 거친다
});

// ── 자동 결제 해지·계속 여부 — 판매 페이지 해지 칸 + 메일 링크 화면. 서버 판정 = worker/lib/autopay-cancel.js(앱·메일과 한 벌) ──
// 날짜 「3월 20일」 — 같은 식의 kDay가 미커밋 「미리 결제 확인창」(다른 작업)에 있어 이름을 따로 둔다(그쪽 커밋 때 하나로 합칠 것)
const apKDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '') ? `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일` : '';
// ⛔ 서버 값(날짜·번호·금액)은 글자로만(esc) · ⛔ 시험판(공개 주소, LIVE 아님)은 결제 서버를 부르지 않는다(§14p) — 자동 결제가 실제로 생길 수 없어 「찾지 못했습니다」와 같다
const won = (n) => typeof n === 'number' ? n.toLocaleString('ko-KR') + '원' : '';
const kDayW = (d) => apKDay(d) && `${apKDay(d)}(${'일월화수목금토'[new Date(d + 'T00:00:00Z').getUTCDay()]})`;   // 「3월 20일(목)」
const addDay = (d, n) => apKDay(d) ? new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10) : '';
const AP_ALT = '큐쏙 앱의 설정 › 이용 상태나 결제 안내 메일의 ‘자동 결제 해지하기’ 버튼으로도 해지할 수 있습니다.';
// 해지된 뒤의 말 — 해지 칸과 메일 링크 화면이 같은 문장(ux-writing 11-20). 되돌릴 수 없는 까닭은 서버 undo_block으로(PC 시계로 짐작 ✕)
function apCancelledLines(j) {
  if (j.can_undo) return { strong: `${kDayW(j.until)}까지 지금처럼 사용하실 수 있습니다.`, rest: `${kDayW(j.next_charge_on)} 결제는 하지 않습니다. 만드신 문제는 지워지지 않습니다.` };
  // locked = 결제 이메일 변경 신고로 큐쏙이 해지(약관 1.7 · 0016) — 먼저 가른다(아니면 「결제일이 되어」 거짓 이유). 누가 바꿨는지·신고는 말하지 않는다(보는 사람이 바꾼 쪽일 수 있다 — ux-writing 11-23)
  if (j.undo_block === 'locked') return { strong: `${kDayW(j.until)}까지 사용하실 수 있습니다.`, rest: '결제 이메일이 바뀐 일로 연락을 받아 큐쏙이 해지한 자동 결제라, 해지를 취소할 수 없습니다.'
    + (j.charge_pending ? ' 이번 회차가 결제되었다면 자동으로 전액 취소합니다.' : '') + ` 궁금하신 점은 ${MAIL}으로 보내 주세요. 만드신 문제는 지워지지 않습니다.` };
  return { strong: `${kDayW(j.until)}까지 사용하실 수 있습니다.`, rest: (j.undo_block === 'charging'
    ? '이번 자동 결제가 이미 시작되어 해지를 취소할 수는 없습니다. 결제가 되었다면 자동으로 전액 취소합니다.'
    : '결제일이 되어 해지를 취소할 수는 없습니다. 이번 회차가 결제되었다면 자동으로 전액 취소합니다.') + ' 만드신 문제는 지워지지 않습니다.' };
}

// 해지 칸(메일 없이 해지 — 대표 11-19 ㉠ 원클릭 · design·ux-writing 11-20) → /pay/autopay/web-cancel. 확인창 없이 바로(해지 취소 기한이 따로 있다) · 결과는 칸 안 띠 하나
// 404는 어느 칸이 틀렸는지 표시하지 않는다(서버도 말하지 않는다 — 남의 번호로 자동 결제 여부를 못 알아내게)
function apBoxSlots() {
  ['cmSlot', 'ceSlot'].forEach((i) => { $(i).classList.remove('bad'); $(i).querySelector('.s-err').textContent = ''; });
  ['cm', 'ce'].forEach((i) => $(i).removeAttribute('aria-invalid'));
}
function apBoxLock(on, busy) {
  $('cm').disabled = $('ce').disabled = $('apBtn').disabled = on;
  $('apBtn').innerHTML = busy ? SVG.spin + '<span>해지하는 중…</span>' : '자동 결제 해지';
}
const apRes = (cls, title, ps) => { $('apRes').innerHTML = `<div class="band ${cls}"><b>${esc(title)}</b>${ps.map((p) => `<p>${p}</p>`).join('')}</div>`; };   // ps = 이미 esc 한 조각
$('apBtn').onclick = async () => {
  const m = norm($('cm').value), em = $('ce').value.trim(), e1 = machineErr(m), e2 = emailErr(em);
  apBoxSlots(); $('apRes').innerHTML = '';
  if (e1) { $('cm').setAttribute('aria-invalid', ''); slotErr($('cmSlot'), e1); }
  if (e2) { $('ce').setAttribute('aria-invalid', ''); slotErr($('ceSlot'), e2); }
  if (e1 || e2) { (e1 ? $('cm') : $('ce')).focus(); return; }
  if (!LIVE) { apBoxShow({ code: 404, j: { error: 'not_found' } }); return; }   // 시험판 — 위 ⛔(같은 입력 확인을 거친 뒤 서버 대신 「찾지 못했습니다」)
  apBoxLock(true, true);
  let r = null;
  try { r = await post('/pay/autopay/web-cancel', { machine_id: m, email: em }); } catch { /* 닿지 않음 — 아래 「확인하지 못했습니다」 */ }
  apBoxShow(r);
};
function apBoxShow(r) {
  const j = r?.j || {}, st = j.state;
  if (r && (r.ok || r.code === 409) && st === 'cancelled') {   // 해지됨(이미 해지돼 있던 것도 같은 답) — 칸은 잠근 채
    apBoxLock(true, false);
    const L = apCancelledLines(j);
    return apRes('mute', '자동 결제를 해지했습니다', [`<strong>${esc(L.strong)}</strong>${esc(L.rest)}`,
      esc('해지 안내 메일을 결제 이메일로 보내 드립니다.' + (j.can_undo ? ` 마음이 바뀌시면 ${kDayW(j.undo_deadline)} 밤 11시 59분까지 그 메일이나 큐쏙 앱의 설정 › 이용 상태에서 해지를 취소하실 수 있습니다.` : ''))]);
  }
  apBoxLock(false, false);
  if (r?.code === 409 && st === 'ending') return apRes('mute', '이미 ‘계속하지 않기’를 선택하셨습니다', [esc(`${kDayW(j.until)}까지 사용하신 뒤 자동 결제와 이용권이 종료됩니다. 따로 해지하지 않으셔도 이후로는 결제되지 않습니다.`)]);
  if (r?.code === 409 && st === 'ended') return apRes('mute', `${apKDay(j.ended_on) ? kDayW(j.ended_on) + '에 ' : ''}이 컴퓨터 번호의 자동 결제는 이미 종료되었습니다`,
    [esc('이후로는 결제되지 않습니다. 만드신 문제는 지워지지 않으며, 문제 DB에서 만든 문제 보기와 백업 저장은 언제든 하실 수 있습니다.')]);
  if (!r) return apRes('warn', '해지되었는지 확인하지 못했습니다', [esc('인터넷 연결을 확인한 뒤 다시 눌러 주세요. 이미 해지되었다면 다시 눌러도 그대로 해지된 상태로 나옵니다.')]);
  if (r.code === 404 && j.error === 'not_found') {
    apRes('warn', '입력하신 정보로 자동 결제를 찾지 못했습니다', [esc('해지되지 않았습니다. 컴퓨터 번호와 결제 이메일을 다시 확인해 주세요. 결제 이메일은 결제 안내 메일을 받은 주소이며, 체험을 신청한 이메일과 다를 수 있습니다.'),
      esc(AP_ALT), esc(`그래도 안 되면 ${MAIL}으로 문의해 주세요.`)]);
    $('cm').focus(); return;
  }
  if (r.code === 429) { apRes('warn', '오늘 해지 시도가 너무 많습니다', [esc('해지되지 않았습니다. 큐쏙 앱의 설정 › 이용 상태나 결제 안내 메일의 ‘자동 결제 해지하기’ 버튼으로는 지금 바로 해지할 수 있습니다.'), esc('이 페이지에서는 내일 다시 해 주세요.')]); $('apBtn').disabled = true; return; }
  if (r.code === 400) return apRes('warn', '컴퓨터 번호와 결제 이메일을 다시 확인해 주세요', [esc('해지되지 않았습니다.')]);
  apRes('warn', '지금은 해지를 처리하지 못했습니다', [esc('해지되지 않았습니다. 입력하신 정보가 틀렸다는 뜻은 아닙니다. 잠시 뒤 다시 눌러 주세요.'), esc(AP_ALT)]);
}

// 메일 링크 화면(?renew= 계속 여부 · ?cancel= 해지·해지 취소) — 시안 v299 + v302(대표 11-19: 알약 단추 · 「~할까요?」 · 해지 화면 출구 = 작은 글 + 큐쏙 홈으로)
// ⛔ 여는 것만으로는 아무것도 바꾸지 않는다 — view 먼저(메일 앱이 링크를 미리 열어 본다). 바꾸는 건 단추(POST)뿐. 문장은 메일(결제 서버 subMail)과 같게
const LINK_T = /^[0-9a-f]{32}\.[A-Za-z0-9_-]{32}$/;   // = 결제 서버 LINK_RE(모양이 틀리면 부르지 않는다)
let apKind = '', apT = '', apJ = null, apBusy = false;
function apShow(title, body, dek = '') {
  show('ap');
  $('apHead').innerHTML = `<h1 id="apTitle" tabindex="-1">${esc(title)}</h1>` + (dek ? `<p class="rn-dek">${esc(dek)}</p>` : '');
  $('apBody').innerHTML = body;
}
const apBand = (cls, strong, ps) => `<div class="band ${cls}">${strong ? `<b>${esc(strong)}</b>` : ''}${ps.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
const apNote = (t) => t ? `<div class="band warn rn-note" role="alert"><p>${esc(t)}</p></div>` : '';   // 다시 그린 화면 위 알림 — 화면 읽기가 바로 읽게(a11y 11-21)
const apBig = (act, label, cls = '') => `<button class="pay-btn ${cls}" type="button" data-ap="${act}">${esc(label)}</button>`;
const apSmall = (act, label) => `<div class="band-acts"><button class="sbtn" type="button" data-ap="${act}">${esc(label)}</button></div>`;
const apAfter = (...t) => `<p class="rn-after">${t.map(esc).join('<br>')}</p>`;
const apTerms = (rows) => `<dl class="terms">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;   // v = 이미 esc 한 조각
const apMid = (j) => `<code>${esc(j.machine_id ?? '')}</code>`;
const AGAIN = '이후로는 결제되지 않습니다. 만드신 문제는 지워지지 않으며, 문제 DB에서 만든 문제 보기와 백업 저장은 언제든 하실 수 있습니다.';

function apRenew(j, note = '') {
  const nx = j.next_charge_on, dl = j.deadline, a = won(j.amount_next);
  if (j.state === 'ask') return apShow('자동 결제를 계속할까요?', apNote(note)
    + `<div class="picked rn-amt"><span class="k">지금</span><span class="was">매달 ${esc(won(j.amount_now))}<small>오픈 기념 ${esc(j.used ?? '')}회 결제 완료 · ${esc(apKDay(dl))}까지</small></span>`
    + `<span class="k">${esc(apKDay(nx))}부터</span><span class="now">매달 ${esc(a)}<small>월 ${esc(won(Math.round(j.amount_next * 10 / 11)))} + 부가세</small></span></div>`
    + apTerms([['컴퓨터 번호', apMid(j)], ['선택 기한', `<b>${esc(kDayW(dl))} 밤 11시 59분까지</b>`]])
    + `<div class="rn-btns">${apBig('yes', a + '으로 계속하기')}${apBig('no', '계속하지 않기', 'ghost')}</div>`
    + apAfter(`계속하지 않으시면 ${apKDay(dl)}에 자동 결제와 이용권이 종료되고, ${apKDay(nx)}부터 문제 추출·편집 등 기능이 잠깁니다. 만드신 문제는 지워지지 않습니다.`,
      '계속하신 뒤에도 결제일 전날까지 언제든 해지하실 수 있으며, 위약금은 없습니다.'),
    `계속하시면 ${apKDay(nx)} 결제부터 ${a}입니다`);
  if (j.state === 'yes') return apShow('자동 결제가 이어집니다', apNote(note)
    + apTerms([['다음 결제', `<b>${esc(kDayW(nx))} · ${esc(a)}</b>`], ['그 뒤', '해지하실 때까지 한 달마다'], ['컴퓨터 번호', apMid(j)]])
    + apAfter('확인 메일을 보내 드립니다.', '해지는 메일의 ‘자동 결제 해지하기’ 버튼이나 큐쏙 앱의 설정 › 이용 상태에서 하실 수 있으며, 위약금은 없습니다.'));
  if (j.state === 'no') return apShow('‘계속하지 않기’를 선택하셨습니다', apNote(note)
    + apBand('mute', `${apKDay(dl)}까지 지금처럼 사용하실 수 있습니다.`, [`${apKDay(nx)}부터 문제 추출·편집 등 기능이 잠기며, 이후로는 결제되지 않습니다. 만드신 문제는 지워지지 않습니다.`])
    + apAfter(`마음이 바뀌시면 ${apKDay(dl)} 밤 11시 59분까지 아래 버튼으로 계속하실 수 있습니다. 확인 메일에도 같은 버튼이 있습니다.`)
    + apSmall('yes', a + '으로 계속하기'));
  if (j.state === 'closed') return apShow('계속하기 기한이 지났습니다', apNote(note)
    + apBand('mute', `${apKDay(dl)}까지 ‘계속하기’를 누르지 않으셔서 자동 결제와 이용권이 종료되었습니다.`, [AGAIN]) + apSmall('shop', '다시 결제하기'));
  if (j.state === 'ended') return apShow('자동 결제가 이미 종료되었습니다', apNote(note) + apBand('mute', '', [AGAIN]) + apSmall('shop', '다시 결제하기'));
  // none(아직 오픈 기념 회차가 남음 · 이미 바뀐 금액으로 이어지는 중 · 결제일이 30일보다 멂) 과 모르는 값
  apShow('지금은 고르실 것이 없습니다', apNote(note)
    + apBand('mute', '', ['자동 결제는 지금처럼 이어집니다. 계속할지 여쭤야 할 때가 되면 메일로 다시 알려 드립니다.']));
}
function apCancel(j, action, ok, note = '') {
  const N = j.next_charge_on;
  if (j.state === 'active' && action === 'undo' && ok) return apShow('해지를 취소했습니다',
    apBand('mute', '자동 결제가 그대로 이어집니다.', [`다음 결제일은 ${kDayW(N)}입니다.`]) + apAfter('확인 메일을 결제 이메일로 보내 드립니다.'));
  if (j.state === 'active') {
    const U = j.until_if_cancel, late = j.undo_if_cancel === false;   // late = 결제일이 이미 됨 — 오늘까지 쓰고, 되돌리기 없음
    return apShow('자동 결제를 해지할까요?', apNote(note)
      + apTerms([['컴퓨터 번호', apMid(j)], ['사용 기간', `<b>${esc(kDayW(U))}까지</b> 그대로`], ['다음 결제', `${esc(kDayW(N))} → <b>하지 않음</b>`]])
      + `<div class="rn-btns one">${apBig('cancel', '자동 결제 해지')}</div>`
      + apAfter(late ? '오늘 해지하시면 해지 취소는 할 수 없습니다. 이번 회차가 결제되었다면 자동으로 전액 취소합니다. 만드신 문제는 지워지지 않습니다. 위약금은 없습니다.'
        : `${apKDay(addDay(U, 1))}부터 문제 추출·편집 등 기능이 잠기며, 만드신 문제는 지워지지 않습니다. ${apKDay(j.undo_deadline)} 밤 11시 59분까지는 이 화면이나 큐쏙 앱에서 ‘해지 취소’로 되돌리실 수 있습니다. 위약금은 없습니다.`)
      + '<p class="rn-quiet">해지하지 않으시려면 이 창을 닫으셔도 됩니다. · <a href="../">큐쏙 홈으로</a></p>',
      '해지하셔도 이미 결제하신 기간은 끝까지 사용하실 수 있습니다');
  }
  if (j.state === 'cancelled') {
    const L = apCancelledLines(j), mail = action === 'cancel' && ok ? '해지 안내 메일을 결제 이메일로 보내 드립니다.' : '', failUndo = action === 'undo' && !j.can_undo;   // 엇갈려 다시 읽은 상태가 아직 해지 취소 가능이면 실패 판 아님(독립 리뷰 11-20)
    return apShow(failUndo ? '지금은 해지 취소를 할 수 없습니다' : '자동 결제를 해지했습니다', apNote(note)
      + apBand('mute', L.strong, [L.rest])
      + (j.can_undo ? apAfter(`${mail ? mail + ' ' : ''}마음이 바뀌시면 ${apKDay(j.undo_deadline)} 밤 11시 59분까지 아래 ‘해지 취소하기’ 버튼으로 되돌리실 수 있습니다. 큐쏙 앱의 설정 › 이용 상태에서도 할 수 있습니다.`) + apSmall('undo', '해지 취소하기')
        : failUndo ? apAfter('계속 사용하시려면 이 페이지에서 다시 결제해 주세요.') + apSmall('shop', '다시 결제하기')
        : mail ? apAfter(mail) : ''));
  }
  if (j.state === 'ending') return apShow('이미 ‘계속하지 않기’를 선택하셨습니다', apNote(note)
    + apBand('mute', '', [`${kDayW(j.until)}까지 사용하신 뒤 자동 결제와 이용권이 종료됩니다. 따로 해지하지 않으셔도 이후로는 결제되지 않습니다.`]));
  apShow(`${apKDay(j.ended_on) ? kDayW(j.ended_on) + '에 ' : ''}이 컴퓨터 번호의 자동 결제는 이미 종료되었습니다`, apNote(note) + apBand('mute', '', [AGAIN]) + apSmall('shop', '다시 결제하기'));
}
// 링크가 맞지 않음(모양 틀림 · 서버 404 · 400) — 메일 없이 해지할 길을 같이 둔다(해지 칸이 보일 때만)
function apBadLink(kind) {
  const box = !document.querySelector('.ap-box').hidden;
  apShow('링크를 열지 못했습니다', apBand('warn', '', ['주소가 잘렸거나 맞지 않는 링크입니다. 받으신 메일의 버튼을 다시 눌러 주세요.',
    ...(kind === 'cancel' ? ['큐쏙 앱의 설정 › 이용 상태에서도 해지할 수 있습니다.'] : []), `그래도 안 되면 ${MAIL}으로 문의해 주세요.`])
    + (box ? '<p class="rn-after"><a href="#cancel" data-ap="tocancel">번호와 이메일로 해지하기</a></p>' : ''));
}
function apFail(kind, r, acted) {
  if (r && ((r.code === 404 && r.j?.error === 'not_found') || r.code === 400)) return apBadLink(kind);
  const t = !r ? (acted ? '처리되었는지 확인하지 못했습니다' : '화면을 불러오지 못했습니다') : r.code === 429 ? '요청이 너무 많습니다' : '지금은 처리하지 못했습니다';
  const p = !r ? (acted ? '인터넷 연결을 확인한 뒤 ‘다시 불러오기’를 눌러 지금 상태를 확인해 주세요. 이미 처리되었다면 처리된 상태로 나옵니다.' : '인터넷 연결을 확인한 뒤 ‘다시 불러오기’를 눌러 주세요.')
    : (acted ? '처리되지 않았습니다. ' : '') + '잠시 뒤 ‘다시 불러오기’를 눌러 주세요.';
  apShow(t, apBand('warn', '', [p]) + apSmall(kind === 'card' ? 'cardview' : 'view', '다시 불러오기'));   // 카드 링크는 서명 열쇠가 달라 해지 길(view)로 보내면 「링크를 열지 못했습니다」가 된다(독립 리뷰 11-21)
}
// ── 자동 결제 카드 변경(대표 11-20·11-21 · ux-writing·legal·security 11-21) ──
// ①해지 칸 [카드 변경] → /pay/autopay/card-ask: 맞으면 보냄 · 하나라도 틀리면 바로 「찾지 못했습니다」(해지 칸과 같은 답 — 대표 11-21) · 맞는데 못 바꾸면 까닭
// ②메일 링크 ?card= → /pay/autopay/card(view · start · register). 카드는 포트원 카드 등록 창(정기 채널)에서만 — 카드 번호는 이 페이지·결제 서버로 오지 않는다
// ⛔ 이름·휴대폰은 카드 등록 창으로만(결제 서버엔 안 보낸다) · 결제 이메일은 창 열기 전에 결제 서버가 견주기만 한다(돌려주지 않는다 — 가린 꼴도)
$('cardBtn').onclick = async () => {
  const m = norm($('cm').value), em = $('ce').value.trim(), e1 = machineErr(m), e2 = emailErr(em);
  apBoxSlots(); $('apRes').innerHTML = '';
  if (e1) { $('cm').setAttribute('aria-invalid', ''); slotErr($('cmSlot'), e1); }
  if (e2) { $('ce').setAttribute('aria-invalid', ''); slotErr($('ceSlot'), e2); }
  if (e1 || e2) { (e1 ? $('cm') : $('ce')).focus(); return; }
  const lock = (on) => { $('cm').disabled = $('ce').disabled = $('apBtn').disabled = $('cardBtn').disabled = on; $('cardBtn').innerHTML = on ? SVG.spin + '<span>보내는 중…</span>' : '카드 변경'; };
  let r = null;
  if (LIVE) { lock(true); try { r = await post('/pay/autopay/card-ask', { machine_id: m, email: em }); } catch { /* 닿지 않음 */ } lock(false); }
  else r = { ok: false, code: 404, j: { error: 'not_found' } };   // 시험판 — 결제 서버를 부르지 않는다(§14p). 자동 결제가 생길 수 없어 「찾지 못했습니다」(해지 칸과 같게)
  const j = r?.j || {};
  if (r?.ok) return apRes('mute', '카드 변경 메일을 보냈습니다', [esc('결제 이메일로 보냈습니다. 30분 안에 메일의 ‘카드 변경하기’를 눌러 새 카드를 등록해 주세요. 카드는 새 카드를 등록해야 바뀝니다. 메일을 여러 통 받으셨다면 가장 최근 메일의 버튼만 쓰실 수 있습니다.'),
    esc('메일은 결제 이메일 메일함으로 갑니다. 그 메일을 받은 분이 30분 안에 열어 주세요. 몇 분이 지나도 오지 않으면 스팸함을 확인해 주세요.')]);
  if (!r) return apRes('warn', '요청이 전달되었는지 확인하지 못했습니다', [esc('인터넷 연결을 확인한 뒤 다시 눌러 주세요. 메일이 두 통 오면 나중에 받은 메일의 버튼을 눌러 주세요.')]);
  // 틀림·자동 결제 없음 = 해지 칸과 같은 답(대표 11-21 — 하나라도 틀리면 바로 알린다)
  if (r.code === 404) { apRes('warn', '입력하신 정보로 자동 결제를 찾지 못했습니다', [esc('메일은 보내지 않았습니다. 컴퓨터 번호와 결제 이메일을 다시 확인해 주세요. 결제 이메일은 결제 안내 메일을 받은 주소이며, 체험을 신청한 이메일과 다를 수 있습니다.'),
    esc('결제 이메일이 기억나지 않으시면 큐쏙 앱 › 설정 › 이용 상태에서 ‘카드 변경’을 눌러 주세요. 이메일을 넣지 않아도 결제 이메일로 보내 드립니다.'), esc(`그래도 안 되면 ${MAIL}으로 문의해 주세요.`)]); $('cm').focus(); return; }
  // 맞는데 지금은 못 바꿈 — 까닭(메일 없음)
  if (r.code === 409 && j.state === 'cancelled') return apRes('mute', '자동 결제를 해지하셔서 카드를 변경할 수 없습니다', [esc('다음 결제가 없으니 카드를 바꾸지 않으셔도 됩니다.'),
    esc(j.can_undo ? '새 카드로 계속하시려면 먼저 큐쏙 앱 › 설정 › 이용 상태나 해지 안내 메일에서 해지를 취소한 뒤 다시 눌러 주세요.' : '계속 사용하시려면 이 페이지에서 다시 결제해 주세요.')]);
  if (r.code === 409 && j.state === 'ending') return apRes('mute', '이미 ‘계속하지 않기’를 선택하셨습니다', [esc(`${kDayW(j.until)}까지 사용하신 뒤 자동 결제가 종료되어 카드를 바꾸지 않으셔도 됩니다.`)]);
  if (r.code === 409 && j.state === 'charging') return apRes('mute', '지금은 카드를 변경할 수 없습니다', [esc(`${apKDay(j.next_charge_on) ? kDayW(j.next_charge_on) + ' ' : ''}결제를 처리하는 중입니다. 결제 결과는 결제 이메일로 알려 드립니다. 결제가 끝난 뒤 다시 눌러 주세요.`), esc(CARD_FAIL)]);
  if (r.code === 409) return apRes('mute', '이 컴퓨터 번호의 자동 결제는 이미 종료되어 카드를 바꿀 수 없습니다', [esc((apKDay(j.ended_on) ? `${kDayW(addDay(j.ended_on, -1))}까지 사용하신 이용권이 끝났습니다. ` : '') + AGAIN),   // 카드 실패로 끝난 분(ux-flow·강사 역할 리뷰 11-21)
    esc('카드를 바꾸는 대신 다시 결제하시면 바로 잠금이 풀리고, 만드신 문제를 그대로 이어서 사용하실 수 있습니다.') + ' <a href="#shop" data-top>위쪽 요금제 보기</a>']);
  if (r.code === 429 && j.error === 'mail_busy') return apRes('warn', '지금은 카드 변경 메일을 보내지 못했습니다', [esc('오늘 보낼 수 있는 메일이 모두 나갔습니다. 카드와 자동 결제는 그대로입니다. 내일 다시 눌러 주세요.'), esc(`다음 결제일이 내일이면 컴퓨터 번호와 함께 ${MAIL}으로 알려 주세요.`)]);   // 하루 전체 몫(cs·ux-flow 11-21)
  if (r.code === 429 && j.error === 'mail_cap') return apRes('warn', '오늘은 카드 변경 메일을 더 보낼 수 없습니다', [esc('오늘 보낼 수 있는 횟수를 모두 사용했습니다. 30분이 지나지 않았다면 가장 최근에 받은 메일의 ‘카드 변경하기’를 눌러 주세요. 아니면 내일 다시 해 주세요.')]);
  if (r.code === 429) { apRes('warn', '오늘 카드 변경 요청이 너무 많습니다', [esc('메일은 보내지 않았습니다. 30분 안에 받은 카드 변경 메일이 있으면 그 메일의 ‘카드 변경하기’를 눌러 주세요.'), esc('이 페이지에서는 내일 다시 해 주세요.')]); $('cardBtn').disabled = true; return; }
  if (r.code === 400) return apRes('warn', '컴퓨터 번호와 결제 이메일을 다시 확인해 주세요', [esc('메일은 보내지 않았습니다.')]);
  apRes('warn', '지금은 카드 변경 메일을 보내지 못했습니다', [esc('입력하신 정보가 틀렸다는 뜻은 아닙니다. 잠시 뒤 다시 눌러 주세요.')]);
};

const kHm = (sec) => { if (typeof sec !== 'number') return ''; const d = new Date((sec + 9 * 3600) * 1000), h = d.getUTCHours(), mi = d.getUTCMinutes(); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시${mi ? ` ${mi}분` : ''}`; };   // 「오후 3시 42분」(KST)
const kAt = (sec) => { if (typeof sec !== 'number') return ''; const d = new Date((sec + 9 * 3600) * 1000).toISOString(); return `${apKDay(d.slice(0, 10))} ${d.slice(11, 16)}`; };   // 「3월 5일 10:12」
const PHONE = /^01\d{8,9}$/;
const NEW_LINK = apSmall('tocancel', '번호와 이메일로 카드 변경 메일 받기');
const NEW_LINK_SMALL = '<p class="rn-after"><a href="#cancel" data-ap="tocancel">새 카드 변경 메일 받기</a></p>';   // 「최근 메일을 쓰세요」가 먼저인 화면 — 단추 대신 작은 글 링크(강사 역할 리뷰 11-21)
const CARD_FAIL = '결제가 되지 않으면 자동 결제가 종료되며, 그때는 판매 페이지(qssok.com/buy) 위쪽 요금제에서 다시 결제하시면 바로 잠금이 풀립니다.';   // 결제 처리 중 세 곳 한 벌(ux-flow 11-21)
const CARD_END = '<p class="rn-quiet">큐쏙 앱에서 따로 하실 일은 없습니다. 이 창은 닫으셔도 됩니다. <span class="nw">· <a href="../">큐쏙 홈으로</a></span></p>';   // 끝나는 화면 출구(done·used·ended — ux-flow·ui-visual 11-21)
const cardMid = (j) => j.machine_id ? apTerms([['컴퓨터 번호', apMid(j)]]) : '';   // 폰으로 연 분이 새 링크를 받을 때 번호를 보고 넣게(ux-flow 11-21)   // 형제 화면(처리 중·이메일 다름)과 같은 알약 단추(ui-visual 11-21)
function cardView(j, note = '') {
  const N = j.next_charge_on, amt = won(j.amount);
  if (j.state === 'ok') return apShow('자동 결제 카드 변경', apNote(note)
    + apTerms([['컴퓨터 번호', apMid(j)], ['다음 결제', `<b><span class="nw">${esc(kDayW(N))}</span>${amt ? ' · <span class="nw">' + esc(amt) + '</span>' : ''}</b>`], ['결제 이메일', j.pay_to_hint ? `<span class="nw">${esc(j.pay_to_hint)}</span>` : '결제 안내 메일을 받은 주소']])   // 가린 주소(링크 화면만 — 대표 11-21) · 폰에서 날짜·금액이 꺾이지 않게
    + '<div class="card-form">'   // 테두리 판 ✕(겹 상자) — 위 구분선 한 줄로만 나눈다(ui-visual 11-21)
    + `<div class="fd"><label for="cn">카드 주인 이름</label><input id="cn" autocomplete="name" aria-describedby="cnSlot"><div class="slot stack" id="cnSlot"><span class="s-err"></span></div></div>`
    + `<div class="fd"><label for="cp">카드 주인 휴대폰 번호</label><input id="cp" type="tel" inputmode="numeric" autocomplete="tel" placeholder="숫자만 (예: 01012345678)" aria-describedby="cpSlot"><div class="slot stack" id="cpSlot"><span class="s-err"></span></div></div>`
    // 결제 이메일 — 그대로 쓰려면 지금 주소, 바꾸려면 새 주소(대표 11-21 ㉡). 잘못 치면 안내가 엉뚱한 곳으로 가니 두 번 넣는다
    + `<div class="fd"><label for="cx">결제 이메일 <small>그대로 쓰시려면 지금 주소${j.pay_to_hint ? '(' + esc(j.pay_to_hint) + ')' : ''}를, 바꾸시려면 새 주소를 넣어 주세요</small></label><input id="cx" type="email" autocomplete="email" spellcheck="false" placeholder="name@example.com" aria-describedby="cxSlot"><div class="slot stack" id="cxSlot"><span class="s-err"></span></div></div>`
    + `<div class="fd"><label for="cx2">결제 이메일 다시 입력</label><input id="cx2" type="email" autocomplete="off" spellcheck="false" aria-describedby="cx2Slot"><div class="slot stack" id="cx2Slot"><span class="s-err"></span></div></div>`
    + `<label class="ag"><input type="checkbox" id="cAgree" aria-describedby="cAgreeSlot"><span><b>[필수] ${esc(kDayW(N))} 결제부터 새 카드로 결제되는 것에 동의합니다.</b><small>결제일·금액 등 자동 결제 조건은 지금과 같습니다. <strong>오늘은 결제되지 않습니다.</strong></small></span></label><div class="slot stack" id="cAgreeSlot"><span class="s-err"></span></div>`
    + '</div>'
    + apAfter('다음 화면은 결제 회사(KG이니시스)의 카드 입력 창입니다. 그 창의 이메일 칸에도 방금 넣으신 결제 이메일을 그대로 넣어 주세요. 그 주소로 앞으로 결제 안내를 보내 드립니다.')   // 단추 위로(강사 역할 리뷰 — 누른 뒤에야 읽혔다)
    + `<div class="rn-btns one">${apBig('cardopen', '카드 등록 창 열기')}</div>`
    + apAfter((kHm(j.until) ? `이 링크는 ${kHm(j.until)}까지 사용하실 수 있습니다. ` : '') + '결제 이메일을 바꾸시면 확인 메일을 바뀌기 전 주소와 새 주소 둘 다로 보내 드립니다.')
    + '<p class="rn-quiet">바꾸지 않으시려면 이 창을 닫으셔도 됩니다. 카드와 자동 결제는 그대로입니다. <span class="nw">· <a href="../">큐쏙 홈으로</a></span></p>',
    '새 카드를 등록하면 다음 결제부터 새 카드로 결제됩니다');
  if (j.state === 'done') return apShow(j.moved ? '자동 결제 카드와 결제 이메일이 변경되었습니다' : '자동 결제 카드가 변경되었습니다',
    apTerms([['다음 결제', `<b>${esc(kDayW(N))}${amt ? ' · ' + esc(amt) : ''} · 새 카드로</b>`], ...(j.moved && j.pay_to_hint ? [['새 결제 이메일', `<span class="nw">${esc(j.pay_to_hint)}</span>`]] : []), ['변경한 시각', esc(kAt(j.done_at))], ['컴퓨터 번호', apMid(j)]])
    + apBand('mute', '오늘 결제된 금액은 없습니다.', ['이전 카드로는 더 결제하지 않습니다. 이전 카드의 결제용 등록 정보는 지체 없이 삭제하며, 만드신 문제와는 상관없습니다.'])
    + apAfter(j.moved ? '확인 메일을 바뀌기 전 주소와 새 주소 둘 다로 보내 드립니다. 앞으로 결제 안내는 새 주소로 갑니다.' : '확인 메일을 결제 이메일로 보내 드립니다.', '다른 컴퓨터도 자동 결제를 쓰고 계시면 그 컴퓨터의 카드는 따로 바꿔 주세요.') + CARD_END);
  if (j.state === 'used') return apShow('이미 카드를 변경한 링크입니다', apBand('mute', '', [(kAt(j.done_at) ? `이 링크로 ${kAt(j.done_at)}에 카드${j.moved ? '와 결제 이메일' : ''}을 변경했습니다. ` : '') + '다음 결제부터 새 카드로 결제됩니다.',
    `직접 하신 것이라면 따로 하실 일은 없습니다. 다시 바꾸시려면 새 링크를 받아 주세요. 직접 하지 않으셨다면 ${MAIL}으로 알려 주세요.`]) + cardMid(j) + NEW_LINK_SMALL + CARD_END);   // 완료 화면을 새로고침한 분이 놀라지 않게(QA 11-21) · 다 끝난 화면 — 「새 메일 받기」는 작게, 이름 하나로
  if (j.state === 'expired') return apShow('링크 사용 시간이 지났습니다', apBand('warn', '', ['카드는 바뀌지 않았습니다. 큐쏙 앱 › 설정 › 이용 상태의 ‘카드 변경’을 누르거나, 이 페이지 아래 칸에서 새 링크를 받아 주세요.']) + cardMid(j) + NEW_LINK);
  if (j.state === 'replaced') return apShow('더 최근에 보낸 메일의 링크를 써 주세요', apBand('warn', '이 링크 뒤로 카드 변경 메일을 한 번 더 보내 드렸습니다.', ['카드는 바뀌지 않았습니다. 메일함에서 ‘[큐쏙] 자동 결제 카드 변경 링크’ 메일 가운데 제목 끝 시각이 가장 늦은 메일의 ‘카드 변경하기’를 눌러 주세요.'])
    + cardMid(j) + NEW_LINK_SMALL);   // 큰 단추로 또 받게 하지 않는다(강사 역할 리뷰 — 메일이 세 통이 됐다)
  if (j.state === 'changed') return apShow('카드가 이미 변경되었습니다', apBand('mute', `${kAt(j.changed_at) ? kAt(j.changed_at) + '에 ' : ''}다른 카드 변경 메일의 링크로 카드가 이미 바뀌었습니다.`, ['다음 결제부터 그 카드로 결제됩니다. 이 링크로는 더 바꿀 수 없습니다.',
    `다시 바꾸시려면 새 링크를 받아 주세요. 직접 변경하지 않으셨다면 ${MAIL}으로 알려 주세요.`]) + cardMid(j) + NEW_LINK_SMALL + CARD_END);
  if (j.state === 'cancelled') return apShow('자동 결제를 해지하셔서 카드를 변경할 수 없습니다', apNote(note) + apBand('mute', '', ['다음 결제가 없으니 카드를 바꾸지 않으셔도 됩니다.',
    j.can_undo ? '새 카드로 계속하시려면 먼저 큐쏙 앱 › 설정 › 이용 상태나 해지 안내 메일에서 해지를 취소한 뒤 새 링크를 받아 주세요.' : '계속 사용하시려면 이 페이지에서 다시 결제해 주세요.'])
    + (j.can_undo ? '' : apSmall('shop', '다시 결제하기')));
  if (j.state === 'ending') return apShow('이미 ‘계속하지 않기’를 선택하셨습니다', apNote(note) + apBand('mute', '', [`${kDayW(j.until)}까지 사용하신 뒤 자동 결제가 종료되어 카드를 바꾸지 않으셔도 됩니다.`]));
  if (j.state === 'charging') return apShow('지금은 카드를 변경할 수 없습니다', apNote(note) + apBand('mute', '', [`${apKDay(N) ? kDayW(N) + ' ' : ''}결제를 처리하는 중입니다. 결제 결과는 결제 이메일로 알려 드립니다. 결제가 끝난 뒤 ‘다시 불러오기’를 눌러 주세요.`, CARD_FAIL])
    + apSmall('cardview', '다시 불러오기'));
  if (j.state === 'no_mail') return apShow('결제 이메일을 확인하지 못했습니다', apBand('warn', '', ['카드는 바뀌지 않았습니다. 카드 입력 창에 이메일을 넣고 다시 해 주세요.', `그래도 안 되면 컴퓨터 번호와 함께 ${MAIL}으로 알려 주세요.`]) + apSmall('cardview', '처음부터 다시 하기'));
  apShow('이 컴퓨터 번호의 자동 결제는 이미 종료되었습니다', apNote(note) + apBand('mute', (j.end_reason === 'failed' ? '카드 결제가 되지 않아 자동 결제가 끝났습니다. ' : '') + (apKDay(j.ended_on) ? `${kDayW(addDay(j.ended_on, -1))}까지 사용하신 이용권이 끝났습니다.` : ''), [AGAIN, '카드를 바꾸는 대신, 아래 버튼에서 다시 결제하시면 바로 잠금이 풀립니다.']) + apSmall('shop', '다시 결제하기') + CARD_END);   // ended · 모르는 값 — 날짜는 앱 「사용 기한」과 같은 날(강사 역할 리뷰: 20일/21일 두 날짜)
}
// action = view · start · register → 그린다. 「창 열기」는 cardOpen, 등록 확인은 cardRegister가 부른다
let cardTried = false;   // 이 탭에서 등록 확인을 보냈다(답이 끊겨도) — 다시 불러와 used면 완료로 그린다
async function cardGo(action, extra = {}, note = '') {
  apKind = 'card';
  if (action === 'register') cardTried = true;
  let r = null;
  try { r = await post('/pay/autopay/card', { t: apT, action, ...extra }); } catch { /* 닿지 않음 */ }
  const j = r?.j || {};
  if (r && (r.ok || r.code === 409) && j.state) {
    if (action !== 'start') apJ = j;   // 창 열기 답엔 가린 주소가 없다 — 보기 답을 지킨다(재리뷰 11-21)
    if (j.state === 'used' && cardTried && action === 'view') return cardView({ ...j, state: 'done' }), r;   // 등록 답 자체가 used면 다른 창이 먼저 바꾼 것 — 그대로(재리뷰 11-21)   // 방금 이 탭에서 등록했고 답만 끊겼던 것 — 「이미 쓴 링크·직접 안 바꾸셨다면」 대신 완료(QA 11-21 ⚠️3)
    if (action !== 'start') cardView(j, note);   // 창 열기(start)의 답은 cardOpen이 그린다 — 이메일만 틀렸는데 넣은 칸이 다 지워지지 않게(독립 리뷰 11-21)
    return r;
  }
  if (r?.code === 409 && j.error === 'billing_mismatch') { apShow('카드가 변경되지 않았습니다', apBand('warn', '', ['이 링크로 연 카드 등록이 아닙니다. 카드는 바뀌지 않았습니다.', '받으신 메일의 ‘카드 변경하기’를 다시 눌러 주세요.'])); return r; }
  if (action === 'register') { apShow('카드가 변경되었는지 확인하지 못했습니다', apBand('warn', '', ['카드 등록 창을 다시 열지 마시고, 인터넷 연결을 확인한 뒤 ‘다시 불러오기’를 눌러 주세요. 변경되었다면 변경된 상태로 나옵니다.', `그래도 확인되지 않으면 ${MAIL}으로 문의해 주세요.`]) + apSmall('cardview', '다시 불러오기')); return r; }
  apFail('card', r, action !== 'view');
  return r;
}
function cardSlot(id, msg) {   // 오류 꼴 = 같은 페이지 slotErr와 같게(⚠ 그림) · 동의 칸은 체크 칸 테두리도(.ag.miss — a11y 11-21)
  const s = $(id + 'Slot'); s.classList.toggle('bad', !!msg); s.querySelector('.s-err').innerHTML = msg ? SVG.warn + `<span>${esc(msg)}</span>` : ''; $(id).toggleAttribute('aria-invalid', !!msg);
  if (id === 'cAgree') $(id).closest('.ag').classList.toggle('miss', !!msg);
}
async function cardOpen() {
  const nm = $('cn').value.trim(), ph = $('cp').value.replace(/[\s-]/g, ''), em = $('cx').value.trim(), em2 = $('cx2').value.trim();
  const errs = [['cn', nm ? '' : '이름을 입력해 주세요.'], ['cp', !ph ? '휴대폰 번호를 입력해 주세요.' : PHONE.test(ph) ? '' : '휴대폰 번호를 확인해 주세요.'], ['cx', emailErr(em)],
    ['cx2', !em2 ? '결제 이메일을 한 번 더 넣어 주세요.' : !emailErr(em) && em2.toLowerCase() !== em.toLowerCase() ? '위 결제 이메일과 같게 넣어 주세요.' : ''],
    ['cAgree', $('cAgree').checked ? '' : '동의 칸에 체크해 주세요.']];   // 틀린 곳을 한 번에 다 보인다(강사 역할 리뷰 — 동의·다시 입력 칸이 나중에야 빨개졌다)
  errs.forEach(([id, m]) => cardSlot(id, m));
  const first = errs.find(([, m]) => m); if (first) { $(first[0]).focus(); return; }
  const r = await cardGo('start');
  const d = r?.j || {};   // 결제 서버 답 = d(창에 넘기는 값은 d에서만 — 가드 §14p)
  if (!(r?.ok && d.issue_id)) {
    if (d.state) cardView(d);   // 그 사이 상태가 바뀜(해지·만료 등) — 지금 상태로
    return;
  }
  try { await loadSdk(); } catch { return apNoteTop('카드 등록 창을 열지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.'); }   // 넣은 칸은 그대로(다시 그리지 않는다)
  try { sessionStorage.setItem('cardPend', JSON.stringify({ t: apT, at: Date.now() })); } catch { /* 폰 복귀만 못 이어 간다 — 그때는 링크를 다시 열면 된다 */ }
  let w;
  try {
    w = await window.PortOne.requestIssueBillingKey({
      storeId: d.store_id, channelKey: d.channel_key, billingKeyMethod: 'CARD', issueId: d.issue_id,
      issueName: '큐쏙 정식판 자동 결제 카드 변경',
      customer: { customerId: d.customer_id, fullName: nm, phoneNumber: ph, email: em },
      redirectUrl: location.origin + location.pathname,   // 폰은 결제사 화면에 갔다가 이 주소로 돌아온다(아래 복귀 처리)
    });
  } catch { w = { code: 'window' }; }
  if (!w) return;                                         // 폰 — 돌아오는 주소에서 이어서 처리
  try { sessionStorage.removeItem('cardPend'); } catch { /* 없어도 된다 */ }
  if (w.code != null || !w.billingKey) return apNoteTop('카드 등록 창을 닫으셔서 카드는 바뀌지 않았습니다. 다시 하시려면 ‘카드 등록 창 열기’를 눌러 주세요.');   // 넣은 칸은 그대로
  return cardRegister(w.billingKey);
}
// ⛔ 새 카드 등록 값은 결제 서버로만 보낸다 — 화면·console·저장소에 쓰지 않는다
async function cardRegister(key) {
  apShow('카드를 변경하고 있습니다', `<p class="checking" role="status">${SVG.spin}<span>확인하는 중…</span></p>`);
  return cardGo('register', { billing_key: key });
}
function apNoteTop(t) { $('apBody').querySelector(':scope > .rn-note')?.remove(); $('apBody').insertAdjacentHTML('afterbegin', apNote(t)); $('apTitle')?.scrollIntoView({ block: 'start' }); }   // 알림은 하나만

// kind = renew | cancel · action = view | yes | no | cancel | undo · note = 다시 불러온 까닭(그 사이 바뀜)
async function apGo(kind, action, note = '') {
  apKind = kind;
  let r = null;
  try { r = await post(kind === 'renew' ? '/pay/autopay/renew' : '/pay/autopay/cancel', { t: apT, action, ...(action === 'yes' ? { seen_amount: apJ?.amount_next } : {}) }); }
  catch { /* 닿지 않음 */ }
  const j = r?.j || {}, acted = action !== 'view';
  if (r && (r.ok || r.code === 409) && j.state) {   // 409 = 그 사이 상태가 달라짐 — 지금 상태를 그린다
    apJ = j;
    if (kind === 'renew' && j.state === 'cancelled') return apGo('cancel', 'view', note);   // 해지 예약 중 — 계속하기 대신 해지 취소 화면으로
    const why = note || (r.code === 409 && j.error === 'amount_changed' ? '화면을 연 사이 금액이 바뀌었습니다. 바뀐 금액을 확인하신 뒤 다시 눌러 주세요.' : '');
    return kind === 'renew' ? apRenew(j, why) : apCancel(j, action, r.ok, why);
  }
  if (r?.code === 409) return apGo(kind, 'view', '화면을 연 사이 상태가 바뀌어 다시 불러왔습니다.');   // 상태 없는 409(changed)
  apFail(kind, r, acted);
}
const AP_DOING = { yes: '처리하는 중…', no: '처리하는 중…', cancel: '해지하는 중…', undo: '해지 취소하는 중…', view: '불러오는 중…' };
function apToShop(toCancel) {
  try { sessionStorage.removeItem('apLink'); } catch { /* 없어도 된다 */ }
  show('shop');
  if (toCancel && apKind === 'card' && /^[2-9A-HJ-NP-Z]{10}$/.test(apJ?.machine_id ?? '')) $('cm').value = apJ.machine_id;   // 카드 변경 화면에서 왔으면 번호만 채운다(이메일 ✕)
  if (toCancel) { $('cancel').scrollIntoView({ block: 'start', behavior: 'instant' }); $('cm').focus({ preventScroll: true }); }
}
$('ap').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-ap]'); if (!b) return;
  const act = b.dataset.ap;
  if (act === 'shop' || act === 'tocancel') { e.preventDefault(); apToShop(act === 'tocancel'); return; }
  if (apBusy) return;
  if (act === 'cardopen' || act === 'cardview') {   // 카드 변경 화면 — 창 열기 · 다시 불러오기
    apBusy = true; $('apBody').querySelectorAll('button').forEach((x) => (x.disabled = true));
    const label = b.innerHTML;
    b.innerHTML = SVG.spin + `<span>${act === 'cardopen' ? '카드 등록 창을 여는 중…' : '불러오는 중…'}</span>`;
    try { await (act === 'cardopen' ? cardOpen() : cardGo('view')); }
    finally { apBusy = false; $('apBody').querySelectorAll('button').forEach((x) => (x.disabled = false)); if (b.isConnected) b.innerHTML = label; else $('apTitle')?.focus({ preventScroll: true }); }   // 화면을 다시 그렸으면 제목으로(커서가 body로 빠지지 않게 — a11y 11-21)   // 입력 확인에서 막혀 화면이 그대로면 단추 글을 되돌린다(ui-visual 11-21 — 「여는 중…」이 남았다)
    return;
  }
  apBusy = true;
  $('apBody').querySelectorAll('button').forEach((x) => (x.disabled = true));
  b.innerHTML = SVG.spin + `<span>${esc(AP_DOING[act] || '')}</span>`;
  try { await apGo(act === 'yes' || act === 'no' ? 'renew' : act === 'view' ? apKind : 'cancel', act); }
  finally { apBusy = false; }
  $('apTitle')?.focus({ preventScroll: true });
});
if (AP_LINK) {
  apKind = AP_LINK.kind; apT = AP_LINK.t;
  if (!LIVE || !LINK_T.test(apT)) apBadLink(apKind);   // 시험판은 위 ⛔ · 모양이 틀린 링크는 서버에 묻지 않는다
  else {
    apShow('자동 결제 상태를 확인하고 있습니다', `<p class="checking" role="status">${SVG.spin}<span>잠시만 기다려 주세요.</span></p>`);
    (apKind === 'card' ? cardGo('view') : apGo(apKind, 'view')).then(() => { if (AP_LINK.no) $('apBody').querySelector('[data-ap="no"]')?.focus({ preventScroll: true }); });   // 메일의 「계속하지 않기」로 왔으면 그 단추에(누르기 전엔 아무것도 안 바뀐다)
  }
}

// 폰 — 결제사 화면에서 이 주소로 돌아왔을 때(?paymentId=…&code=…). 모양이 맞는 값만, 글자로만 쓴다
(() => {
  const q = new URLSearchParams(location.search), pid = q.get('paymentId');
  // 주소의 값부터 지운다 — 어떤 값이든, 가르기 전에(빌링키가 방문 기록·북마크·공유 링크에 남지 않게, security 11-18)
  if (location.search) history.replaceState(null, '', location.pathname);
  if (!pid && (q.has('billingKey') || q.get('transactionType') === 'ISSUE_BILLING_KEY')) {   // 자동 결제 카드 등록 복귀 — 값은 있는지만 본다
    // 카드 변경 창에서 돌아옴(폰) — 창을 열 때 적어 둔 링크 열쇠로 이어 간다(한 번만 읽고 지운다). 카드 변경이 아니면 아래 시험판 길
    let pend = null;
    try { pend = JSON.parse(sessionStorage.getItem('cardPend')); sessionStorage.removeItem('cardPend'); } catch { /* 없음 */ }
    if (LIVE && pend && LINK_T.test(pend.t ?? '') && Date.now() - (pend.at ?? 0) < 3600e3) {   // 창을 연 지 1시간 안의 표식만(결제사 화면에서 뒤로 가 남은 표식을 다른 복귀로 오인하지 않게 — QA ⚠️8)
      apKind = 'card'; apT = pend.t;
      try { sessionStorage.setItem('apLink', JSON.stringify({ kind: 'card', t: apT })); } catch { /* 새로고침 때만 쓴다 */ }
      const bk = q.get('billingKey');
      if (q.get('code') || !bk) cardGo('view').then(() => { if (apJ?.state === 'ok') apNoteTop('카드 등록 창을 닫으셔서 카드는 바뀌지 않았습니다. 다시 하시려면 ‘카드 등록 창 열기’를 눌러 주세요.'); });
      else cardRegister(bk);
      return;
    }
    // ⚠️ 판매 페이지에 자동 결제 「신청」 길(LIVE)을 열 때 그 복귀도 여기로 온다 — 그때 신청 쪽 표식으로 먼저 갈라야 한다(재리뷰 11-21 — 지금은 LIVE 신청 길이 없다)
    if (LIVE && q.get('transactionType') === 'ISSUE_BILLING_KEY') {   // 카드 창에서 돌아왔는데 이 탭엔 이어 갈 값이 없음 — 판매 화면만 덩그러니 띄우지 않는다(ux-flow 11-21)
      apKind = 'card';
      apShow('카드 변경을 마치지 못했습니다', apBand('warn', '', ['카드는 바뀌지 않았습니다. 받으신 메일의 ‘카드 변경하기’를 다시 눌러 주세요.', '30분이 지났다면 아래 칸에서 새 링크를 받아 주세요.']) + NEW_LINK);
      return;
    }
    if (LIVE || !TEST.billKey) return;
    show('shop');
    if (q.get('code') || !q.get('billingKey')) modal('billFail'); else billDone();
    return;
  }
  if (!pid) return;
  if (LIVE) {   // 실제 결제 길 — 주문 번호 모양만 받고, 결과는 결제 서버 답으로(주소의 code는 「실패일 수 있다」는 신호로만)
    if (!ORDER.test(pid)) return;
    if (q.get('code')) notPaid(pid); else check(pid);
    return;
  }
  if (!PID.test(pid)) return;
  if (q.get('code')) { show('shop'); modal('S6c'); return; }
  testDone(pid, true);
})();
