/* The Millcreek Trail: a homemade family game. The family's 1862 ancestors (and their terrier, cat and a blanket that
 * seems to be alive) cross from San Francisco to Millcreek in the Salt Lake Valley.
 * In Book Dude it keeps everything through the arcade (../arcade.js), apart for each player: the trip in progress
 * ('trip'), this device's hall of fame ('hof'), and the best finish under 'records' as { player: { trip: { stars, score } } }
 * for the family scoreboard. Stars: 3 if the whole party makes it, 2 if both grown-ups do, 1 for making it at all. */
'use strict';
const $=s=>document.querySelector(s);
const cv=$('#scene'),g=cv.getContext('2d');g.imageSmoothingEnabled=false;
const P=$('#panel');
const R=(a,b)=>a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),ch=p=>Math.random()<p,pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const LM=[{n:'San Francisco, California',m:0,t:'town'},{n:'San Joaquin River crossing',m:95,t:'river',ferry:5,dp:[2.5,6]},{n:'Fort Tejon',m:330,t:'fort'},{n:'Cajon Pass',m:450,t:'mark'},{n:'Mojave River crossing',m:500,t:'river',dp:[.5,2.2]},{n:'Las Vegas Springs',m:720,t:'mark'},{n:'Virgin River crossing',m:850,t:'river',dp:[1.5,4]},{n:'St. George',m:880,t:'fort'},{n:'Zion Canyon',m:925,t:'mark'},{n:'Cedar Breaks',m:975,t:'mark'},{n:'Cedar City',m:1000,t:'fort'},{n:'Beaver River crossing',m:1060,t:'river',dp:[1,3]},{n:'Sevier River crossing',m:1130,t:'river',dp:[2,5]},{n:'Fillmore',m:1175,t:'fort'},{n:'Mount Nebo',m:1240,t:'mark'},{n:'Provo and Utah Lake',m:1290,t:'fort'},{n:'Jordan River crossing',m:1320,t:'river',ferry:3,dp:[2,5]},{n:'Millcreek, Utah Territory',m:1345,t:'end'}];
const DEF=[{n:'Haddam',now:'Adam',k:'human',l:'wagon leader'},{n:'Katrina',now:'Kristina',k:'human',l:'his wife'},{n:'Mabel',now:'Maple',k:'dog',l:'Welsh terrier'},{n:'Twig',now:'Fig',k:'cat',l:'cat'},{n:'Gigi',now:'BB',k:'blanket',l:'sentient blanket'}];
const DIS={human:['dysentery','cholera','measles','typhoid','a fever','exhaustion','a broken arm'],dog:['porcupine quills','something questionable they ate','a thorn in the paw'],cat:['a hairball','a grudge against the oxen','a bad attitude'],blanket:['frayed edges','a bad case of burrs','soggy corners','an existential crisis']};
const PROF={banker:{n:'Banker from Boston',cash:1600,mult:1},carpenter:{n:'Carpenter from Ohio',cash:800,mult:2},farmer:{n:'Farmer from Illinois',cash:400,mult:3}};
const PACE=[['Steady',1,'8 hours a day, easy on everyone'],['Strenuous',1.4,'12 hours a day, tiring'],['Grueling',1.8,'16 hours a day, hard on health']];
const RAT=[['Filling',3,'meals are large and generous'],['Meager',2,'meals are small but adequate'],['Bare bones',1,'meals are very small, everyone stays hungry']];
const ITEMS=[{k:'oxen',n:'Oxen',u:'yoke of 2',p:40,per:2},{k:'food',n:'Food',u:'25 lbs',p:5,per:25},{k:'clothes',n:'Clothing',u:'set',p:10,per:1},{k:'bullets',n:'Bullets',u:'box of 20',p:2,per:20},{k:'wheel',n:'Wagon wheel',u:'each',p:10,per:1},{k:'axle',n:'Wagon axle',u:'each',p:10,per:1},{k:'tongue',n:'Wagon tongue',u:'each',p:10,per:1}];
const VAL={oxen:20,food:.2,clothes:10,bullets:.1,wheel:10,axle:10,tongue:10};
const UNIT={oxen:'oxen',food:'lbs of food',clothes:'sets of clothes',bullets:'bullets',wheel:'wagon wheel',axle:'wagon axle',tongue:'wagon tongue'};
const SPD={plains:20,hills:17,mountains:11,desert:15,redrock:13,forest:13};
let S=null,H={},mode='idle',off=0,last=0,hunt=null,timer=null,tombInfo=null;
const ARCADE=window.BookDudeArcade.open('millcreek-trail');
const save=()=>ARCADE.set('trip',S);
const load=()=>ARCADE.get('trip');
const dateStr=()=>{const d=new Date(S.t);return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`};
const month=()=>new Date(S.t).getUTCMonth();
const alive=()=>S.party.filter(m=>m.alive);
const humans=()=>alive().filter(m=>m.kind==='human');
const who=k=>{const m=S.party.find(p=>p.kind===k);return m&&m.alive?m:null};
const nextLM=()=>LM[S.li+1];
const terrain=(mi=S?S.miles:0)=>mi<330?'plains':mi<480?'mountains':mi<850?'desert':mi<1000?'redrock':mi<1240?'hills':'mountains';
const hpWord=h=>h>=75?'good':h>=50?'fair':h>=25?'poor':'very poor';
const screen=(html,h)=>{P.innerHTML=html;P.querySelectorAll('[data-hp]').forEach(i=>{i.style.width=i.dataset.hp+'%'});H=h||{};const f=P.querySelector('button.pri');if(f&&mode!=='going')f.focus({preventScroll:true})};
P.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(H[b.id])H[b.id](b);else if(H.any)H.any(b)});
const say=(t,next)=>screen(`<div class="msg">${esc(t)}</div><div class="btns"><button class="pri" id="ok">Continue</button></div>`,{ok:next});
function runQ(q,done){
  if(S&&!S.over&&!humans().length)return gameOver();
  if(!q.length){save();return done()}
  const x=q.shift();
  if(x&&x.tomb)tomb(x.tomb,()=>runQ(q,done));else say(x,()=>runQ(q,done));
}
const partyHTML=()=>`<div class="party">${S.party.map(m=>`<div class="mem ${m.alive?'':'dead'}"><div><span class="nm">${esc(m.n)}</span> <span class="small">${esc(m.l)}</span></div>${m.alive?`<div class="bar"><i data-hp="${Math.round(m.hp)}" class="${m.hp<30?'hp-bad':m.hp<60?'hp-mid':'hp-good'}"></i></div><div class="small">${m.sick?esc(m.sick.d):m.ride?'riding in the wagon':'health '+hpWord(m.hp)}</div>`:`<div class="small">rests on the trail</div>`}</div>`).join('')}</div>`;

function setup(){
  stopGo();mode='idle';S=null;const sv=load();
  screen(`<div class="msg">The year is 1862. Haddam and Katrina, your great great great great grandparents, sailed from Liverpool, rounded Cape Horn, and have just stepped off a clipper ship in San Francisco with Mabel the terrier, Twig the cat, and Gigi, a blanket that seems to be alive. They are bound for Millcreek in the Salt Lake Valley, 1,345 miles away by the southern route through Utah Territory.
If they don't make it, neither do you.</div>
  <div class="grid mt10">${DEF.map((d,i)=>`<label><span class="small">${d.l}, ancestor of ${d.now}</span><input id="n${i}" value="${esc(d.n)}" maxlength="14"></label>`).join('')}</div>
  <div class="grid mt8"><label><span class="small">Occupation</span><select id="prof">${Object.entries(PROF).map(([k,v])=>`<option value="${k}">${v.n}, $${v.cash}</option>`).join('')}</select></label>
  <label><span class="small">Leave in</span><select id="mon">${[2,3,4,5,6].map(i=>`<option value="${i}"${i===3?' selected':''}>${MON[i]}</option>`).join('')}</select></label>
  <label><span class="small">Mode</span><select id="mode"><option value="classic">Classic: travelers can die</option><option value="gentle">Gentle: worn out travelers ride in the wagon</option></select></label></div>
  <p class="small">Bankers start rich. Farmers start poor but score triple. Leave too late and the Mojave will bake you. Leave too early and the Utah passes are still full of snow.</p>
  <div class="btns"><button class="pri" id="go">Start the journey</button>${sv&&!sv.over?'<button id="cont">Continue saved trip</button>':''}<button id="hof">Hall of fame</button></div>`,
  {go:()=>{const pr=$('#prof').value;S={party:DEF.map((d,i)=>({n:$('#n'+i).value.trim()||d.n,kind:d.k,l:d.l,hp:100,sick:null,alive:true,ride:false})),prof:pr,cash:PROF[pr].cash,mode:$('#mode').value,t:Date.UTC(1862,+$('#mon').value,1),miles:0,li:0,forts:0,oxen:0,food:0,clothes:0,bullets:0,wheel:0,axle:0,tongue:0,pace:0,rat:0,log:[],weather:'clear',over:false,pend:null};
    say(`Before leaving, ${S.party[0].n} should stock up at a San Francisco outfitter before heading inland. You have $${S.cash.toFixed(2)}.`,()=>store(true))},
   cont:()=>{S=sv;resume()},hof:showHof});
}
// A trip saved while the wagon was rolling comes back stopped (the clock that moved it didn't survive the reload).
function resume(){S.going=false;if(S.pend==='river')river();else menu()}
function have(k){return k==='food'?Math.round(S.food)+' lbs':S[k]}
function store(first){
  mode='idle';const f=1+.15*S.forts,cart={};ITEMS.forEach(i=>cart[i.k]=0);
  const render=()=>{const total=ITEMS.reduce((s,i)=>s+cart[i.k]*i.p*f,0);
    screen(`<div class="msg">${esc(LM[S.li].n)} store. You have <b>$${S.cash.toFixed(2)}</b>.</div>${first?'<p class="small">Suggested: 3 or 4 yokes of oxen, at least 500 lbs of food, 2 sets of clothes per person, a few boxes of bullets, and a spare of each wagon part.</p>':''}
    ${ITEMS.map(i=>`<div class="row"><span>${i.n} <span class="small">$${(i.p*f).toFixed(2)} per ${i.u}, have ${have(i.k)}</span></span><span class="qty"><button data-m="${i.k}" aria-label="Fewer ${i.n}">&minus;</button><span class="num">${cart[i.k]}</span><button data-p="${i.k}" aria-label="More ${i.n}">+</button></span></div>`).join('')}
    <div class="row"><span>Total</span><b class="num ${total>S.cash?'over':'ok'}">$${total.toFixed(2)}</b></div>
    <div class="btns"><button class="pri" id="buy"${total>S.cash||!total?' disabled':''}>Buy</button><button id="lv">${first?'Hit the trail':'Leave the store'}</button></div>`,
    {any:b=>{const k=b.dataset.p||b.dataset.m;if(!k)return;cart[k]=Math.max(0,cart[k]+(b.dataset.p?1:-1));render();P.querySelector(`[data-${b.dataset.p?'p':'m'}="${k}"]`).focus()},
     buy:()=>{ITEMS.forEach(i=>{S[i.k]+=cart[i.k]*i.per;cart[i.k]=0});S.cash=Math.max(0,S.cash-total);save();render()},
     lv:()=>{if(first&&S.oxen<1)return say('You cannot pull a wagon without oxen. Buy at least one yoke.',render);save();menu()}})};
  render();
}
function menu(){
  if(S.over)return;
  const n=nextLM(),L=LM[S.li],atFort=L.t==='fort'&&S.miles===L.m;
  mode=S.going?'going':'menu';
  screen(`<div class="grid">
  <div>Date: <b>${dateStr()}</b></div><div>Weather: <b>${S.weather}</b></div>
  <div>Food: <b>${Math.round(S.food)} lbs</b></div><div>Oxen: <b>${S.oxen}</b></div>
  <div>Traveled: <b>${Math.round(S.miles)} mi</b></div><div>Next: <b>${esc(n.n)}, ${Math.round(n.m-S.miles)} mi</b></div>
  <div>Pace: <b>${PACE[S.pace][0]}</b></div><div>Rations: <b>${RAT[S.rat][0]}</b></div></div>
  ${partyHTML()}
  <div class="btns">${S.going?'<button class="pri" id="stop">Stop and size up the situation</button>':`<button class="pri" id="go">Continue on the trail</button>${atFort?'<button id="buy">Buy supplies</button><button id="talk">Talk to people</button>':''}<button id="sup">Supplies</button><button id="pace">Pace</button><button id="rat">Rations</button><button id="rest">Rest</button><button id="hunt">Hunt</button><button id="trade">Trade</button><button id="quit">Quit</button>`}</div>
  <div class="log">${S.log.slice(-8).reverse().map(esc).join('<br>')}</div>`,
  {go:startGo,stop:()=>{stopGo();menu()},buy:()=>store(false),talk,sup:supplies,pace:()=>choose('pace',PACE),rat:()=>choose('rat',RAT),rest,hunt:startHunt,trade,quit:()=>screen('<div class="msg">Quit this trip? It stays saved so you can come back to it.</div><div class="btns"><button class="pri" id="y">Back to the start screen</button><button id="n">Keep playing</button></div>',{y:setup,n:menu})});
}
function choose(key,opts){screen(`<div class="msg">Choose ${key==='pace'?'a pace':'rations'}:</div>${opts.map((o,i)=>`<div class="row"><span>${o[0]} <span class="small">${o[2]}</span></span><button id="o${i}"${S[key]===i?' class="pri"':''}>${S[key]===i?'Current':'Pick'}</button></div>`).join('')}<div class="btns"><button id="back">Back</button></div>`,{any:b=>{if(b.id[0]==='o'){S[key]=+b.id.slice(1);save();menu()}},back:menu})}
function supplies(){screen(`<div class="msg">Your supplies</div>${ITEMS.map(i=>`<div class="row"><span>${i.n}</span><span class="num">${have(i.k)}</span></div>`).join('')}<div class="row"><span>Money</span><span class="num">$${S.cash.toFixed(2)}</span></div><div class="btns"><button class="pri" id="back">Back</button></div>`,{back:menu})}
function talk(){const d=who('dog'),c=who('cat'),b=who('blanket');say(pick(['A freighter says: carry extra water across the Mojave, and travel it in spring if you can.','A settler says: ford only where the water is under 3 feet. The Sevier looks lazy but it is deeper than it looks.','A woman at the store says: the Wasatch gets snow by October. Do not dawdle.','A miner says: grueling pace gets you there sooner, if it does not get you first.','A boy asks if '+(b?b.n:'your blanket')+' is haunted. You decline to answer.',(d?d.n+' makes friends with the town dogs.':'The town dogs bark at the wagon.')+' Everyone seems to know the way to the Salt Lake Valley but you.','A hunter says: elk make the best hunting, but you can only carry 100 lbs back to the wagon.',(c?c.n+' inspects the town and is not impressed.':'A traveler says Mount Nebo means the valley is close.'),'Someone hears '+(S.party[0].alive?S.party[0].n:'your family')+"'s accent and asks for news from England. You tell them everything you can remember."]),menu)}

let qGo=[];
function startGo(){if(S.oxen<1)return say('You have no oxen to pull the wagon. Try trading for some.',menu);S.going=true;menu();timer=setInterval(tick,520)}
function stopGo(){if(timer)clearInterval(timer);timer=null;if(S)S.going=false}
function tick(){const q=[],arrived=day(true,q);save();if(q.length||arrived){stopGo();runQ(q,()=>arrived?arrive():menu())}else menu()}
function day(travel,q,resting){
  S.t+=864e5;
  const mo=month(),ter=terrain();
  const cold=[11,0,1,2].includes(mo)||(ter==='mountains'&&[3,9,10].includes(mo));
  const hot=(['desert','redrock'].includes(ter)&&[5,6,7,8].includes(mo))||([6,7].includes(mo)&&ter!=='mountains');
  S.weather=cold?(ch(.35)?'snow':pick(['cold','cold','cloudy'])):hot?pick(['hot','hot','clear']):ch(mo<6?.25:.12)?'rain':pick(['clear','clear','cloudy','warm']);
  const Hn=humans().length,dog=who('dog'),cat=who('cat'),bb=who('blanket');
  const need=Hn*RAT[S.rat][1]+(dog?1:0)+(cat?.5:0);
  const starving=S.food<need;
  if(starving&&S.food>0)q.push('You have run out of food!');
  S.food=Math.max(0,S.food-need);
  const chilly=(S.weather==='snow'||S.weather==='cold')&&S.clothes<Hn*2;
  for(const m of alive()){
    let d=0;
    if(m.kind!=='blanket'){d+=[1,-.5,-2][S.rat];if(starving)d-=6;if(S.weather==='hot')d-=ter==='desert'?2:.5}
    if(travel)d-=[0,1.5,3.5][S.pace];
    if(chilly)d-=(bb&&m!==bb)?1.5:3;
    if(resting)d+=4;
    if(m.sick){d-=m.sick.sev;if(ch(resting?.3:.12)){q.push(`${m.n} is feeling better.`);m.sick=null}}
    else if(ch(.02+(S.rat===2?.015:0)+(S.pace===2?.015:0)+(m.hp<40?.02:0)+(starving?.03:0))){m.sick={d:pick(DIS[m.kind]),sev:RI(2,4)};q.push(`${m.n} has ${m.sick.d}.`)}
    m.hp=clamp(m.hp+d,0,100);
    if(m.ride&&m.hp>50){m.ride=false;q.push(`${m.n} is well enough to walk again.`)}
    if(m.hp<=0)down(m,q,m.sick?m.sick.d:starving?'starvation':'exhaustion');
  }
  if(!travel)return false;
  const n=nextLM(),liv=alive(),avg=liv.reduce((s,m)=>s+m.hp,0)/Math.max(1,liv.length),riders=liv.filter(m=>m.ride).length;
  let mi=SPD[ter]*PACE[S.pace][1]*(.4+.6*Math.min(1,S.oxen/6))*(.7+.3*avg/100)*(1-.08*riders);
  if(S.weather==='snow')mi*=.5;if(S.weather==='rain')mi*=.85;if(S.oxen<1)mi=0;
  S.miles+=mi;
  if(ch(.13))event(q);
  S.miles=Math.min(n.m,S.miles);
  return S.miles>=n.m;
}
function down(m,q,cause){
  if(S.mode==='gentle'){m.hp=12;m.sick=null;if(!m.ride){m.ride=true;q.push(`${m.n} is worn out and climbs into the wagon to ride for a while.`)}return}
  m.alive=false;m.cause=cause;S.log.push(`${dateStr()}: ${deathLine(m)}`);q.push({tomb:m});
}
const deathLine=m=>({human:`${m.n} has died of ${m.cause}.`,dog:`${m.n} has gone to the great dog park in the sky.`,cat:`${m.n} has used up the ninth life.`,blanket:`${m.n} has unraveled for good.`})[m.kind];
function lose(d,q){for(let i=0;i<d;i++)day(false,q)}
const EV=[
  q=>{const p=pick(['wheel','axle','tongue']);if(S[p]>0){S[p]--;return `A wagon ${p} broke. You replaced it with your spare.`}const d=RI(2,4);lose(d,q);return `A wagon ${p} broke and you have no spare. ${S.party[0].alive?S.party[0].n:'Someone'} rigs a fix out of cottonwood. Lost ${d} days.`},
  ()=>{if(S.oxen<2)return null;S.oxen--;return 'One of the oxen wandered off in the night.'},
  ()=>{const f=Math.min(Math.round(S.food),RI(20,60));if(!f)return null;S.food-=f;return `A thief came in the night and took ${f} lbs of food.`},
  ()=>{const f=RI(10,30);S.food+=f;return `You found wild berries. Added ${f} lbs of food.`},
  ()=>{alive().forEach(m=>{if(m.kind!=='blanket')m.hp=clamp(m.hp-8,1,100)});return 'Bad water. Everyone feels a little queasy.'},
  q=>{const d=RI(1,3);lose(d,q);return `You lost the trail. Lost ${d} day${d>1?'s':''}.`},
  ()=>{if(!S.clothes)return null;S.clothes--;return 'A hailstorm shredded a set of clothes left drying on the wagon.'},
  ()=>{const m=pick(humans());if(!m)return null;m.hp=clamp(m.hp-20,1,100);return `${m.n} was bitten by a snake.`},
  ()=>{const d=who('dog');if(!d)return null;const f=RI(20,50),b=RI(10,30);S.food+=f;S.bullets+=b;let s=`${d.n} sniffed out an abandoned wagon. You found ${f} lbs of food and ${b} bullets`;if(ch(.4)){const p=pick(['wheel','axle','tongue']);S[p]++;s+=` and a spare ${p}`}return s+'.'},
  ()=>{const d=who('dog');if(!d)return null;const m=pick(humans());if(!m)return null;m.hp=clamp(m.hp-3,1,100);return `${d.n} came back with a beard full of burrs. ${m.n} spent the evening picking them out.`},
  q=>{const d=who('dog');if(!d)return null;if(ch(.6)){S.food+=6;return `${d.n} chased down a jackrabbit. Added 6 lbs of food. Good dog.`}lose(1,q);return `${d.n} chased a jackrabbit over the horizon. Lost a day looking.`},
  q=>{const c=who('cat');if(!c)return null;return pick([()=>{const f=Math.min(Math.round(S.food),10);S.food-=f;return `${c.n} slept in the flour barrel. ${f} lbs of food ruined.`},()=>`${c.n} caught a mouse in the food barrel and saved the biscuits.`,()=>{lose(1,q);return `${c.n} sat on the map and would not move. Lost a day.`},()=>`${c.n} has claimed the top of the wagon as a throne.`,()=>{const b=who('blanket');return b?`${c.n} curled up on ${b.n} for a nap. ${b.n} seems honored.`:`${c.n} found a sunny spot on the wagon seat and refuses to share it.`},()=>`${c.n} gave the oxen a long green eyed stare. They walked a little faster.`])()},
  ()=>{const b=who('blanket');if(!b)return null;return pick([()=>{alive().forEach(m=>m.hp=clamp(m.hp+10,0,100));return `${b.n} wrapped everyone up on a freezing night. The whole party feels better.`},()=>{S.miles+=10;return `${b.n} told the oxen a ghost story. They walked 10 extra miles out of fear.`},()=>{b.hp=clamp(b.hp-15,1,100);return `${b.n} got snagged on sagebrush and is sulking.`},()=>`${b.n} has been staring at the horizon. Nobody knows what a blanket thinks about.`])()},
  ()=>{const m=S.party[1];if(!m.alive)return null;S.miles+=12;return `${m.n} spotted a shortcut along the creek. Gained 12 miles.`},
  q=>{const m=S.party[0];if(!m.alive)return null;lose(1,q);return `${m.n} was sure he knew a shortcut. He did not. Lost a day.`},
  q=>{if(terrain()!=='mountains'||!['snow','cold'].includes(S.weather))return null;const d=RI(2,4);lose(d,q);return `A blizzard. Lost ${d} days.`},
  ()=>{const p=RI(5,15);S.cash+=p;return `A traveler paid you $${p} to help fix their wagon.`},
  ()=>{if(terrain()!=='desert')return null;alive().forEach(m=>{if(m.kind!=='blanket')m.hp=clamp(m.hp-6,1,100)});let s='A long dry stretch with no water. Everyone is parched.';if(S.oxen>1&&ch(.4)){S.oxen--;s+=' One of the oxen collapsed from thirst.'}return s},
  q=>{if(terrain()!=='redrock')return null;const f=Math.min(Math.round(S.food),RI(15,50));S.food-=f;lose(1,q);return `A flash flood roared down the wash. You lost ${f} lbs of food and a day getting the wagon out.`},
  ()=>{if(S.miles<850||S.cash<2)return null;S.cash-=2;S.food+=25;return 'Settlers along the trail sold you a bushel of peaches for $2. Added 25 lbs of food.'},
  ()=>{const b=who('blanket');if(!b||terrain()!=='desert')return null;b.hp=clamp(b.hp-10,1,100);return `A dust devil nearly carried ${b.n} off to Arizona. ${b.n} is rattled.`},
  ()=>{const k=S.party[1];if(!k.alive)return null;alive().forEach(m=>m.hp=clamp(m.hp+5,0,100));return `${k.n} declares it is time for tea, desert or no desert. Everyone feels a bit better.`}
];
function event(q){for(let i=0;i<6;i++){const sub=[],r=pick(EV)(sub);if(r){q.push(r);S.log.push(`${dateStr()}: ${r}`);q.push(...sub);return}}}
const FL={'Fort Tejon':'An army post guarding the pass over the Tehachapi Mountains.','Cajon Pass':'The gap between the San Gabriel and San Bernardino Mountains. Beyond it lies the Mojave Desert.','Las Vegas Springs':'Cool springs and green meadows in the middle of the desert. Las Vegas means the meadows. Nobody can imagine anyone building a city here.','St. George':'A brand new cotton mission among red cliffs and black lava. Welcome to Utah Territory.','Zion Canyon':'The Virgin River has carved a canyon of red and cream cliffs half a mile deep. Everyone stops talking for a while.','Cedar Breaks':'A giant amphitheater of orange, pink and white rock at 10,000 feet. The air is thin and cold.','Cedar City':'An iron mining town at the edge of the high plateaus.','Fillmore':'The territorial capital, with a sandstone statehouse that is only half finished.','Mount Nebo':'The tallest peak in the Wasatch Range, nearly 12,000 feet. The Salt Lake Valley is just beyond the next ridges.','Provo and Utah Lake':'The biggest freshwater lake in the territory, full of fish.'};
function arrive(){
  S.li++;const L=LM[S.li];S.miles=L.m;S.log.push(`${dateStr()}: reached ${L.n}.`);save();
  if(L.t==='river'){S.pend='river';S.rv=null;return river()}
  if(L.t==='end')return finish();
  if(L.t==='fort'){S.forts++;return say(`You have arrived at ${L.n}. ${FL[L.n]||''} You can buy supplies here.`,()=>offerSide(L.n))}
  say(`You have reached ${L.n}. ${FL[L.n]||''}`,()=>offerSide(L.n));
}
/* Side trips: three sights off the main road, each offered once from a nearby stop. A detour costs days (and the
   food and health those days take), has a payoff and a risk, and adds SIDE_PTS to the score at the end. */
const SIDE_PTS=100;
const lead=()=>S.party[0].alive?S.party[0].n:'Someone',wife=()=>S.party[1].alive?S.party[1].n:'Someone';
const SIDE={
  'St. George':{k:'hole',n:'Hole in the Rock',days:8,
    ask:()=>`A cattleman in ${LM[S.li].n} tells of a crack in the canyon rim far to the east, where the land drops a thousand feet to the Colorado River. It is a hard, dry detour of about 8 days there and back.`,
    go:q=>{const p=pick(['wheel','axle','tongue']);
      q.push(`After days of bare slickrock you reach the rim. There is a narrow crack in the cliff, barely wider than a wagon, dropping all the way down to the river. ${lead()} says someday folks will be crazy enough to lower wagons down it. ${wife()} says nobody is that crazy.\n\n(In the winter of 1879, about 250 Mormon pioneers did exactly that, widening the crack by hand and lowering 80 wagons through it.)`);
      if(S[p]>0){S[p]--;q.push(`The slickrock cracked a wagon ${p}. You used your spare.`)}else{lose(2,q);q.push(`The slickrock cracked a wagon ${p} and you have no spare. Lost 2 more days fixing it.`)}
      alive().forEach(m=>{if(m.kind!=='blanket')m.hp=clamp(m.hp-6,1,100)});q.push('There is almost no water out here. Everyone is parched.')}},
  'Cedar Breaks':{k:'bryce',n:'Bryce Canyon',days:3,
    ask:()=>`A shepherd says that a day or so east of here there is a canyon full of orange stone spires, like a city made of rock. It is a detour of about 3 days.`,
    go:q=>{const c=who('cat'),b=who('blanket'),f=RI(15,30);
      q.push(`The ground just ends, and below it are thousands of orange, pink and white stone spires called hoodoos.${c?` ${c.n} refuses to believe it.`:''} Everyone stands at the rim for a long time.`);
      alive().forEach(m=>m.hp=clamp(m.hp+10,0,100));S.food+=f;q.push(`Everyone feels better. You gathered ${f} lbs of pine nuts.`);
      if([9,10,11,0,1,2,3].includes(month())){if(b){q.push(`It is freezing at the rim at night. ${b.n} wraps everyone up.`)}else{alive().forEach(m=>m.hp=clamp(m.hp-8,1,100));q.push('It is freezing at the rim at night. Everyone shivers until morning.')}}
      q.push('(A settler named Ebenezer Bryce will move here in 1875. He will call it "a hell of a place to lose a cow.")')}},
  'Fillmore':{k:'swell',n:'San Rafael Swell',days:6,
    ask:()=>`A trapper in Fillmore tells of a giant wall of tilted rock to the east, with pictures painted on the canyon walls by people who lived there long, long ago. It is a detour of about 6 days.`,
    go:q=>{const d=who('dog');
      q.push(`The San Rafael Swell rises out of the desert like a giant rock wave, tipped on its side. In a narrow canyon you find painted figures on the walls, hundreds of years old. ${lead()} says we should leave them exactly as we found them. Everyone agrees.`);
      if(d){S.food+=RI(10,25);alive().forEach(m=>m.hp=clamp(m.hp+5,0,100));q.push(`${d.n} sniffed out a hidden spring and a jackrabbit. Cold water and dinner for everyone.`)}
      if(ch(.3)){const f=Math.min(Math.round(S.food),RI(20,60));S.food-=f;lose(1,q);q.push(`A flash flood roared down the canyon. You lost ${f} lbs of food and a day hauling the wagon to high ground.`)}}}
};
function offerSide(name){
  const x=SIDE[name];S.sights=S.sights||[];
  if(!x||S.sights.includes(x.k)||S.over)return menu();
  mode='idle';
  screen(`<div class="msg">${esc(x.n)}?\n${esc(x.ask())}</div><p class="small">Side trips cost days and food, but every one you see adds ${SIDE_PTS} points at the end.</p><div class="btns"><button class="pri" id="see">Take the detour</button><button id="skip">Stay on the trail</button></div>`,
  {see:()=>{S.sights.push(x.k);S.seen=(S.seen||[]).concat(x.k);S.sightNow=x.k;const q=[];lose(x.days,q);mode='sight';x.go(q);q.unshift(`You spend ${x.days} days on the detour to ${x.n}.`);S.log.push(`${dateStr()}: saw ${x.n}.`);runQ(q,()=>{S.sightNow=null;mode='menu';menu()})},
   skip:()=>{S.sights.push(x.k);S.log.push(`${dateStr()}: skipped ${x.n}.`);save();menu()}});
}
function river(){
  mode='idle';const L=LM[S.li];
  if(!S.rv)S.rv={w:RI(60,600),dp:+(R(L.dp[0],L.dp[1])+(month()<6?R(0,1.5):0)).toFixed(1)};save();
  const r=S.rv;
  screen(`<div class="msg">${esc(L.n)}\nThe river is ${r.w} feet across and ${r.dp} feet deep. What will you do?</div><div class="btns"><button id="ford">Ford the river</button><button id="caulk">Caulk the wagon and float</button>${L.ferry?`<button id="ferry">Take the ferry, $${L.ferry}</button>`:''}<button id="wait">Wait a day</button></div><p class="small">Fording is safest under 2.5 feet. Floating needs at least 2 feet of water.</p>${partyHTML()}`,
  {ford:()=>{const q=[];if(r.dp<2.5)q.push('You forded the river safely.');else if(r.dp<3.5){lose(1,q);q.unshift('You made it across, but the supplies got wet. Lost a day drying out.')}else tip(q,.12);cross(q)},
   caulk:()=>{const q=[];if(r.dp<2){lose(1,q);q.unshift('Too shallow. The wagon stuck in the mud and you had to dig it out. Lost a day.')}else if(ch(.8))q.push('You floated across safely.');else tip(q,.08);cross(q)},
   ferry:()=>{if(!L.ferry)return river();if(S.cash<L.ferry)return say('You cannot afford the ferry.',river);S.cash-=L.ferry;const q=[],d=RI(1,2);lose(d,q);q.unshift(`You waited ${d} day${d>1?'s':''} for the ferry, which carried you across safely.`);cross(q)},
   wait:()=>{const q=[];day(false,q,true);r.dp=+clamp(r.dp+R(-.6,.4),1,10).toFixed(1);runQ(q,river)}});
}
function tip(q,p){
  const f=Math.min(Math.round(S.food),RI(30,120)),b=Math.min(S.bullets,RI(20,100)),c=Math.min(S.clothes,RI(0,2));
  S.food-=f;S.bullets-=b;S.clothes-=c;let s=`The wagon tipped over in the current. You lost ${f} lbs of food, ${b} bullets and ${c} sets of clothes`;
  if(S.oxen>1&&ch(.3)){S.oxen--;s+=', and one ox was swept away'}q.push(s+'.');
  const bb=who('blanket');if(bb)q.push(`${bb.n} floated the whole way across, looking pleased.`);
  const cand=alive().filter(m=>m.kind!=='blanket');
  if(ch(p)&&cand.length){const m=pick(cand);if(S.mode==='gentle'){m.hp=clamp(m.hp-25,1,100);q.push(`${m.n} was swept downstream and pulled out, soaked and miserable.`)}else down(m,q,'drowning')}
}
function cross(q){S.pend=null;S.rv=null;runQ(q,menu)}
function finish(){
  S.over=true;stopGo();mode='end';
  const liv=alive(),pts=liv.reduce((s,m)=>s+(m.kind==='human'?{good:500,fair:400,poor:300,'very poor':200}[hpWord(m.hp)]:250),0);
  const seen=(S.seen||[]).length;
  const raw=pts+50+seen*SIDE_PTS+S.oxen*4+(S.wheel+S.axle+S.tongue)*2+S.clothes*2+Math.floor(S.bullets/50)+Math.floor(S.food/25)+Math.floor(S.cash/5),score=raw*PROF[S.prof].mult;
  let hof=ARCADE.get('hof');if(!Array.isArray(hof))hof=[];
  hof.push({n:S.party[0].n,s:score,d:dateStr()});hof.sort((a,b)=>b.s-a.s);hof=hof.slice(0,10);
  ARCADE.set('hof',hof);record(score,liv);save();
  screen(`<div class="msg">Congratulations! You made it to Millcreek on ${dateStr()}.\n${liv.map(m=>esc(m.n)).join(', ')} made it to the Salt Lake Valley.</div><div class="msg epi">${esc(epilogue())}</div>
  ${seen?`<div class="row"><span>Side trips seen: ${seen}</span><span class="num">+${seen*SIDE_PTS}</span></div>`:''}<div class="row"><span>Party and supplies${seen?' and sights':''}</span><span class="num">${raw}</span></div><div class="row"><span>${PROF[S.prof].n} bonus</span><span class="num">x${PROF[S.prof].mult}</span></div><div class="row"><span>Final score</span><b class="num">${score}</b></div>
  <div class="btns"><button class="pri" id="again">Play again</button><button id="hof">Hall of fame</button></div>`,{again:setup,hof:showHof});
}
// The best finish for the family scoreboard: more stars first, then the higher score.
function record(score,liv){
  const stars=liv.length===S.party.length?3:liv.filter(m=>m.kind==='human').length===2?2:1;
  const name=ARCADE.player||S.party[0].n,all=ARCADE.get('records')||{},mine=all[name]||{},was=mine.trip;
  if(!was||stars>was.stars||(stars===was.stars&&score>was.score))mine.trip={stars,score};
  all[name]=mine;ARCADE.set('records',all);
}
function epilogue(){
  const hs=S.party.filter(m=>m.kind==='human'),liv=hs.filter(m=>m.alive),gone=S.party.filter(m=>!m.alive);
  let t=liv.length===2?`${liv[0].n} and ${liv[1].n} built a little farm along Mill Creek at the foot of the Wasatch and raised a big family.`:`${liv[0].n} built a little farm along Mill Creek and raised a family, telling the children about Cape Horn and the trail every winter.`;
  if(gone.length)t+=` ${gone.map(m=>m.n).join(' and ')} never saw the Salt Lake Valley, but the family never forgot ${gone.length>1?'them':gone[0].kind==='human'?(gone[0]===hs[0]?'him':'her'):'them'}.`;
  return t+`\n\nSix generations later, their descendants Adam, Kristina and Maddy still live in Millcreek, with a Welsh terrier named Maple, a gray cat named Fig, and a blanket called BB that has never fully explained itself. Some things run in families.`;
}
function gameOver(){
  S.over=true;stopGo();save();mode='menu';
  const pets=alive().map(m=>m.n);
  screen(`<div class="msg">Everyone who could drive the wagon is gone.${pets.length?`\n${pets.join(', ')} settle down beside the trail and wait for the next wagon train.`:''}\nThe family line ends here, which is a real problem for a certain family in Millcreek, Utah.</div><div class="btns"><button class="pri" id="again">Try again, the future depends on it</button></div>`,{again:setup});
}
function showHof(){let h=ARCADE.get('hof');if(!Array.isArray(h))h=[];screen(`<div class="msg">Hall of fame</div>${h.length?h.map(x=>`<div class="row"><span>${esc(x.n)} <span class="small">${esc(x.d)}</span></span><span class="num">${x.s}</span></div>`).join(''):'<p>No one has made it to Millcreek yet.</p>'}<div class="btns"><button class="pri" id="back">Back</button></div>`,{back:S&&!S.over?menu:setup})}
function rest(){screen('<div class="msg">How many days will you rest?</div><div class="btns"><button id="r1">1 day</button><button id="r3">3 days</button><button id="r5">5 days</button><button id="back">Back</button></div>',{any:b=>{if(b.id[0]!=='r')return;const q=[];for(let i=0;i<+b.id.slice(1);i++)day(false,q,true);q.unshift(`You rested ${b.id.slice(1)} day${b.id==='r1'?'':'s'}.`);runQ(q,menu)},back:menu})}
function trade(){
  const q=[];day(false,q);
  const keys=Object.keys(VAL),gk=S.oxen<2&&ch(.6)?'oxen':pick(keys);let wk=pick(keys.filter(k=>k!==gk&&S[k]>0));
  if(!wk){q.unshift('No one wants to trade with you today.');return runQ(q,menu)}
  const wantN={food:RI(50,150),bullets:RI(40,120)}[wk]||1,giveN=Math.max(1,Math.round(wantN*VAL[wk]*R(.7,1.4)/VAL[gk]));
  runQ(q,()=>screen(`<div class="msg">A traveler offers you ${giveN} ${UNIT[gk]} for ${wantN} ${UNIT[wk]}.\nYou have ${have(wk)} ${wk==='food'?'':UNIT[wk]}.</div><div class="btns"><button class="pri" id="y"${S[wk]<wantN?' disabled':''}>Accept</button><button id="n">No thanks</button></div>`,{y:()=>{S[wk]-=wantN;S[gk]+=giveN;save();say('It is a deal.',menu)},n:menu}));
}
function tomb(m,next){
  mode='tomb';const def={human:`Here lies ${m.n}. Should have boiled the water.`,dog:`${m.n}. A good dog, start to finish.`,cat:`${m.n}. Never once came when called.`,blanket:`${m.n}. Warm to the very last thread.`}[m.kind];
  tombInfo={n:m.n,d:dateStr()};
  screen(`<div class="msg">${esc(deathLine(m))}</div><label class="mt10"><span class="small">Write an epitaph</span><input id="epi" maxlength="60" value="${esc(def)}"></label><div class="btns"><button class="pri" id="ok">Continue</button></div>`,{ok:()=>{m.epi=$('#epi').value;S.log.push(`Epitaph for ${m.n}: ${m.epi}`);mode=S.going?'going':'menu';next()}});
}
const AN={rabbit:{w:10,h:7,lb:3,sp:70,c:'#a08a70'},squirrel:{w:7,h:6,lb:1,sp:85,c:'#8a6a4a'},deer:{w:22,h:16,lb:60,sp:55,c:'#9a6a3a'},elk:{w:30,h:22,lb:250,sp:34,c:'#8a5a32'},bear:{w:26,h:18,lb:120,sp:38,c:'#2a1e16'}};
function startHunt(){
  if(S.bullets<1)return say('You do not have any bullets.',menu);
  const q=[];day(false,q);hunt={an:[],t:30,meat:0,spawn:.3,flash:0,q};mode='hunt';
  screen(`<div class="msg">Tap an animal to shoot. Each shot uses one bullet. You can carry 100 lbs back to the wagon.</div><div id="hh" class="small"></div><div class="btns"><button id="hs">Stop hunting</button></div>`,{hs:endHunt});
}
function endHunt(){if(mode!=='hunt')return;mode='menu';const m=hunt.meat,c=Math.min(100,m);S.food+=c;const q=hunt.q;q.push(m?`You shot ${m} lbs of meat${m>100?', but could only carry 100 lbs back to the wagon':''}.`:'You came back empty handed.');runQ(q,menu)}
cv.addEventListener('pointerdown',e=>{
  if(mode!=='hunt'||S.bullets<1)return;
  const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*320/r.width,y=(e.clientY-r.top)*150/r.height;
  S.bullets--;hunt.flash=.12;hunt.sx=x;hunt.sy=y;
  const a=hunt.an.find(a=>!a.dead&&x>a.x-7&&x<a.x+AN[a.k].w+7&&y>a.y-7&&y<a.y+AN[a.k].h+7);
  if(a){a.dead=true;hunt.meat+=AN[a.k].lb}
  if(S.bullets<1)setTimeout(endHunt,400);
});

/* drawing */
const W=320,HH=150;
const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
function sky(w){const c={clear:['#4f9fdc','#bfe3f5'],warm:['#4f9fdc','#f3dca0'],hot:['#5aa8dc','#f7cf72'],cloudy:['#8596a6','#c8d0d6'],rain:['#5a6773','#98a3ad'],cold:['#93b2c8','#dfe9ef'],snow:['#aebbc4','#eef2f4']}[w]||['#4f9fdc','#bfe3f5'];const gr=g.createLinearGradient(0,0,0,100);gr.addColorStop(0,c[0]);gr.addColorStop(1,c[1]);g.fillStyle=gr;g.fillRect(0,0,W,HH);
  if(['clear','warm','hot'].includes(w)){g.fillStyle='#fff3c4';g.beginPath();g.arc(262,26,11,0,7);g.fill()}
  if(['cloudy','rain','snow','cold'].includes(w))for(let i=0;i<4;i++){const x=((i*97-off*.05)%380+380)%380-40;rect(x,14+i*7,44,7,'rgba(255,255,255,.7)');rect(x+8,9+i*7,26,6,'rgba(255,255,255,.7)')}}
function far(ter){
  const s=off*.15;
  if(ter==='mountains'){for(let i=-1;i<5;i++){const x=i*90-(s%90);g.fillStyle='#6f7f95';g.beginPath();g.moveTo(x,100);g.lineTo(x+45,38+(i&1)*10);g.lineTo(x+90,100);g.fill();g.fillStyle='#eef3f7';g.beginPath();g.moveTo(x+45,38+(i&1)*10);g.lineTo(x+34,52+(i&1)*10);g.lineTo(x+56,52+(i&1)*10);g.fill()}}
  else if(ter==='desert'){for(let i=-1;i<4;i++){const x=i*120-(s%120);rect(x+20,74,50,26,'#c07a4a');rect(x+28,68,34,6,'#c07a4a');rect(x+20,74,50,3,'#d89060')}}
  else if(ter==='redrock'){for(let i=-1;i<4;i++){const x=i*110-(s%110);rect(x,52,70,48,'#b8502a');rect(x,52,70,10,'#e8d8b8');rect(x,70,70,3,'#d07040');rect(x+70,74,30,26,'#c86838');rect(x+8,40,30,12,'#c86838')}}
  else if(ter==='forest'){for(let i=-1;i<22;i++){const x=i*16-(s%16);g.fillStyle='#2f5a34';g.beginPath();g.moveTo(x,100);g.lineTo(x+8,66+(i%3)*6);g.lineTo(x+16,100);g.fill()}}
  else{g.fillStyle=ter==='hills'?'#7f9a5a':'#93a86a';g.beginPath();g.moveTo(0,100);for(let x=0;x<=W;x+=4)g.lineTo(x,(ter==='hills'?84:92)-Math.sin((x+s)/(ter==='hills'?30:55))*(ter==='hills'?9:3));g.lineTo(W,100);g.fill()}
}
function ground(ter){const c={redrock:['#c87a4a','#b0683c'],plains:['#a8b85a','#94a44c'],hills:['#9aa850','#8a9444'],mountains:['#7f8f5c','#6f7f50'],desert:['#d4b483','#c4a473'],forest:['#5e8a46','#4f7a3c']}[ter];rect(0,100,W,50,c[0]);rect(0,116,W,12,'#c8a26a');for(let i=0;i<24;i++){const x=((i*29-off)%W+W)%W;rect(x,104+(i*7)%10,2,3,c[1]);rect(x+12,132+(i*5)%14,3,2,c[1])}}
function landmark(){
  if(!S)return;const n=nextLM(),L=LM[S.li];let dist,t,nm;
  if(n&&n.m-S.miles<60){dist=n.m-S.miles;t=n.t;nm=n.n}else if(S.miles-L.m<1&&S.li>0){dist=0;t=L.t;nm=L.n}else return;
  const x=212+dist*2.2;if(x>W+20)return;
  if(t==='river'){g.fillStyle='#3d7fc0';g.beginPath();g.moveTo(x,100);g.lineTo(x+30,100);g.lineTo(x+46,150);g.lineTo(x+10,150);g.fill();rect(x+8,112,8,1,'#9cd0f5');rect(x+20,130,10,1,'#9cd0f5')}
  else if(t==='fort'){rect(x,78,60,26,'#7a5232');for(let i=0;i<60;i+=5)rect(x+i,74,4,4,'#7a5232');rect(x-4,70,10,34,'#6a4428');rect(x+54,70,10,34,'#6a4428');rect(x+24,88,12,16,'#3a2414');rect(x+29,54,1,16,'#333');rect(x+30,54,10,6,'#c83a2a')}
  else if(t==='end'){for(let i=0;i<3;i++){rect(x+i*26,84,20,18,'#b07a4a');g.fillStyle='#7a3a2a';g.beginPath();g.moveTo(x+i*26-2,84);g.lineTo(x+i*26+10,74);g.lineTo(x+i*26+22,84);g.fill();rect(x+i*26+8,94,5,8,'#3a2414')}}
  else if(nm==='Zion Canyon'){rect(x,30,26,74,'#b8502a');rect(x,30,26,16,'#ecdcc0');rect(x+40,40,30,64,'#c86034');rect(x+40,40,30,12,'#ecdcc0');rect(x+26,96,14,8,'#3d7fc0')}
  else if(nm==='Mount Nebo'){g.fillStyle='#6f7f95';g.beginPath();g.moveTo(x-10,104);g.lineTo(x+30,24);g.lineTo(x+70,104);g.fill();g.fillStyle='#f4f7fa';g.beginPath();g.moveTo(x+30,24);g.lineTo(x+18,48);g.lineTo(x+42,48);g.fill()}
  else if(nm==='Cedar Breaks'){g.fillStyle='#e0884a';g.beginPath();g.ellipse(x+30,104,36,30,0,Math.PI,0);g.fill();for(let k=0;k<5;k++)rect(x+4+k*12,82,6,22,k%2?'#f0c0a0':'#c8603a')}
  else{g.fillStyle='#9a7a5a';g.beginPath();g.ellipse(x+30,100,32,18,0,Math.PI,0);g.fill();rect(x+14,90,30,2,'#b89878')}
}
function wheel(x,y,r,a){g.strokeStyle='#3a2414';g.lineWidth=2;g.beginPath();g.arc(x,y,r,0,7);g.stroke();g.lineWidth=1;for(let i=0;i<4;i++){const t=a+i*Math.PI/4;g.beginPath();g.moveTo(x-Math.cos(t)*r,y-Math.sin(t)*r);g.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r);g.stroke()}}
function party(){
  const mv=S&&S.going,b=mv?Math.abs(Math.sin(off*.25)):0,st=mv?Math.sin(off*.4):0,P0=S?S.party:DEF.map(()=>({alive:true}));
  // oxen
  for(let i=0;i<2;i++){const x=214+i*24;rect(x,100,20,10,'#6b4226');rect(x+18,97,7,7,'#5a361e');rect(x+19,95,2,2,'#e8dcc0');rect(x+2,110,2,6+st*2,'#4a2c18');rect(x+15,110,2,6-st*2,'#4a2c18')}
  rect(196,108,20,1,'#4a2c18');
  // wagon
  rect(140,104,56,12,'#7a4a26');rect(140,104,56,2,'#9a6a3a');
  g.fillStyle='#f2ead8';g.beginPath();g.moveTo(140,104);g.quadraticCurveTo(142,80,152,78);g.lineTo(186,78);g.quadraticCurveTo(196,80,196,104);g.fill();
  rect(158,79,1,25,'#d8ccb4');rect(172,79,1,25,'#d8ccb4');
  wheel(152,119,9,off/9);wheel(186,120,7,off/7);
  // BB peeking out the back
  if(P0[4].alive){const bl=(Math.floor(last/2400)%8===0);rect(136,88,10,14,'#6a72c8');rect(136,88,10,2,'#8a92e0');rect(138,92,2,bl?1:2,'#fff');rect(142,92,2,bl?1:2,'#fff');rect(139,98,5,1,'#4a50a0')}
  // Fig on the roof: long haired silver tabby, green eyes, big fluffy tail
  if(P0[3].alive){const sw=Math.round(Math.sin(last/500));rect(166,72,14,6,'#b8b8c0');rect(167,72,12,2,'#8c8c96');rect(170,74,1,3,'#8c8c96');rect(174,74,1,3,'#8c8c96');rect(177,66,8,7,'#c6c6ce');rect(177,64,2,3,'#b8b8c0');rect(183,64,2,3,'#b8b8c0');rect(178,65,1,1,'#e8a8b0');rect(183,65,1,1,'#e8a8b0');rect(180,66,1,2,'#8c8c96');rect(178,68,2,1,'#8ab060');rect(182,68,2,1,'#8ab060');rect(181,70,1,1,'#d89098');rect(162+sw,75,10,4,'#c6c6ce');rect(161+sw,76,3,3,'#dcdce2')}
  // Maple trotting behind
  if(P0[2].alive){const x=110,y=Math.round(109-b*2);rect(x,y,14,7,'#c07a3a');rect(x+1,y,11,4,'#1e1812');rect(x-1,y-4,2,5,'#1e1812');rect(x+12,y-5,7,7,'#c88a48');rect(x+13,y-7,2,2,'#c88a48');rect(x+12,y-5,3,2,'#8a5a2a');rect(x+17,y-5,2,2,'#8a5a2a');rect(x+15,y-3,1,1,'#111');rect(x+16,y,4,4,'#dba86a');rect(x+19,y-1,1,2,'#111');rect(x+11,y+7,2,4+st,'#c07a3a');rect(x+1,y+7,2,4-st,'#c07a3a')}
}
function weatherFx(w){if(w==='rain'){g.fillStyle='rgba(200,220,240,.6)';for(let i=0;i<40;i++){const x=(i*37+last/6)%W,y=(i*53+last/3)%HH;g.fillRect(x,y,1,4)}}if(w==='snow'){g.fillStyle='#fff';for(let i=0;i<50;i++){const x=(i*41+Math.sin(last/900+i)*8+W)%W,y=(i*29+last/25)%HH;g.fillRect(x,y,2,2)}}}
function drawTrail(){const ter=S?terrain():'plains',w=S?S.weather:'clear';sky(w);far(ter);ground(ter);landmark();party();weatherFx(w)}
function drawTomb(){sky('cloudy');far(S?terrain():'plains');ground(S?terrain():'plains');rect(132,58,56,62,'#8a8a90');g.fillStyle='#8a8a90';g.beginPath();g.arc(160,60,28,Math.PI,0);g.fill();rect(132,58,56,2,'#a8a8ae');g.fillStyle='#2a2a30';g.textAlign='center';g.font='16px VT323, monospace';g.fillText('R.I.P.',160,62);g.font='14px VT323, monospace';g.fillText(tombInfo?tombInfo.n.slice(0,10):'',160,80);g.font='11px VT323, monospace';g.fillText(tombInfo?tombInfo.d:'',160,96);rect(124,118,72,4,'#6a5a40')}
function drawHunt(dt){
  hunt.t-=dt;if(hunt.t<=0){hunt.t=0;endHunt();return drawTrail()}
  hunt.spawn-=dt;if(hunt.spawn<=0){const k=pick(['rabbit','rabbit','squirrel','deer','deer','elk','bear']),d=ch(.5)?1:-1;hunt.an.push({k,d,x:d>0?-36:W+4,y:RI(98,138)-AN[k].h,dead:false,ph:0});hunt.spawn=R(.6,1.5)}
  sky('clear');far('plains');rect(0,100,W,50,'#b9b45a');for(let i=0;i<14;i++)rect((i*41)%W,104+(i*13)%40,3,4,'#8a8a44');
  hunt.an=hunt.an.filter(a=>a.x>-50&&a.x<W+50);
  for(const a of hunt.an){const s=AN[a.k];if(!a.dead){a.x+=a.d*s.sp*dt;a.ph+=dt*12}
    if(a.dead){rect(a.x,a.y+s.h-5,s.w,5,s.c);rect(a.x+s.w/2,a.y+s.h-7,2,2,'#c03020');continue}
    const l=Math.sin(a.ph)>0?2:0,hx=a.d>0?a.x+s.w-2:a.x-s.h*.35+2;
    rect(a.x,a.y+s.h*.25,s.w,s.h*.5,s.c);rect(hx,a.y,s.h*.4,s.h*.4,s.c);rect(a.x+2,a.y+s.h*.75,2,s.h*.25-l,s.c);rect(a.x+s.w-4,a.y+s.h*.75,2,s.h*.25-(2-l),s.c);
    if(a.k==='deer')rect(hx+1,a.y-4,1,4,'#6a4a2a');if(a.k==='elk'){rect(hx,a.y-6,1,6,'#d8c8a0');rect(hx+6,a.y-6,1,6,'#d8c8a0');rect(hx-2,a.y-5,3,1,'#d8c8a0');rect(hx+6,a.y-5,3,1,'#d8c8a0')}}
  if(hunt.flash>0){hunt.flash-=dt;rect(hunt.sx-3,hunt.sy,7,1,'#fff');rect(hunt.sx,hunt.sy-3,1,7,'#fff')}
  g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,0,W,14);g.fillStyle='#f3e6cf';g.textAlign='left';g.font='13px VT323, monospace';g.fillText(`Bullets ${S.bullets}   Meat ${hunt.meat} lbs   Time ${Math.ceil(hunt.t)}`,6,11);
}
// The side-trip sights, drawn while the detour's story is on screen.
function drawSight(k){
  if(k==='bryce'){sky('clear');rect(0,96,W,54,'#d88a52');for(let i=0;i<40;i++){const x=i*8+((i*37)%5),h=22+((i*53)%34),c=['#e07a40','#f0a878','#c85a30','#f4dcc0'][i%4];rect(x,96-h,6,h,c);rect(x-1,96-h,8,3,'#f4e6d4');rect(x+1,96-h*.55,4,2,'#f4e6d4')}rect(0,118,W,32,'#7a8a50');for(let i=0;i<14;i++){const x=i*24+6;g.fillStyle='#2f5a34';g.beginPath();g.moveTo(x,128);g.lineTo(x+7,104);g.lineTo(x+14,128);g.fill()}}
  else if(k==='swell'){sky('hot');rect(0,100,W,50,'#d4b483');g.fillStyle='#b8603a';g.beginPath();g.moveTo(0,100);g.lineTo(90,38);g.lineTo(230,52);g.lineTo(W,100);g.fill();for(let j=0;j<4;j++){g.fillStyle=['#d88a5a','#c8a070','#a85030','#e0c098'][j];g.beginPath();g.moveTo(20+j*30,100);g.lineTo(90+j*18,44+j*10);g.lineTo(104+j*18,48+j*10);g.lineTo(40+j*30,100);g.fill()}rect(150,66,60,34,'#8a3a22');for(let i=0;i<5;i++){rect(156+i*11,72,3,10,'#e8d0b0');rect(155+i*11,70,5,3,'#e8d0b0');rect(154+i*11,75,7,1,'#e8d0b0')}}
  else{sky('clear');rect(0,70,W,80,'#c87a4a');rect(0,70,W,4,'#e0a070');rect(150,70,14,80,'#4a2414');rect(152,70,10,80,'#6a3420');for(let i=0;i<6;i++)rect(i*58,86+(i%2)*14,40,2,'#a85a34');rect(0,136,W,14,'#3d7fc0');rect(0,136,W,2,'#9cd0f5');rect(120,62,16,8,'#f2ead8');rect(118,68,20,3,'#7a4a26')}
}
function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(S&&S.going)off+=dt*40;if(mode==='hunt')drawHunt(dt);else if(mode==='tomb')drawTomb();else if(mode==='sight'&&S&&S.sightNow)drawSight(S.sightNow);else drawTrail();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
setup();
