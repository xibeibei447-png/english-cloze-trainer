const DATA = window.VOCAB_DATA || [];
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const STORE_KEY = 'wordloom-progress-v1';
const UNITS = [...new Map(DATA.map(item => [item.unit, { unit: item.unit, title: item.title }])).values()];
const state = loadState();
let soundOn = true;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return {
      grades: saved.grades || {}, mistakes: saved.mistakes || {}, seen: saved.seen || {},
      stars: saved.stars || {}, answers: saved.answers || 0, correct: saved.correct || 0
    };
  } catch { return { grades:{}, mistakes:{}, seen:{}, stars:{}, answers:0, correct:0 }; }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); updateStats(); }
function shuffle(items){ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function normalize(s){ return String(s||'').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' '); }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function markBlank(sentence, word, reveal=''){
  const index=sentence.toLowerCase().indexOf(word.toLowerCase());
  if(index<0) return escapeHtml(sentence)+' <span class="blank">'+escapeHtml(reveal||'________')+'</span>';
  return escapeHtml(sentence.slice(0,index))+'<span class="blank">'+escapeHtml(reveal||'________')+'</span>'+escapeHtml(sentence.slice(index+word.length));
}
function speak(text){ if(!soundOn || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;speechSynthesis.speak(u); }
function optionsHtml(allLabel='全部单元'){ return `<option value="all">${allLabel}</option>`+UNITS.map(u=>`<option value="${u.unit}">${u.unit} · ${u.title}</option>`).join(''); }
function setView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='library') renderLibrary();
}
$$('.nav-link').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));
$('#sound-toggle').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.setAttribute('aria-pressed',soundOn);e.currentTarget.textContent=soundOn?'◖))':'×';e.currentTarget.title=soundOn?'关闭发音':'打开发音'});

function updateStats(){
  const seen=Object.keys(state.seen).length;
  const mastered=Object.values(state.grades).filter(x=>x==='know').length;
  const review=Object.keys(state.mistakes).filter(id=>state.mistakes[id]>0).length;
  const accuracy=state.answers?Math.round(state.correct/state.answers*100)+'%':'—';
  $('#stat-seen').textContent=seen; $('#stat-mastered').textContent=mastered; $('#stat-review').textContent=review;
  $('#stat-accuracy').textContent=accuracy; $('#stat-answers').textContent=`${state.answers} 次作答`;
  const pct=Math.round(seen/DATA.length*100); $('#hero-progress').style.width=pct+'%'; $('#hero-progress-label').textContent=seen?`总进度 ${pct}%`:'尚未开始';
  renderUnits();
}
function renderUnits(){
  const colors=['#e86247','#3d6bd9','#d8a632','#2d8068','#8b5d9b','#bf7048'];
  $('#unit-grid').innerHTML=UNITS.map((u,i)=>{
    const items=DATA.filter(x=>x.unit===u.unit), seen=items.filter(x=>state.seen[x.id]).length, pct=Math.round(seen/items.length*100);
    return `<button class="unit-card" data-unit="${u.unit}"><span class="unit-num">${u.unit.toUpperCase()}</span><h3>${u.title}</h3><p>${items.length} 个重点词 · 已练 ${seen} 个</p><i class="unit-progress" style="width:${pct}%;background:${colors[i]}"></i></button>`;
  }).join('');
  $$('.unit-card').forEach(card=>card.onclick=()=>{$('#practice-unit').value=card.dataset.unit; resetPractice(); setView('practice')});
}

// Flashcards
$('#card-unit').innerHTML=optionsHtml();
let cardDirection='en-zh', cardDeck=[], cardIndex=0, cardRevealed=false;
function newCardDeck(){
  const unit=$('#card-unit').value; const pool=unit==='all'?DATA:DATA.filter(x=>x.unit===unit);
  cardDeck=shuffle(pool).slice(0,Math.min(20,pool.length));cardIndex=0;renderCard();
}
function renderCard(){
  if(!cardDeck.length) return; const item=cardDeck[cardIndex];cardRevealed=false;
  $('#card-round').textContent=`${String(cardIndex+1).padStart(2,'0')} / ${String(cardDeck.length).padStart(2,'0')}`;
  $('#card-progress').style.height=((cardIndex+1)/cardDeck.length*100)+'%';$('#card-unit-label').textContent=`${item.unit} · ${item.title}`;
  $('#card-back').hidden=true;$('#flip-note').textContent='点击卡片查看答案';
  if(cardDirection==='en-zh'){
    $('#card-front').innerHTML=`<h2>${escapeHtml(item.word)}</h2><p>${escapeHtml(item.sentence)}</p>`;
    $('#card-back').innerHTML=`<strong>${escapeHtml(item.meaning)}</strong><p>${escapeHtml(item.chinese)}</p>`;
  }else{
    $('#card-front').innerHTML=`<h2 style="font-size:34px">${escapeHtml(item.meaning)}</h2><p>${escapeHtml(item.chinese)}</p>`;
    $('#card-back').innerHTML=`<strong>${escapeHtml(item.word)}</strong><p>${escapeHtml(item.sentence)}</p>`;
  }
}
function flipCard(){cardRevealed=!cardRevealed;$('#card-back').hidden=!cardRevealed;$('#flip-note').textContent=cardRevealed?'再次点击收起':'点击卡片查看答案';if(cardRevealed)speak(cardDeck[cardIndex].word)}
$('#flashcard').onclick=e=>{if(e.target.id!=='card-speak')flipCard()};
$('#card-speak').onclick=e=>{e.stopPropagation();speak(cardDeck[cardIndex].word)};
$('#card-unit').onchange=newCardDeck;$('#shuffle-cards').onclick=newCardDeck;
$('#card-direction').onclick=e=>{cardDirection=cardDirection==='en-zh'?'zh-en':'en-zh';e.currentTarget.textContent=cardDirection==='en-zh'?'英文 → 中文':'中文 → 英文';renderCard()};
$$('[data-grade]').forEach(b=>b.onclick=()=>{const item=cardDeck[cardIndex];state.grades[item.id]=b.dataset.grade;state.seen[item.id]=1;saveState();cardIndex=(cardIndex+1)%cardDeck.length;renderCard()});

// Practice
$('#practice-unit').innerHTML=optionsHtml();
let practicePool=[], practiceIndex=0, practiceQuestion=null, practiceRight=0, practiceTotal=0, practiceStreak=0, practiceAnswered=false, hintCount=0;
function resetPractice(){
  const unit=$('#practice-unit').value, mistakesOnly=$('#mistakes-only').checked;
  practicePool=DATA.filter(x=>(unit==='all'||x.unit===unit)&&(!mistakesOnly||state.mistakes[x.id]>0));
  practicePool=shuffle(practicePool);practiceIndex=0;practiceRight=0;practiceTotal=0;practiceStreak=0;nextPractice();
}
function nextPractice(){
  if(!practicePool.length){
    $('#practice-chinese').textContent=$('#mistakes-only').checked?'当前范围没有错题。':'当前范围没有题目。';$('#practice-sentence').textContent='';$('#practice-form').hidden=true;return;
  }
  $('#practice-form').hidden=false;practiceQuestion=practicePool[practiceIndex%practicePool.length];practiceAnswered=false;hintCount=0;
  $('#practice-count').textContent=`第 ${practiceIndex+1} 题 · ${practiceQuestion.unit}`;$('#practice-score').textContent=`${practiceRight} / ${practiceTotal}`;$('#practice-streak').textContent=practiceStreak;
  $('#practice-chinese').textContent=practiceQuestion.chinese;$('#practice-sentence').innerHTML=markBlank(practiceQuestion.sentence,practiceQuestion.word);
  $('#practice-meaning').textContent=`语境释义：${practiceQuestion.meaning}`;$('#practice-input').value='';$('#practice-input').disabled=false;$('#practice-form button').disabled=false;
  $('#practice-feedback').className='feedback';$('#practice-feedback').textContent='';$('#practice-next').hidden=true;$('#letter-hint').hidden=false;$('#letter-hint').textContent='给我一个字母提示';
  setTimeout(()=>$('#practice-input').focus(),100);
}
$('#practice-form').onsubmit=e=>{
  e.preventDefault();if(practiceAnswered)return;const raw=$('#practice-input').value;if(!raw.trim())return;
  const ok=normalize(raw)===normalize(practiceQuestion.word);practiceAnswered=true;practiceTotal++;state.answers++;state.seen[practiceQuestion.id]=1;
  if(ok){practiceRight++;practiceStreak++;state.correct++;state.mistakes[practiceQuestion.id]=0}else{practiceStreak=0;state.mistakes[practiceQuestion.id]=(state.mistakes[practiceQuestion.id]||0)+1}
  saveState();$('#practice-score').textContent=`${practiceRight} / ${practiceTotal}`;$('#practice-streak').textContent=practiceStreak;
  $('#practice-input').disabled=true;$('#practice-form button').disabled=true;$('#practice-sentence').innerHTML=markBlank(practiceQuestion.sentence,practiceQuestion.word,practiceQuestion.word);
  const fb=$('#practice-feedback');fb.className='feedback '+(ok?'good':'bad');fb.innerHTML=ok?`正确。<strong>${escapeHtml(practiceQuestion.word)}</strong> 在这里意为“${escapeHtml(practiceQuestion.meaning)}”。`:`正确答案是 <strong>${escapeHtml(practiceQuestion.word)}</strong>。你的答案：${escapeHtml(raw)}`;
  $('#practice-next').hidden=false;$('#letter-hint').hidden=true;
};
$('#practice-next').onclick=()=>{practiceIndex++;nextPractice()};
$('#letter-hint').onclick=()=>{hintCount++;const w=practiceQuestion.word;const shown=w.split('').map((c,i)=>/[a-z]/i.test(c)&&(i<hintCount||i>=w.length-hintCount)?c:/[a-z]/i.test(c)?'·':c).join('');$('#letter-hint').textContent=shown};
$('#practice-unit').onchange=resetPractice;$('#mistakes-only').onchange=resetPractice;

// Mock exam
$('#mock-unit').innerHTML=optionsHtml('全部单元混合');
let mockMinutes=8,mockItems=[],mockTimerId=null,mockSeconds=0,mockSubmitted=false;
$$('[data-minutes]').forEach(b=>b.onclick=()=>{$$('[data-minutes]').forEach(x=>x.classList.remove('active'));b.classList.add('active');mockMinutes=Number(b.dataset.minutes)});
function startMock(){
  const unit=$('#mock-unit').value,pool=unit==='all'?DATA:DATA.filter(x=>x.unit===unit);mockItems=shuffle(pool).slice(0,10);mockSubmitted=false;
  $('#mock-setup').hidden=true;$('#mock-result').hidden=true;$('#mock-paper').hidden=false;
  $('#mock-questions').innerHTML=mockItems.map((q,i)=>`<div class="mock-question"><small>${String(i+1).padStart(2,'0')} · ${q.unit} · ${escapeHtml(q.meaning)}</small><p>${markBlank(q.sentence,q.word)}</p><p>${escapeHtml(q.chinese)}</p><input name="q${i}" autocomplete="off" spellcheck="false" aria-label="第${i+1}题答案"></div>`).join('');
  mockSeconds=mockMinutes*60;updateTimer();clearInterval(mockTimerId);if(mockMinutes){mockTimerId=setInterval(()=>{mockSeconds--;updateTimer();if(mockSeconds<=0){clearInterval(mockTimerId);submitMock()}},1000)}
  window.scrollTo({top:0,behavior:'smooth'});
}
function updateTimer(){const m=Math.floor(mockSeconds/60),s=mockSeconds%60;$('#mock-timer').textContent=mockMinutes?`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:'不限时'}
function submitMock(e){if(e)e.preventDefault();if(mockSubmitted)return;mockSubmitted=true;clearInterval(mockTimerId);const form=new FormData($('#mock-form'));let right=0;
  const rows=mockItems.map((q,i)=>{const raw=String(form.get('q'+i)||'');const ok=normalize(raw)===normalize(q.word);if(ok)right++;state.answers++;state.seen[q.id]=1;if(ok){state.correct++;state.mistakes[q.id]=0}else state.mistakes[q.id]=(state.mistakes[q.id]||0)+1;return `<div class="result-row ${ok?'good':'bad'}"><small>${i+1}. ${q.unit}</small><p>${markBlank(q.sentence,q.word,q.word)}</p><strong>${ok?'✓ 正确':'✕ 你的答案：'+escapeHtml(raw||'（未作答）')}</strong>${ok?'':`<p>正确答案：<b>${escapeHtml(q.word)}</b> · ${escapeHtml(q.meaning)}</p>`}</div>`}).join('');
  saveState();$('#mock-paper').hidden=true;const result=$('#mock-result');result.hidden=false;result.innerHTML=`<div class="result-hero"><p class="eyebrow light">RESULT</p><strong>${right*10}</strong><p>${right} / 10 题正确</p><button class="button primary" id="retry-mock">再考一套</button></div><div class="result-list">${rows}</div>`;$('#retry-mock').onclick=()=>{$('#mock-result').hidden=true;$('#mock-setup').hidden=false};window.scrollTo({top:0,behavior:'smooth'});
}
$('#start-mock').onclick=startMock;$('#mock-form').onsubmit=submitMock;

// Library
$('#library-unit').innerHTML=optionsHtml();let starredOnly=false;
function renderLibrary(){
  const q=normalize($('#library-search').value),unit=$('#library-unit').value;
  const items=DATA.filter(x=>(unit==='all'||x.unit===unit)&&(!starredOnly||state.stars[x.id])&&normalize(`${x.word} ${x.meaning} ${x.sentence} ${x.chinese}`).includes(q));
  $('#library-count').textContent=`显示 ${items.length} / ${DATA.length} 个词`;
  $('#library-list').innerHTML=items.map((x,i)=>`<article class="word-row"><span class="index">${String(i+1).padStart(3,'0')}</span><div><strong>${escapeHtml(x.word)}</strong><small style="display:block;color:var(--coral)">${x.unit}</small></div><div class="meaning">${escapeHtml(x.meaning)}</div><div class="example">${escapeHtml(x.sentence)}<br>${escapeHtml(x.chinese)}</div><button class="star-button ${state.stars[x.id]?'on':''}" data-star="${x.id}" aria-label="收藏">★</button></article>`).join('');
  $$('[data-star]').forEach(b=>b.onclick=()=>{state.stars[b.dataset.star]=state.stars[b.dataset.star]?0:1;saveState();renderLibrary()});
}
$('#library-search').oninput=renderLibrary;$('#library-unit').onchange=renderLibrary;$('#starred-filter').onclick=e=>{starredOnly=!starredOnly;e.currentTarget.classList.toggle('active',starredOnly);e.currentTarget.textContent=starredOnly?'★ 已收藏':'☆ 只看收藏';renderLibrary()};

updateStats();newCardDeck();resetPractice();renderLibrary();
