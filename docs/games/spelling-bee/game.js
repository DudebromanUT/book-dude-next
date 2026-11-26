/* Spelling BB in Book Dude: practice for the school spelling bee with BB, the reading blanket. BB reads a word; she spells it
 * out loud (or types it, or a grown-up checks). Spelling a word right twice in a row makes it a gem, and gems earn
 * points in Book Dude: see core.js spellPoints. The words are in words.js. */
'use strict';
{
/* ---------- words ---------- */
const LV=['one','two','three'];
const LV_NAME={one:'One Bee',two:'Two Bee',three:'Three Bee',all:'All words'};
const LV_COL={one:'#17a36a',two:'#2f6fdb',three:'#8b4fd8',all:'#e3a21a'};
const POS_SHOW={n:'noun',np:'noun, more than one',v:'verb',vp:'verb, past tense',ving:'verb',adj:'adjective',adv:'adverb',prep:'preposition',int:'interjection',name:'noun (a name)',place:'noun (a place)'};
const POS_SAY={n:'a noun',np:'a noun, meaning more than one',v:'a verb',vp:'a verb, in the past tense',ving:'a verb',adj:'an adjective',adv:'an adverb',prep:'a preposition',int:'an interjection',name:'a noun. It is a name',place:'a noun. It is the name of a place'};
/* respellings that help the device voice say tricky words */
const SAY={sharpei:'shar pay',Gloucester:'Gloster',Bildungsroman:'bill doongs roh mahn',vibrissae:'vye briss ee',mysticetes:'miss tuh seats',trichobothria:'trick oh bah three uh',Cappadocia:'cap uh doe shuh',prosciutto:'pro shoo toe',Amharic:'am hair ick',Krio:'kree oh',duende:'doo en day',romerillo:'roh muh ree loh',Aeolus:'ee uh lus',endothermy:'en doh thur mee',ototoxic:'oh toe tox ick',solenodon:'suh len uh don',ampulla:'am pull uh',chitinous:'kite in us','spes phthisica':'spays tiz ih kuh','Addis Ababa':'ah diss ah buh buh','bogong moth':'boh gong moth',palazzo:'puh lot so',lead:'leed',sputum:'spyoo tum',sensilla:'sen sill uh',stomatopods:'stoh muh tuh pods',thermotaxis:'thur moh tack sis',mewling:'myoo ling',pentathletes:'pen tath leets',vibrometer:'vye brom ih ter',Eritrea:'air ih tray uh',cerulean:'suh roo lee un',acolyte:'ack uh lite',legation:'lih gay shun',regolith:'reg uh lith'};

const W=[];
const DATA=window.SPELL_DATA;
for(const lv of LV)for(const e of DATA[lv]){const alts=e[0].split('|');W.push({w:alts[0],alts,lv,pos:e[1],def:e[2],sen:e[3],ori:e[4]})}
const BYW=new Map(W.map(x=>[x.w,x]));

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const lettersOnly=s=>norm(s).replace(/[^a-z]/g,'');
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.random()*a.length|0];
const lowerFirst=s=>s.charAt(0).toLowerCase()+s.slice(1);
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

/* ---------- saving ---------- */
/* BB's Claude help goes through Book Dude's school-email script, with its key (the app hands the link over).
   Her progress is kept where Book Dude's games keep things; the app puts it in her family account, and every 10
   gems earn points there (core.js spellPoints). */
const C=window.ReadingCore;
const ARCADE=window.BookDudeArcade.open('spelling-bee');
const LINK=(l=>typeof l==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\?key=[\w-]+$/.test(l)?l:'')(ARCADE.get('link'));
const GAS=!!LINK;
const BEE_DAY='2027-01-10';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
let EARNED={},STREAKS={};
const DEF_SET={level:'one',answer:'talk',autoDef:true,autoSen:false,autoListen:true,autoCheck:false,rate:1,claude:true};
let P={},BEST={},SET={...DEF_SET},T=0;
const ZERO=[0,0,0];
const get=w=>P[w.w]||ZERO;                 /* [right in a row, has gem, misses] */
const mut=w=>P[w.w]||(P[w.w]=[0,0,0]);
const isTricky=w=>get(w)[2]>0&&!get(w)[1];
function applySaved(o){if(!o||typeof o!=='object')return;P=o.p||{};BEST=o.best||{};SET={...DEF_SET,...(o.set||{})};T=o.t||0;EARNED=o.earned||{};STREAKS=o.streaks||{}}
function snapshot(){return{p:P,best:BEST,set:SET,t:T,earned:EARNED,streaks:STREAKS}}
function readLocal(){return ARCADE.get('progress')}
function writeLocal(){ARCADE.set('progress',snapshot());
  /* the family scoreboard: a star for every 50 gems on a list */
  const rec={};for(const lv of LV){const n=W.filter(w=>w.lv===lv&&get(w)[1]).length;rec[lv]={stars:Math.min(3,Math.floor(n/50)),score:n}}
  const all=ARCADE.get('records')||{};all[ARCADE.player||'']=rec;ARCADE.set('records',all)}
function save(){T=Date.now();writeLocal()}
applySaved(readLocal());
try{const old=JSON.parse(localStorage.getItem('mspell-p')||'null');if(old&&!Object.keys(P).length)for(const k in old)if(BYW.has(k))P[k]=[old[k].s||0,old[k].m?1:0,old[k].x||0]}catch(e){}
if(!LV_NAME[SET.level])SET.level='one';

let LOG=[];
function logAttempt(w,ans,ok){if(!GAS)return;LOG.push([new Date().toISOString(),LV_NAME[w.lv],w.w,ans,ok?'right':'missed',S.kind+' / '+answerMode()]);if(LOG.length>=5)flushLog()}
function flushLog(){if(!GAS||!LOG.length)return;const rows=LOG;LOG=[];post('spell-log',rows,15000).catch(()=>{})}

/* ---------- BB ---------- */
/* BB (Birdie Blanky), the Book Dude crew's sentient reading blanket, a hand drawing: sways while talking, perks up while listening. */
const BJ='<img class="bj bb" src="../../img/bb.webp" alt="" width="152" height="210" draggable="false">';
for(const id of['bjHome','bjPlay','bjDone'])$(id).innerHTML=BJ;
function setBJ(state){const el=document.querySelector('#bjPlay .bj');if(!el)return;el.classList.toggle('talk',state==='talk');el.classList.toggle('listen',state==='listen')}
function bubble(t){$('bubble').textContent=t}

/* ---------- voice out ---------- */
const synth=window.speechSynthesis||null;
let voice=null,unlocked=false,talkId=0,saying=false;
function pickVoice(){if(!synth)return;let vs=[];try{vs=synth.getVoices().filter(v=>/^en[-_]US/i.test(v.lang))}catch(e){}voice=vs.find(v=>/premium|enhanced/i.test(v.name))||vs.find(v=>/Samantha|Google US English|Aria|Jenny|Ava|Natural/i.test(v.name))||vs[0]||null}
if(synth){pickVoice();try{synth.addEventListener('voiceschanged',pickVoice)}catch(e){synth.onvoiceschanged=pickVoice}}
function unlock(){if(unlocked||!synth)return;unlocked=true;try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;synth.speak(u)}catch(e){}}
function hush(){talkId++;saying=false;if(synth)try{synth.cancel()}catch(e){}setBJ('')}
function speakOne(text,id){return new Promise(res=>{if(!synth||id!==talkId){res();return}let done=false,tm=0;const u=new SpeechSynthesisUtterance(text);u.lang='en-US';if(voice)u.voice=voice;u.rate=Math.max(.5,Math.min(1.2,.92*SET.rate));const fin=()=>{if(done)return;done=true;clearTimeout(tm);res()};u.onend=fin;u.onerror=fin;tm=setTimeout(fin,1800+text.length*120/u.rate);try{synth.speak(u)}catch(e){fin()}})}
async function say(parts){const id=++talkId;if(synth&&(synth.speaking||synth.pending)){try{synth.cancel()}catch(e){}await new Promise(r=>setTimeout(r,90))}if(id!==talkId)return false;saying=true;setBJ('talk');for(const p of parts){if(id!==talkId)return false;await speakOne(p,id)}if(id!==talkId)return false;saying=false;setBJ('');return true}
const spoken=w=>SAY[w.w]||w.w;
const WB='A-Za-z\\u00C0-\\u024F';
const wordRe=a=>new RegExp('(^|[^'+WB+'])('+reEsc(a)+')(?!['+WB+'])','gi');
function spokenSentence(w){return SAY[w.w]?w.sen.replace(wordRe(w.w),(m,p)=>p+SAY[w.w]):w.sen}
function spellOut(word){return[...word].map(c=>c===' '?'space':c==='-'?'hyphen':(lettersOnly(c)?lettersOnly(c).toUpperCase():'')).filter(Boolean).join('. ')+'.'}
const langOf=o=>o.split(' (')[0];
function originLine(w){const l=langOf(w.ori);return/^origin|^uncertain/i.test(l)?'Nobody knows for sure where this word comes from.':'Language of origin: '+l+'.'}

/* ---------- listening ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
/* iPad and iPhone only let a page start listening right after a tap. So there, listening never starts by itself (not
   after BB reads the word, and not again after a pause), and a "no" from iOS never turns the microphone off for good. */
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let srBroken=false,autoOK=!IOS,L=null,tapFails=0;
/* On iPad and iPhone, one listener for the whole visit: a new one for every word can leave iOS sending no words after the
   first. If BB still hears nothing twice in a row there, she switches to the keyboard's microphone, which iOS always lets
   type out the letters she says. */
let REC=null,emptyRuns=0;
const LETTER=new Map();
Object.entries({a:['a','ay'],b:['b','be','bee','bea','bi'],c:['c','see','sea','cee','si'],d:['d','dee','de'],e:['e','ee'],f:['f','ef','eff'],g:['g','gee','ji','jee','gi'],h:['h','aitch','age','ach','haitch'],i:['i','eye','aye','ai'],j:['j','jay','jae'],k:['k','kay','cay','kaye'],l:['l','el','ell','elle'],m:['m','em'],n:['n','en','and','in'],o:['o','oh','owe','0'],p:['p','pee','pea','pe'],q:['q','queue','cue','cu','kyu','que'],r:['r','are','ar','arr'],s:['s','es','ess'],t:['t','tee','tea','ti','te'],u:['u','you','yu','ewe','yoo'],v:['v','vee','vi','ve'],w:['w','dubya','dub'],x:['x','ex','ecks','eks'],y:['y','why','wye','wie'],z:['z','zee','zed']}).forEach(([k,v])=>v.forEach(s=>LETTER.set(s,k)));
const FILL=new Set(['um','uh','umm','uhh','hmm','hm','er','erm','okay','like','so','the','please','done','finished','spelled','spell','spelling','word','that','thats','its','it','is','um-hmm','uh-huh']);
const FILL_PHRASES=[['my','word','is'],['the','word','is'],['your','word','is'],['it','is','spelled'],['its','spelled'],['is','spelled'],['i','think'],['im','done'],['thats','it']];
const SKIPWORDS=new Set(['capital','cap','uppercase','lowercase','big','small','letter','apostrophe','then','next']);
function tokenize(raw){return String(raw).replace(/[‘’]/g,"'").replace(/[.,!?;:"()\[\]{}…]/g,' ').replace(/[-–—_\/]/g,' ').split(/\s+/).filter(Boolean)}
function parseSpelling(raw,w){
  const toks=tokenize(raw),nt=toks.map(t=>norm(t).replace(/'/g,'')),out=[];let sawWord=false;
  const targets=w?w.alts.map(a=>norm(a).replace(/-/g,' ').split(/\s+/)):[];
  const caps=t=>t.length>1&&/[A-Z]/.test(t)&&t===t.toUpperCase();
  const seq=(i,arr)=>arr.every((x,k)=>nt[i+k]===x);
  for(let i=0;i<toks.length;i++){
    const r=toks[i],t=nt[i];
    if(!caps(r)){const hit=targets.find(tg=>seq(i,tg));if(hit){sawWord=true;i+=hit.length-1;continue}
      const ph=FILL_PHRASES.find(p=>seq(i,p));if(ph){i+=ph.length-1;continue}}
    if(caps(r)&&/^[a-z]+$/.test(t)){for(const c of t)out.push({ch:c});continue}
    /* "B as in boy", "B like boy", "B for boy": keep the letter, drop the example word */
    if(t==='as'&&nt[i+1]==='in'&&i+2<toks.length){i+=2;continue}
    if((t==='like'||t==='for')&&out.length&&i+1<toks.length&&nt[i+1].length>1&&!LETTER.has(nt[i+1])){i++;continue}
    /* "no wait", "I mean", "scratch that", "oops": take back the last letter */
    if((t==='no'&&nt[i+1]==='wait')||(t==='i'&&nt[i+1]==='mean')||(t==='scratch'&&nt[i+1]==='that')){out.pop();i++;continue}
    if(t==='oops'||t==='whoops'){out.pop();continue}
    if(FILL.has(t)||SKIPWORDS.has(t))continue;
    if(t==='double'&&i+1<toks.length){const nx=nt[i+1];if(['u','you','yu','yoo'].includes(nx)){out.push({ch:'w'});i++;continue}const L2=LETTER.get(nx);if(L2){out.push({ch:L2},{ch:L2});i++}continue}
    if(t==='hyphen'||t==='dash'){out.push({ch:'-'});continue}
    if(t==='space'){out.push({ch:' '});continue}
    const L1=LETTER.get(t);if(L1){out.push({ch:L1});continue}
    if(/^[a-z]+$/.test(t)){for(const c of t)out.push({ch:c,unsure:true});continue}
  }
  return{letters:out.map(o=>o.ch).join(''),tokens:out,sawWord};
}
function commandOf(raw){
  const t=' '+norm(raw).replace(/[^a-z ]/g,' ').replace(/\s+/g,' ')+' ';let cmd=null;
  if(/ part of speech /.test(t))cmd='pos';
  else if(/ (definition|define|meaning|mean) /.test(t))cmd='def';
  else if(/ sentence | use it /.test(t))cmd='sen';
  else if(/ (origin|language) | where .*from /.test(t))cmd='ori';
  else if(/ (repeat|again|pronounce|pronunciation|say it|one more time) /.test(t))cmd='rep';
  if(!cmd)return null;
  let letterish=0;for(const x of tokenize(raw)){const n=norm(x);if(n.length===1||LETTER.has(n))letterish++}
  return letterish<=3?cmd:null;
}
/* The browser can offer several guesses for what she said. Keep the one that reads most like spelled letters: the
   most letters it is sure of, and the fewest it had to guess at. The first guess wins a tie. */
function bestGuess(result){
  const w=S&&cur();let best=result[0]?result[0].transcript:'',top=-Infinity;
  for(let k=0;k<result.length;k++){const t=result[k].transcript,toks=parseSpelling(t,w).tokens,sure=toks.filter(o=>!o.unsure).length;
    const score=sure*2-(toks.length-sure)*3;if(score>top){top=score;best=t}}
  return best;
}
/* Letters that sound alike, in the order a tap on a tile tries them. */
const ALIKE=[['b','d','e','p','t','v','z','c','g'],['m','n'],['f','s','x'],['a','j','k'],['i','y'],['q','u','w'],['l','r']];
const alikeOf=ch=>ALIKE.find(g=>g.includes(ch));
const ordinal=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
function tilesHTML(tokens,tappable){if(tappable)return tokens.map((o,i)=>o.ch===' '?'<span class="tile gap"></span>':alikeOf(o.ch)?`<button type="button" class="tile tap${o.unsure?' unsure':''}" data-i="${i}" aria-label="Letter ${i+1}, ${esc(o.ch.toUpperCase())}. Tap for a letter that sounds like it">${esc(o.ch)}</button>`:`<span class="tile${o.unsure?' unsure':''}">${esc(o.ch==='-'?'–':o.ch)}</span>`).join('');
return tokens.map(o=>o.ch===' '?'<span class="tile gap"></span>':`<span class="tile${o.unsure?' unsure':''}">${esc(o.ch==='-'?'–':o.ch)}</span>`).join('')}
function listen(fromTap,keep){
  if(!S||S.checked)return;
  if(!SR||srBroken){keyboardFallback();return}
  hush();
  const base=keep?(S.heardTokens||[]):[];
  if(!keep){S.heard='';S.heardTokens=[]}
  const sess={rec:null,acc:'',cur:'',prev:'',base,finished:false,restarts:0,started:Date.now(),sil:0,max:0,dead:0,alive:false,gotAny:false,fromTap};
  try{sess.rec=IOS&&REC?REC:new SR();if(IOS)REC=sess.rec;sess.rec.owner=sess}catch(e){srBroken=true;keyboardFallback();return}
  sess.ev={audio:0,sound:0,speech:0,words:0};
  L=sess;const r=sess.rec;
  r.lang='en-US';r.continuous=true;r.interimResults=true;try{r.maxAlternatives=5}catch(e){}
  r.onstart=()=>{sess.alive=true;tapFails=0};
  r.onaudiostart=()=>{sess.alive=true;tapFails=0;sess.ev.audio=1};
  r.onsoundstart=()=>{sess.ev.sound=1};
  r.onresult=e=>{if(L!==sess||sess.finished)return;sess.gotAny=true;sess.ev.words++;emptyRuns=0;let t='';for(let i=0;i<e.results.length;i++)t+=' '+bestGuess(e.results[i]);onHeard(sess,t.trim())};
  r.onerror=e=>{if(L!==sess||sess.finished)return;onSRError(sess,e.error||'error')};
  r.onend=()=>{if(L!==sess||sess.finished)return;
    sess.acc=(sess.acc+' '+sess.cur).trim();sess.cur='';sess.prev='';
    if(!sess.stopping&&!IOS&&sess.restarts<3&&Date.now()-sess.started<40000){sess.restarts++;try{r.start();return}catch(e){}}
    sess.ended=true;finishListen(sess)};
  /* she's talking: say so, even before any letters come through */
  r.onspeechstart=()=>{sess.ev.speech=1;if(L===sess&&!sess.finished&&!sess.gotAny&&!sess.stopping)bubble('I can hear you. Keep spelling!')};
  try{r.start()}catch(e){onSRError(sess,'start-failed');return}
  sess.max=setTimeout(()=>finishListen(sess),45000);
  sess.sil=setTimeout(()=>{if(!sess.gotAny)finishListen(sess)},9000);
  /* some in-app browsers show the listening feature but never start it */
  if(fromTap)sess.dead=setTimeout(()=>{if(!sess.alive&&!sess.gotAny&&!sess.finished)onSRError(sess,'never-started')},6000);
  showTalk('listening');setBJ('listen');
  $('tiles').innerHTML=tilesHTML(base);
  bubble(keep?'Keep going. Say the rest of the letters.':'I’m listening. Say each letter.');
}
function onHeard(sess,t){
  sess.gotAny=true;
  const tk=t.split(/\s+/),h=tk.length/2;
  if(tk.length>=6&&tk.length%2===0&&tk.slice(0,h).join(' ').toLowerCase()===tk.slice(h).join(' ').toLowerCase())t=tk.slice(0,h).join(' ');
  const w=cur(),now=parseSpelling(t,w).letters,before=parseSpelling(sess.prev,w).letters;
  /* iOS can forget what it heard after a pause and start a fresh transcript; keep the old letters when that happens */
  const fresh=sess.prev&&before.length>=2&&now.length>0&&!before.startsWith(now)&&!now.slice(1).startsWith(before.slice(1))&&(now[0]!==before[0]||now.length<before.length/2);
  if(fresh)sess.acc=(sess.acc+' '+sess.prev).trim();
  sess.cur=t;sess.prev=t;
  const full=(sess.acc+' '+sess.cur).trim();
  const cmd=commandOf(full);
  if(cmd){finishListen(sess,true);ask(cmd,true);return}
  const p=parseSpelling(full,w);
  $('tiles').innerHTML=tilesHTML(sess.base.concat(p.tokens));
  clearTimeout(sess.sil);sess.sil=setTimeout(()=>finishListen(sess),p.letters.length?2300:4200);
}
function stopRec(sess){sess.finished=true;clearTimeout(sess.sil);clearTimeout(sess.max);clearTimeout(sess.dead);const r=sess.rec;if(r){r.onresult=null;r.onend=null;r.onerror=null;try{r.stop()}catch(e){}setTimeout(()=>{if(r.owner===sess)try{r.abort()}catch(e){}},350)}if(L===sess)L=null;setBJ('')}
function finishListen(sess,forCommand){
  if(sess.finished)return;
  /* iOS can hold back what it heard until listening stops: ask it to stop, and wait (up to 1.5 seconds) for those
     last words before reading the letters. */
  if(!forCommand&&sess.rec&&!sess.ended){
    if(!sess.stopping){sess.stopping=true;clearTimeout(sess.sil);clearTimeout(sess.max);try{sess.rec.stop()}catch(e){}
      sess.grace=setTimeout(()=>{sess.ended=true;finishListen(sess)},1500);
      if(!(sess.acc+' '+sess.cur).trim())bubble('One second…');}
    return;
  }
  clearTimeout(sess.grace);stopRec(sess);
  if(forCommand||!S||S.checked)return;
  const w=cur(),full=(sess.acc+' '+sess.cur).trim(),p=parseSpelling(full,w);
  if(useClaude()&&!sess.base.length&&full&&looksLikeQuestion(full)){askBB(full,true);return}
  const tokens=sess.base.concat(p.tokens);
  if(!tokens.length){
    showTalk('idle');$('tiles').innerHTML='';
    if(IOS&&!p.sawWord&&++emptyRuns>=2){emptyRuns=0;srBroken=true;renderMicNote();
      keyboardFallback('This iPad isn’t sending me your letters. Let’s use the keyboard: tap the box, tap the microphone on the keyboard, and say the letters.');return}
    const e=sess.ev||{},y=v=>v?'✓':'✗';
    bubble((p.sawWord?'I heard the word, but not the letters. Tap the microphone and say each letter with a tiny pause.':'I didn’t hear any letters. Tap the microphone and spell the word.')+
      (IOS?` (BB check: mic ${y(e.audio)} sound ${y(e.sound)} voice ${y(e.speech)} words ${e.words||0})`:''));
    return;
  }
  if(useClaude()&&p.tokens.some(t=>t.unsure)){readWithClaude(sess.base,full,w,tokens);return}
  showHeard(tokens);
}
function showHeard(tokens,msg){
  S.heardTokens=tokens;S.heard=tokens.map(o=>o.ch).join('');
  $('tiles').innerHTML=tilesHTML(tokens,true);
  /* 3. say which letters BB wasn't sure of */
  const doubt=tokens.map((o,i)=>o.unsure?i:-1).filter(i=>i>=0);
  if(!msg&&doubt.length)msg=(doubt.length===1?`I wasn’t sure about the ${ordinal(doubt[0]+1)} letter.`:`I wasn’t sure about the ${doubt.slice(0,-1).map(i=>ordinal(i+1)).join(', ')} and ${ordinal(doubt[doubt.length-1]+1)} letters.`)+' Tap a letter to change it, then tap Check it.';
  else if(!msg)msg='Is that what you said? Tap a letter to change it, or tap Check it.';
  if(SET.autoCheck){submit(lettersOnly(S.heard),S.heard.toUpperCase(),S.heard);return}
  showTalk('heard');
  bubble(msg||'Is that what you said? Tap Check it, or fix it first.');
}
/* messy speech ("B as in boy, no wait...") goes to Claude, which never sees the word itself */
function readWithClaude(base,full,w,local){
  showTalk('thinking');$('tiles').innerHTML=tilesHTML(local);
  bubble('Hmm, let me make sure I heard you right\u2026');
  const ref=S;
  gs('spellReadLetters',[maskTarget(full,w)],10000).then(r=>{
    if(S!==ref||cur()!==w||S.checked)return;
    const got=String(r&&r.letters||'').toLowerCase().replace(/[^a-z\- ]/g,'');
    if(!got){showHeard(local);return}
    const un=new Set((r.unsure||[]).map(Number));
    showHeard(base.concat([...got].map((ch,i)=>({ch,unsure:un.has(i)}))),'I think you said this. Is that right?');
  }).catch(()=>{if(S!==ref||cur()!==w||S.checked)return;showHeard(local)});
}
function onSRError(sess,err){
  if(err==='aborted')return;
  if(err==='no-speech'){finishListen(sess);return}
  /* a restart after a pause that the browser refused: keep what she said; she taps Keep going for the rest */
  if((err==='not-allowed'||err==='service-not-allowed')&&sess.restarts>0){finishListen(sess);return}
  stopRec(sess);showTalk('idle');
  if(err==='never-started'){srBroken=true;keyboardFallback('Listening isn\u2019t starting here, so let\u2019s use the keyboard microphone instead.');renderMicNote();return}
  if(err==='not-allowed'||err==='service-not-allowed'||err==='start-failed'){
    if(!sess.fromTap){autoOK=false;bubble('Your turn! Tap the microphone and spell the word.');return}
    /* a tap that didn't get to listen: try again once (iOS sometimes says no to the first tap after a while) */
    if(++tapFails<2){bubble('The iPad didn’t let me listen that time. Tap the microphone again, and tap Allow if it asks.');return}
    srBroken=true;keyboardFallback('I can’t use the microphone here, so let’s use the keyboard microphone instead.');renderMicNote();return}
  if(err==='audio-capture'){srBroken=true;keyboardFallback('I can’t find a microphone. Let’s type it.');renderMicNote();return}
  if(err==='network'){keyboardFallback('I need the internet to listen. Let’s type it for now.');return}
  bubble('Listening got stuck. Tap the microphone to try again.');
}

/* ---------- Claude, through Book Dude's Anthropic API key ---------- */
let CLAUDE=false,askId=0;
const useClaude=()=>GAS&&CLAUDE&&SET.claude!==false;
function post(action,arg,ms){
  if(!GAS||navigator.onLine===false)return Promise.reject(new Error('net'));
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms||15000);
  return fetch(LINK+'&t='+Date.now(),{method:'POST',body:JSON.stringify({action,arg}),signal:ctl.signal}).then(r=>r.json()).then(o=>{clearTimeout(t);if(!o||o.error)throw new Error(o&&o.error||'bad');return o.result}).finally(()=>clearTimeout(t))}
const CALLS={spellReadLetters:'spell-letters',spellAsk:'spell-ask',spellTrick:'spell-trick'};
function gs(fn,args,ms){return post(CALLS[fn],(args||[])[0],ms)}
function maskTarget(raw,w){
  const toks=String(raw).split(/\s+/).filter(Boolean),nt=toks.map(t=>norm(t).replace(/[^a-z]/g,'')),out=[];
  const targets=w.alts.map(a=>norm(a).replace(/-/g,' ').split(/\s+/).map(x=>x.replace(/[^a-z]/g,''))),joined=w.alts.map(lettersOnly);
  for(let i=0;i<toks.length;i++){const r=toks[i],caps=r.length>1&&/[A-Z]/.test(r)&&r===r.toUpperCase();
    if(!caps&&joined.includes(nt[i])){out.push('[word]');continue}
    const hit=!caps&&targets.find(tg=>tg.every((x,k)=>nt[i+k]===x));
    if(hit){out.push('[word]');i+=hit.length-1;continue}
    out.push(r)}
  return out.join(' ');
}
function looksLikeQuestion(raw){
  const t=' '+norm(raw).replace(/[^a-z' ]/g,' ').replace(/\s+/g,' ').trim()+' ';
  const q=/\?/.test(raw)||/^ (what|whats|how|why|does|do|is|are|can|could|where|who|which|when|will|would|should|tell|hey|bb|bebe|birdie) /.test(t)||/ (can you|could you|tell me|what does|what is|is it|does it|how do) /.test(t);
  if(!q)return false;
  let letterish=0,other=0;for(const x of tokenize(raw)){const n=norm(x).replace(/'/g,'');if(n.length===1||LETTER.has(n))letterish++;else other++}
  return letterish<=3&&other>=2;
}
function maskAnswer(t,w){
  let s=String(t);const forms=new Set();for(const a of w.alts){forms.add(a);forms.add(norm(a))}
  for(const f of forms){s=s.replace(wordRe(f),(m,p)=>p+'your word');const Ls=[...lettersOnly(f)];
    if(Ls.length>=3)s=s.replace(new RegExp('(^|[^'+WB+'])('+Ls.map(reEsc).join('[\\s\\-.,–—]+')+')(?!['+WB+'])','gi'),(m,p)=>p+'(no peeking!)')}
  return s.replace(/\b(an?|the)\s+your word/gi,'your word');
}
function askBB(q,fromVoice){
  if(!S||!useClaude())return;
  q=String(q||'').trim().slice(0,200);if(!q)return;
  const w=cur(),id=++askId,answered=!!S.checked;
  if(L)stopRec(L);hush();
  if(!S.checked&&!$('talkArea').hidden&&!S.heard)showTalk('idle');
  const info=$('info');info.innerHTML='<b>You asked:</b> '+esc(q)+'<br><span class="note">BB is thinking…</span>';info.hidden=false;
  bubble('Good question! Let me think…');
  gs('spellAsk',[{word:w.w,alts:w.alts,pos:POS_SHOW[w.pos],def:w.def,sen:w.sen,ori:w.ori,question:q,answered}],25000).then(a=>{
    if(id!==askId||!S||cur()!==w)return;
    let txt=String(a||'').trim();if(!txt)throw new Error('empty');
    if(!S.checked)txt=maskAnswer(txt,w);
    info.innerHTML='<b>You asked:</b> '+esc(q)+'<br><b>BB:</b> '+esc(txt);
    bubble(S.checked?'Here’s what I think.':'There’s a hint. Now you try!');
    return say([txt]).then(ok=>{if(ok&&id===askId&&S&&cur()===w&&!S.checked&&fromVoice&&answerMode()==='talk'&&!S.heard){if(autoOK)listen(false,false);else bubble('Your turn! Tap the microphone and spell the word.')}});
  }).catch(e=>{
    if(id!==askId||!S||cur()!==w)return;
    const m=String(e&&e.message||e);
    info.innerHTML='<b>You asked:</b> '+esc(q)+'<br>'+(/limit/.test(m)?'BB has answered lots of questions today and needs a nap. Try again tomorrow.':'BB couldn’t answer just now. Try again in a minute.');
    bubble('My brain is a little foggy. Let’s keep spelling!');
  });
}

/* ---------- screens ---------- */
function show(id){for(const s of['home','play','done'])$(s).hidden=s!==id;window.scrollTo(0,0)}
const answerMode=()=>SET.answer==='talk'&&(!SR||srBroken)?'keyboard':SET.answer;
const words=()=>SET.level==='all'?W:W.filter(w=>w.lv===SET.level);
let filter='all',query='';

function renderMicNote(){
  let t='';
  if(SET.answer==='talk'){
    if(!SR)t='This browser can’t listen, so BB will ask you to use the microphone on the keyboard instead.';
    else if(srBroken)t='Listening isn’t working here. Make sure Dictation is on (Settings, General, Keyboard), or use the microphone on the keyboard.';
    else t=IOS?'Tap the microphone for each word, then spell it. The first time, tap Allow so BB can hear you.':'The first time, tap Allow so BB can hear you.';
  }else if(SET.answer==='grownup')t='BB reads the word, you spell it out loud, and a grown-up checks.';
  $('micNote').textContent=t;$('micNote').hidden=!t;
}
function pointsNow(){return C.spellPoints({earned:EARNED,streaks:STREAKS})}
function renderPoints(){
  const r=pointsNow(),lv=SET.level==='all'?LV.find(k=>r.gems[k]<r.levels[k].size)||'three':SET.level,L=r.levels[lv];
  const grown=ARCADE.kind==='grownup';
  $('pts').textContent=grown?`Playing as ${ARCADE.player}. Your gems are yours; only a reader’s gems earn points.`
    :`Spelling points so far: ${r.total}. ${r.gems[lv]>=L.size?`Every ${L.name} word is a gem!`:`${r.next[lv]} more gem${r.next[lv]===1?'':'s'} on ${L.name} for ${L.rate} more point${L.rate>1?'s':''}.`}`;
  const days=Math.round((Date.parse(BEE_DAY+'T12:00:00')-Date.parse(today()+'T12:00:00'))/864e5);
  $('beeDay').textContent=days>1?`School spelling bee: January 10. ${days} days to go!`:days===1?'The school spelling bee is tomorrow! You’ve got this.':days===0?'Spelling bee day! Go stomp those typos.':'';
}
function renderHome(){
  renderPoints();
  const tot=W.filter(w=>get(w)[1]).length;
  $('hello').textContent=tot?`You have ${tot} gem${tot>1?'s':''}. Pick a list and let’s spell!`:'Hi, I’m BB! I’m a blanket, and so many stories were read under me that I know a LOT of words. Pick a list and let’s spell!';
  $('levels').innerHTML=['one','two','three','all'].map(k=>{const ws=k==='all'?W:W.filter(w=>w.lv===k);const m=ws.filter(w=>get(w)[1]).length;
    return`<button class="lv${k===SET.level?' on':''}" data-lv="${k}" style="--c:${LV_COL[k]}"><b>${LV_NAME[k]}</b><span class="bar"><i style="width:${(m/ws.length*100).toFixed(1)}%"></i></span><small>${m} of ${ws.length} gems</small></button>`}).join('');
  for(const b of $('answerSeg').children)b.classList.toggle('on',b.dataset.a===SET.answer);
  renderMicNote();
  const tr=words().filter(isTricky).length;
  $('trickyN').textContent=tr?`${tr} word${tr>1?'s':''} to fix up.`:'Words you miss will wait for you here.';
  $('mTricky').disabled=!tr;
  $('bestN').textContent=`Best on ${LV_NAME[SET.level]}: ${BEST[SET.level]||0} in a row.`;
  for(const b of document.querySelectorAll('.sw'))b.setAttribute('aria-checked',String(!!SET[b.dataset.s]));
  for(const b of document.querySelectorAll('[data-r]'))b.classList.toggle('on',+b.dataset.r===SET.rate);
  $('saveNote').textContent=ARCADE.kind==='grownup'?'Your practice is saved on this device.':'Gems are saved in Book Dude and count as points.';
  $('claudeSet').hidden=!CLAUDE;$('aiNote').hidden=!CLAUDE;
  renderGrid();
}
function renderGrid(){
  const q=lettersOnly(query);
  const list=words().filter(w=>{const s=get(w);if(q&&!lettersOnly(w.w).includes(q))return false;return filter==='all'||(filter==='got'?s[1]:filter==='tr'?isTricky(w):!s[1]&&!s[2])});
  $('grid').innerHTML=list.length?list.map(w=>{const s=get(w);return`<button class="g${s[1]?' got':isTricky(w)?' tr':''}" data-w="${esc(w.w)}" style="--c:${LV_COL[w.lv]}"><svg><use href="#${s[1]?'gem':'rock'}"/></svg><span>${esc(w.w)}</span></button>`}).join(''):'<p class="note">Nothing here yet.</p>';
}

/* ---------- a round ---------- */
let S=null,S0=0;
const cur=()=>S.q[S.i];
function pickSet(pool){const un=shuf(pool.filter(w=>!get(w)[1]));const tricky=un.filter(w=>get(w)[2]),fresh=un.filter(w=>!get(w)[2]);
  let q=[...tricky.slice(0,3),...fresh].slice(0,10);if(q.length<10)q=q.concat(shuf(pool.filter(w=>get(w)[1]&&!q.includes(w))).slice(0,10-q.length));return shuf(q)}
function start(kind){
  unlock();
  const pool=words();let q;
  S0=pointsNow().total;
  if(kind==='bee')q=shuf(pool.slice());else if(kind==='tricky')q=shuf(pool.filter(isTricky)).slice(0,10);else q=pickSet(pool);
  if(!q.length)return;
  if(SR){srBroken=false;autoOK=!IOS;tapFails=0}
  S={kind,q,i:0,res:[],seen:new Set(),retry:new Set(),streak:0,gems:[],over:false,checked:false,heard:'',heardTokens:[]};
  $('lvChip').textContent=LV_NAME[SET.level];$('lvChip').style.setProperty('--c',LV_COL[SET.level]);
  show('play');nextWord();
}
function showTalk(state){
  $('micWrap').hidden=state==='heard'||state==='locked'||state==='thinking';
  $('heardBtns').hidden=state!=='heard';
  const on=state==='listening';
  $('mic').classList.toggle('on',on);
  $('micIcon').innerHTML=`<use href="#${on?'i-stop':'i-mic'}"/>`;
  $('mic').setAttribute('aria-label',on?'Done spelling':'Tap and spell');
  $('micLabel').textContent=on?'Listening… tap when you’re done':'Tap and spell';
}
function keyboardFallback(msg){
  $('talkArea').hidden=true;$('typeArea').hidden=false;
  $('typeHint').textContent='Tap the box, then tap the microphone on the keyboard and say the letters. You can also just type.';
  if(msg)bubble(msg);
}
function layoutAnswer(){
  const m=answerMode();
  $('talkArea').hidden=m!=='talk';$('typeArea').hidden=!(m==='type'||m==='keyboard');$('grownArea').hidden=m!=='grownup';
  if(m==='keyboard')$('typeHint').textContent='Tap the box, then tap the microphone on the keyboard and say the letters. You can also just type.';
  if(m==='type')$('typeHint').textContent='Type the word, then tap Check it.';
  $('ans').value='';$('ans').disabled=false;$('checkTyped').hidden=false;
  $('tiles').innerHTML='';showTalk('idle');
  $('reveal').hidden=true;$('showW').hidden=false;$('gotIt').hidden=true;$('missIt').hidden=true;
  $('fb').hidden=true;$('nextRow').hidden=true;$('skipRow').hidden=false;$('info').hidden=true;
  for(const b of $('asks').children)b.disabled=false;
  $('askRow').hidden=true;$('askIn').value='';$('askBJ').hidden=!useClaude();
}
function nextWord(){
  if(L)stopRec(L);
  S.checked=false;S.heard='';S.heardTokens=[];
  const w=cur();
  $('count').textContent=S.kind==='bee'?`In a row: ${S.streak}`:`Word ${Math.min(S.i+1,S.q.length)} of ${S.q.length}`;
  layoutAnswer();
  bubble('Listen carefully…');
  const parts=['Your word is: '+spoken(w)+'.'];
  if(SET.autoDef)parts.push('It means: '+lowerFirst(w.def));
  if(SET.autoSen)parts.push(spokenSentence(w));
  parts.push(spoken(w)+'.');
  say(parts).then(ok=>{if(ok&&S&&cur()===w&&!S.checked)yourTurn()});
}
function yourTurn(){
  const m=answerMode();
  if(m==='talk'){if(SET.autoListen&&autoOK)listen(false,false);else bubble('Your turn! Tap the microphone and spell the word.')}
  else if(m==='grownup')bubble('Your turn! Spell it out loud.');
  else if(m==='keyboard')bubble('Your turn! Use the keyboard microphone, or type it.');
  else bubble('Your turn! Type the word.');
}
function blanked(w){let s=w.sen;for(const a of w.alts)s=s.replace(wordRe(a),(m,p)=>p+'\u0000');return esc(s).replace(/\u0000/g,'_____')}
function ask(cmd,fromVoice){
  if(!S||S.checked)return;
  const w=cur();
  if(L)stopRec(L);
  if(!$('talkArea').hidden&&!S.heard)showTalk('idle');
  const info=$('info');let text='',html='';
  if(cmd==='rep'){text=spoken(w)+'.';html=''}
  else if(cmd==='def'){text='It means: '+lowerFirst(w.def);html='<b>Definition:</b> '+esc(w.def)}
  else if(cmd==='sen'){text=spokenSentence(w);html='<b>Sentence:</b> '+blanked(w)}
  else if(cmd==='pos'){text='It is '+POS_SAY[w.pos]+'.';html='<b>Part of speech:</b> '+esc(POS_SHOW[w.pos])}
  else if(cmd==='ori'){text=originLine(w);html='<b>Origin:</b> '+esc(langOf(w.ori))}
  if(html){info.innerHTML=html;info.hidden=false}
  bubble(cmd==='rep'?'Here it is again.':'Here you go.');
  say(cmd==='rep'?[spoken(w)+'.']:[text,spoken(w)+'.']).then(ok=>{if(ok&&S&&cur()===w&&!S.checked){if(answerMode()==='talk'&&!S.heard){if(fromVoice&&autoOK)listen(false,false);else bubble('Your turn! Tap the microphone and spell the word.')}else bubble('Your turn!')}});
}
/* Typed, or dictated with the keyboard's microphone: "c r u m p", or letter names like "see are you em pee",
   "double L", "hyphen", which dictation types out as words. */
function typedLetters(text){const toks=tokenize(text).map(t=>norm(t).replace(/'/g,''));if(toks.length>1&&toks.every(t=>t.length===1))return toks.join('');
  if(toks.length>1&&toks.every(t=>t.length===1||LETTER.has(t)||['double','hyphen','dash','space','as','in','like','for'].includes(t)||FILL.has(t)))return parseSpelling(text,S&&cur()).letters.replace(/[\s-]/g,'')||lettersOnly(text);
  return lettersOnly(text)}
function diff(word,attempt){
  const shown=[...word],c=[],pos=[];
  shown.forEach((ch,k)=>{const l=lettersOnly(ch);if(l){c.push(l);pos.push(k)}});
  const a=[...attempt],n=c.length,m=a.length,d=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=c[i]===a[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
  const keep=new Set();let i=0,j=0;
  while(i<n&&j<m){if(c[i]===a[j]){keep.add(pos[i]);i++;j++}else if(d[i+1][j]>=d[i][j+1])i++;else j++}
  return shown.map((ch,k)=>lettersOnly(ch)&&!keep.has(k)?`<span class="bad">${esc(ch)}</span>`:(ch===' '?'&nbsp;':esc(ch))).join('');
}
const PRAISE=['Correct!','That’s right!','Nailed it!','You got it!','Perfect spelling!'];
const CHEER=['BB does a happy wiggle.','Fig opens one eye, impressed.','Maple wags approvingly.','The Dude tips his glasses.'];
function submit(letters,shown,raw){
  if(!S||S.checked)return;
  if(L)stopRec(L);
  hush();
  S.checked=true;
  const w=cur(),ok=w.alts.some(a=>lettersOnly(a)===letters);
  const before=S.gems.length;record(w,ok,shown);const newGem=S.gems.length>before;
  $('talkArea').hidden=true;$('typeArea').hidden=true;$('grownArea').hidden=true;$('skipRow').hidden=true;
  for(const b of $('asks').children)b.disabled=b.dataset.ask!=='bj';
  let h='';
  if(ok){h+=`<div class="big ok pop">${pick(PRAISE)}</div><p class="note">${pick(CHEER)}</p><div class="spell">${esc(w.w)}</div>`;
    if(newGem)h+=`<div class="gemline pop" style="--c:${LV_COL[w.lv]}"><svg><use href="#gem"/></svg>New gem!</div>`;
    if(w.w.includes('-')&&!/hyphen|dash|-/i.test(raw||''))h+=`<p class="note">At the bee, remember to say “hyphen” where the dashes go.</p>`;}
  else{h+=`<div class="big no">Not quite</div><p class="note">BB caught a typo. Here’s how it’s spelled:</p><div class="spell">${diff(w.w,letters)}</div>`;
    if(shown)h+=`<p class="note">You spelled: <b>${esc(shown)}</b></p>`;
    if(S.kind!=='bee')h+=`<p class="note">This word will come back for another try.</p>`;}
  if(w.alts.length>1)h+=`<p class="note">${w.alts.map(esc).join(' and ')} are both correct.</p>`;
  h+=`<div class="learn"><p><b class="fred">${esc(w.w)}</b> <i>${esc(POS_SHOW[w.pos])}</i></p><p>${esc(w.def)}</p><p><i>“${esc(w.sen)}”</i></p><p class="note">Origin: ${esc(w.ori)}</p></div>`;
  $('fb').innerHTML=h;$('fb').hidden=false;
  $('next').textContent=S.over||S.i+1>=S.q.length?'See how I did':'Next word';
  $('nextRow').hidden=false;
  bubble(ok?(newGem?'Correct! You won a gem!':'Correct!'):'Not quite. Listen to how it’s spelled.');
  const fbSay=say(ok?[newGem?'Correct! You won a gem!':pick(PRAISE)]:['Not quite. '+spoken(w)+' is spelled: '+spellOut(w.w)]);
  if(!ok&&useClaude()){
    const box=document.createElement('p');box.className='trick';box.innerHTML='<b>BB\u2019s trick:</b> <span class="note">thinking of one\u2026</span>';
    const learn=$('fb').querySelector('.learn');if(learn)learn.before(box);else $('fb').append(box);
    const ref=S;
    gs('spellTrick',[{word:w.w,attempt:shown||'',def:w.def}],20000).then(t=>{
      if(S!==ref||cur()!==w)return;const txt=String(t||'').trim();if(!txt){box.remove();return}
      box.innerHTML='<b>BB\u2019s trick:</b> '+esc(txt);
      fbSay.then(()=>{if(S===ref&&cur()===w&&S.checked&&!saying)say([txt])});
    }).catch(()=>box.remove());
  }
  if(S.kind==='bee')$('count').textContent=`In a row: ${S.streak}`;
}
function record(w,ok,ans){
  const s=mut(w),first=!S.seen.has(w.w);S.seen.add(w.w);
  if(ok){s[0]++;if(s[0]>=2&&!s[1]){s[1]=1;S.gems.push(w);if(!EARNED[w.w])EARNED[w.w]={lv:w.lv,d:today(),cb:s[2]>0?1:0}}}else{s[0]=0;s[1]=0;s[2]++}
  if(first)S.res.push({w,ok});
  if(S.kind==='bee'){if(ok){S.streak++;for(const n of[10,25,50])if(S.streak>=n&&!STREAKS[n])STREAKS[n]=today()}else S.over=true;if(S.streak>(BEST[SET.level]||0))BEST[SET.level]=S.streak}
  if(!ok&&S.kind!=='bee'&&!S.retry.has(w.w)){S.retry.add(w.w);S.q.splice(Math.min(S.i+4,S.q.length),0,w)}
  logAttempt(w,ans||'',ok);save();
}
function next(){unlock();if(!S)return;if(S.over){finish();return}S.i++;if(S.i>=S.q.length)finish();else nextWord()}
function finish(){
  hush();if(L)stopRec(L);flushLog();
  const right=S.res.filter(r=>r.ok).length;
  if(S.kind==='bee'){
    $('dTitle').textContent=`${S.streak} in a row!`;
    const miss=S.res.find(r=>!r.ok);
    $('dSub').innerHTML=`Best on ${esc(LV_NAME[SET.level])}: ${BEST[SET.level]||0}.`+(miss?` The word that got you: <b>${esc(miss.w.w)}</b>.`:'');
    $('doneBubble').textContent=S.streak>=5?'What a streak! I’m doing my happy wiggle.':'Good round! Every try makes you stronger.';
  }else{
    $('dTitle').textContent=`${right} of ${S.res.length} on the first try`;
    $('dSub').textContent=right===S.res.length?'A perfect round!':'Missed words are waiting in Tricky words.';
    $('doneBubble').textContent=right===S.res.length?'Perfect! Not a single wrinkle of a typo.':'Nice work! Let’s smooth out those typos next time.';
  }
  const won=pointsNow().total-S0;
  $('dPts').textContent=ARCADE.kind==='grownup'?'':won>0?`+${won} spelling point${won>1?'s':''}! They’re waiting on the Progress tab.`:`${pointsNow().next[S.q[0]?S.q[0].lv:'one']} more gems to the next point.`;
  $('dGems').innerHTML=S.gems.length?`<h3 class="mt">New gems</h3><div class="grid">${S.gems.map(w=>`<div class="g got pop" style="--c:${LV_COL[w.lv]}"><svg><use href="#gem"/></svg><span>${esc(w.w)}</span></div>`).join('')}</div>`:'';
  $('dList').innerHTML=S.res.map(r=>`<div><svg style="color:${r.ok?'var(--good)':'var(--bad)'}" aria-label="${r.ok?'right':'missed'}"><use href="#${r.ok?'i-ok':'i-miss'}"/></svg>${esc(r.w.w)}</div>`).join('');
  show('done');
}
function goHome(){hush();if(L)stopRec(L);flushLog();S=null;closeCard();renderHome();show('home')}

/* ---------- study card ---------- */
function openCard(w){
  const s=get(w);
  $('ovCard').innerHTML=`<div class="row between"><span class="chip" style="--c:${LV_COL[w.lv]}">${LV_NAME[w.lv]}</span><button class="pill" id="ovClose">Close</button></div>
  <p class="ovWord mt">${esc(w.alts.join(' or '))}</p><p class="note">${esc(POS_SHOW[w.pos])}${s[1]?' · gem earned':isTricky(w)?' · tricky word':''}</p>
  <div class="row left mt"><button class="go" id="ovHear">Hear it</button><button class="go alt" id="ovSpell">Spell it out</button><button class="go alt" id="ovSen">Hear the sentence</button></div>
  <div class="learn"><p>${esc(w.def)}</p><p><i>“${esc(w.sen)}”</i></p><p class="note">Origin: ${esc(w.ori)}</p></div>`;
  $('ov').hidden=false;
  $('ovClose').onclick=closeCard;
  $('ovHear').onclick=()=>{unlock();say([spoken(w)+'.'])};
  $('ovSpell').onclick=()=>{unlock();say([spoken(w)+'.',spellOut(w.w),spoken(w)+'.'])};
  $('ovSen').onclick=()=>{unlock();say([spokenSentence(w)])};
  $('ovClose').focus();
}
function closeCard(){$('ov').hidden=true;hush()}

/* ---------- events ---------- */
$('levels').addEventListener('click',e=>{const b=e.target.closest('[data-lv]');if(!b)return;SET.level=b.dataset.lv;save();renderHome()});
$('answerSeg').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;SET.answer=b.dataset.a;save();renderHome()});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;for(const x of $('filters').children)x.classList.toggle('on',x===b);renderGrid()});
$('search').addEventListener('input',e=>{query=e.target.value;renderGrid()});
$('grid').addEventListener('click',e=>{const b=e.target.closest('[data-w]');if(!b)return;const w=BYW.get(b.dataset.w);if(w)openCard(w)});
for(const b of document.querySelectorAll('.sw'))b.addEventListener('click',()=>{SET[b.dataset.s]=!SET[b.dataset.s];save();renderHome()});
for(const b of document.querySelectorAll('[data-r]'))b.addEventListener('click',()=>{unlock();SET.rate=+b.dataset.r;save();renderHome();say(['This is how fast I will talk.'])});
let armed=false;$('reset').addEventListener('click',()=>{if(!armed){armed=true;$('reset').textContent='Tap again to erase all progress';setTimeout(()=>{armed=false;$('reset').textContent='Reset progress'},4000);return}armed=false;P={};BEST={};save();/* the points she earned stay: EARNED and STREAKS are kept */$('reset').textContent='Reset progress';renderHome()});
$('mPractice').onclick=()=>start('practice');$('mBee').onclick=()=>start('bee');$('mTricky').onclick=()=>start('tricky');
$('asks').addEventListener('click',e=>{const b=e.target.closest('[data-ask]');if(!b)return;unlock();if(b.dataset.ask==='bj'){const r=$('askRow');r.hidden=!r.hidden;if(!r.hidden)$('askIn').focus();return}ask(b.dataset.ask,false)});
$('askGo').onclick=()=>{unlock();const v=$('askIn').value;if(!v.trim())return;$('askIn').value='';askBB(v,false)};
$('askIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('askGo').click()}});
$('mic').onclick=()=>{unlock();if(L){finishListen(L);return}listen(true,false)};
$('more').onclick=()=>listen(true,true);
$('redo').onclick=()=>{S.heard='';S.heardTokens=[];$('tiles').innerHTML='';listen(true,false)};
$('fix').onclick=()=>{$('talkArea').hidden=true;$('typeArea').hidden=false;$('typeHint').textContent='Fix any letter BB heard wrong, then tap Check it.';$('ans').value=S.heard.toUpperCase();$('ans').focus();bubble('Fix the letters I heard wrong.')};
$('tiles').addEventListener('click',e=>{const t=e.target.closest('.tile.tap');if(!t||!S||S.checked||!S.heardTokens)return;
  const i=+t.dataset.i,o=S.heardTokens[i],g=alikeOf(o.ch);if(!g)return;
  S.heardTokens[i]={ch:g[(g.indexOf(o.ch)+1)%g.length]};S.heard=S.heardTokens.map(x=>x.ch).join('');
  $('tiles').innerHTML=tilesHTML(S.heardTokens,true);const b=$('tiles').querySelector('[data-i="'+i+'"]');if(b)b.focus()});
$('checkHeard').onclick=()=>submit(lettersOnly(S.heard),S.heard.toUpperCase(),S.heard);
$('checkTyped').onclick=()=>{const v=$('ans').value;if(!v.trim())return;submit(typedLetters(v),v.trim(),v)};
$('ans').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('checkTyped').click()}});
$('showW').onclick=()=>{const w=cur();$('reveal').textContent=w.alts.join(' or ');$('reveal').hidden=false;$('showW').hidden=true;$('gotIt').hidden=false;$('missIt').hidden=false};
$('gotIt').onclick=()=>{const w=cur();submit(lettersOnly(w.w),'',w.w)};
$('missIt').onclick=()=>submit('','','');
$('skip').onclick=()=>{unlock();if(S&&!S.checked)submit('','','')};
$('next').onclick=next;
$('quit').onclick=goHome;$('home2').onclick=goHome;
$('again').onclick=()=>{const k=S&&S.kind==='tricky'&&!words().some(isTricky)?'practice':(S?S.kind:'practice');start(k)};
$('ov').addEventListener('click',e=>{if(e.target===$('ov'))closeCard()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('ov').hidden)closeCard()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(L)finishListen(L);hush()}});

CLAUDE=GAS;
addEventListener('pagehide',flushLog);
renderHome();
window.__bee={showHeard,bestGuess,alikeOf,snapshot,EARNED:()=>EARNED,STREAKS:()=>STREAKS,parseSpelling,commandOf,typedLetters,W,BYW,diff,cur:()=>S&&S.q[S.i],maskTarget,maskAnswer,looksLikeQuestion};
}
