/* Дестинация 2030 — данные и модель (общие для пульта и телефонов).
   Ориентиры 2024–2026: турпоток области 2,2 млн (2024) и 2,3–2,5 млн (2025) по оценкам властей;
   потолок туристического налога 2% в 2026, 3% в 2027, 4% в 2028, 5% с 2029; экосбор косы около 300 ₽.
   Распределение по зонам, вместимость и пропускная способность — игровые оценки. */

const YEARS=[2027,2028,2029,2030];
const START_YEAR=2026;
const taxRate=y=>Math.min(5,Math.max(1,y-2024)); // потолок ставки по годам, %

const ZONES=[
 {id:'kgd', name:'Калининград',         lon:20.51,lat:54.71,D0:1100,C0:1300,K0:1600,E0:62,R0:66,S0:48,spend:28},
 {id:'zel', name:'Зеленоградск',        lon:20.48,lat:54.96,D0:520, C0:480, K0:500, E0:64,R0:55,S0:72,spend:30},
 {id:'svet',name:'Светлогорск',         lon:20.15,lat:54.94,D0:450, C0:430, K0:460, E0:68,R0:58,S0:70,spend:34},
 {id:'spit',name:'Куршская коса',       lon:20.82,lat:55.14,D0:600, C0:null,K0:620, E0:72,R0:62,S0:76,spend:3,park:true},
 {id:'west',name:'Янтарный и Балтийск', lon:19.95,lat:54.78,D0:190, C0:160, K0:330, E0:60,R0:50,S0:70,spend:26},
 {id:'east',name:'Восток: замки',       lon:21.95,lat:54.75,D0:140, C0:150, K0:450, E0:76,R0:46,S0:52,spend:22},
];
const ZONE=Object.fromEntries(ZONES.map(z=>[z.id,z]));
const ZONE_NOTE={
 kgd:'Областной центр: музеи, остров Канта, деловой туризм. Много жилья, но летом пробки.',
 zel:'Самый популярный курорт: в сезон набережная и пляжи переполнены.',
 svet:'Престижный курорт с дорогими отелями и узкими улицами.',
 spit:'Национальный парк и объект ЮНЕСКО. Дюны и лес очень уязвимы, строить здесь почти нельзя.',
 west:'Янтарный карьер, пляж «Голубой флаг», маяк Балтийска. Мало жилья.',
 east:'Орденские замки и тихие городки. Туристов мало, жители ждут развития.',
};

const ROLES=[
 {id:'gov',name:'Правительство области',short:'Правительство',icon:'🏛',color:'#f4a73b',start:1200,
  about:'Отвечаете за дороги, транспорт, налоги и правила. Вы получаете туристический налог и можете наложить вето на спорный проект (2 раза за игру).'},
 {id:'inv',name:'Инвесторы и девелоперы',short:'Инвесторы',icon:'💼',color:'#4cc9f0',start:3000,
  about:'Строите отели, апартаменты, марины и SPA. Ваш доход зависит от загрузки: пустой отель не окупается.'},
 {id:'eco',name:'Нацпарк и экологи',short:'Экологи',icon:'🌲',color:'#a5e36b',start:250,
  about:'Защищаете природу, особенно Куршскую косу. Денег мало, зато можно объявить протест: тогда проекту нужно 2/3 голосов.'},
 {id:'res',name:'Жители и малый бизнес',short:'Жители',icon:'🏡',color:'#ff8a65',start:250,
  about:'Живёте здесь круглый год. Гостевые дома и кафе приносят доход, но толпы и стройки злят. Можно объявить протест.'},
 {id:'mkt',name:'Туроператоры и маркетинг',short:'Маркетинг',icon:'📣',color:'#c6a2e0',start:500,
  about:'Приводите туристов и продаёте регион. Ваша сила — фестивали, межсезонье и новые направления.'},
];
const ROLE=Object.fromEntries(ROLES.map(r=>[r.id,r]));

/* Проекты. zones — где можно строить (выбор), fixed — сразу на несколько зон, region — на все зоны.
   eff: cap — номера (тыс. гостей в год), att — привлекательность (доля), carry — пропускная способность (доля),
        eco/res — разовое изменение индексов, season — изменение доли лета (п.п.). yield — доходность в год от стоимости. */
const NONPARK=['kgd','zel','svet','west','east'];
const COAST=['zel','svet','west'];
const PROJECTS=[
 // Правительство
 {id:'rail',role:'gov',name:'Электрички и автобусы до моря',cost:600,fixed:['zel','svet'],eff:{carry:.12,res:4,eco:2},note:'Меньше машин — больше людей без пробок.'},
 {id:'roads',role:'gov',name:'Реконструкция дорог к побережью',cost:800,fixed:['zel','svet','west'],eff:{carry:.08,att:.04,eco:-1},note:'Доехать проще, но машин станет больше.'},
 {id:'eastprog',role:'gov',name:'Программа «Восток»: дороги и указатели к замкам',cost:500,fixed:['east'],eff:{att:.25,carry:.1,res:5},note:'Разгружает побережье: часть туристов поедет на восток.'},
 {id:'promenade',role:'gov',name:'Благоустройство набережной',cost:300,zones:['kgd','zel','svet','west'],eff:{att:.06,res:4}},
 {id:'sewage',role:'gov',name:'Очистные сооружения',cost:400,zones:['kgd','zel','svet','west'],eff:{eco:8,carry:.05},note:'Чистое море — главный ресурс курорта.'},
 {id:'quota',role:'gov',name:'Лимит посещения косы (квота в день)',cost:0,fixed:['spit'],once:true,quota:true,hot:true,eff:{eco:4},note:'Не больше 90% пропускной способности. Часть туристов не попадёт на косу.'},
 {id:'seasontax',role:'gov',name:'Сниженный турналог в межсезонье',cost:0,region:true,once:true,taxMul:.85,eff:{season:-3},note:'С 2026 года муниципалитеты могут ставить разные ставки по сезонам.'},
 {id:'flights',role:'gov',name:'Субсидии на новые авиарейсы',cost:700,region:true,eff:{att:.05}},
 // Инвесторы
 {id:'hotel',role:'inv',name:'Отель 4* на 200 номеров',cost:1500,zones:['kgd','zel','svet','west'],eff:{cap:60,eco:-2,res:-2},yield:.16},
 {id:'apart',role:'inv',name:'Апарт-комплекс у моря',cost:1100,zones:COAST,eff:{cap:80,eco:-5,res:-6},yield:.19,note:'Быстрая прибыль, но растут цены на жильё для местных.'},
 {id:'glamp',role:'inv',name:'Глэмпинг',cost:250,zones:['spit','west','east'],eff:{cap:12,att:.03,eco:-3},zeff:{spit:{eco:-7}},yield:.2},
 {id:'marina',role:'inv',name:'Марина для яхт',cost:900,zones:['svet','west'],eff:{att:.08,cap:10,eco:-4,season:2},yield:.12},
 {id:'spa',role:'inv',name:'SPA и аквапарк круглый год',cost:1000,zones:['kgd','zel','svet'],eff:{att:.06,season:-6,res:1},yield:.14,note:'Работает и в ноябре, и в феврале.'},
 {id:'manor',role:'inv',name:'Отель в отреставрированной усадьбе',cost:700,fixed:['east'],eff:{cap:20,att:.15,res:4},yield:.1},
 {id:'congress',role:'inv',name:'Конгресс-центр',cost:1200,fixed:['kgd'],eff:{cap:20,att:.05,season:-5},yield:.12,note:'Деловые туристы приезжают круглый год.'},
 // Экологи
 {id:'trails',role:'eco',name:'Экотропы и настилы на дюнах',cost:80,zones:['spit','svet','zel'],eff:{carry:.15,eco:4},note:'Люди идут по настилу и не вытаптывают дюны.'},
 {id:'dunes',role:'eco',name:'Восстановление дюн',cost:60,fixed:['spit'],eff:{eco:6}},
 {id:'ecocenter',role:'eco',name:'Центр экопросвещения',cost:120,zones:['spit','zel','kgd'],eff:{att:.03,eco:2,res:2}},
 {id:'waste',role:'eco',name:'Раздельный сбор мусора на пляжах',cost:50,zones:['zel','svet','west','spit'],eff:{eco:5,res:2}},
 {id:'birds',role:'eco',name:'Закрытие троп на время гнездования',cost:30,fixed:['spit'],eff:{eco:5,att:-.03}},
 {id:'bikes',role:'eco',name:'Велодорожки вместо парковок',cost:150,zones:['spit','zel','svet'],eff:{eco:3,carry:.08,att:.03}},
 // Жители
 {id:'guest',role:'res',name:'Гостевые дома',cost:120,zones:NONPARK,eff:{cap:12,res:3},yield:.2},
 {id:'farm',role:'res',name:'Фермерский рынок и гастрофест',cost:80,zones:NONPARK,eff:{att:.04,season:-2},yield:.15},
 {id:'craft',role:'res',name:'Янтарные и ремесленные мастерские',cost:60,zones:['west','kgd','zel'],eff:{att:.03},yield:.18},
 {id:'citytour',role:'res',name:'Народная экскурсия «Мой город»',cost:40,zones:NONPARK,eff:{att:.02,res:4},yield:.1},
 {id:'protestcamp',role:'res',name:'Кампания «Город для жителей»',cost:10,zones:NONPARK,eff:{res:3,att:-.03},note:'Ограничение шума и стоянок туристических автобусов.'},
 {id:'rental',role:'res',name:'Кооператив проката велосипедов и сапов',cost:90,zones:['zel','svet','west','spit'],eff:{att:.03,eco:1},yield:.18},
 // Маркетинг
 {id:'winter',role:'mkt',name:'Кампания «Балтика зимой»',cost:150,region:true,eff:{season:-6,att:.02}},
 {id:'fest',role:'mkt',name:'Фестиваль',cost:120,zones:NONPARK,eff:{att:.08,season:-3,res:-1}},
 {id:'eastpromo',role:'mkt',name:'Продвижение востока области',cost:100,fixed:['east'],eff:{att:.2}},
 {id:'charter',role:'mkt',name:'Чартерные программы из регионов',cost:250,region:true,eff:{att:.06},note:'Больше туристов везде, в том числе там, где уже тесно.'},
 {id:'app',role:'mkt',name:'Цифровой гид: рассредоточение потоков',cost:80,region:true,once:true,digital:true,eff:{carry:.05},note:'Приложение подсказывает, куда поехать, когда в популярном месте толпа.'},
 {id:'cruise',role:'mkt',name:'Морские прогулки и паромы',cost:300,zones:['kgd','west'],eff:{att:.08}},
];
const PROJ=Object.fromEntries(PROJECTS.map(p=>[p.id,p]));
function projZones(p,zone){return p.region?ZONES.map(z=>z.id):p.fixed?p.fixed:[zone]}
function projEff(p,zid){return Object.assign({},p.eff,(p.zeff||{})[zid]||{})}
function isHot(p,zone){if(p.hot)return true;return projZones(p,zone).some(z=>{const e=projEff(p,z);return(e.eco||0)<=-4||(e.res||0)<=-4||(z==='spit'&&((e.cap||0)>0||(e.att||0)>0)&&p.role==='inv')})}
function effText(p,zone){const parts=[];const zs=projZones(p,zone);const e=projEff(p,zs[0]);
 if(e.cap)parts.push(`+${e.cap} тыс. мест`);if(e.att)parts.push(`${e.att>0?'+':''}${Math.round(e.att*100)}% спроса`);if(e.carry)parts.push(`+${Math.round(e.carry*100)}% пропускной`);
 if(e.eco)parts.push(`природа ${e.eco>0?'+':''}${e.eco}`);if(e.res)parts.push(`жители ${e.res>0?'+':''}${e.res}`);if(e.season)parts.push(`лето ${e.season>0?'+':''}${e.season} п.п.`);
 if(p.yield)parts.push(`доход ~${Math.round(p.yield*100)}% в год`);if(p.quota)parts.push('квота 90%');return parts.join(' · ')}

/* События года */
const EVENTS=[
 {id:'flight',t:'Новый авиарейс из Казани и Екатеринбурга',d:'Спрос на Калининград +8%.',kind:'good',dem:{kgd:.08}},
 {id:'storm',t:'Шторм размыл пляж в Зеленоградске',d:'Природа Зеленоградска −5, спрос −10% в этом году.',kind:'bad',dem:{zel:-.1},eco:{zel:-5}},
 {id:'fire',t:'Сухое лето: лесной пожар на косе',d:'Природа косы −8.',kind:'bad',eco:{spit:-8}},
 {id:'boom',t:'Бум внутреннего туризма',d:'Спрос во всех зонах +10%. Готовы ли вы принять столько людей?',kind:'good',dem:{all:.1}},
 {id:'tickets',t:'Подорожали авиабилеты',d:'Спрос во всех зонах −8%.',kind:'bad',dem:{all:-.08}},
 {id:'blogger',t:'Видео блогера о замках востока набрало миллионы просмотров',d:'Спрос на восток области +25%.',kind:'good',dem:{east:.25}},
 {id:'noise',t:'Жители жалуются на шум и пробки',d:'Довольство жителей в самой загруженной зоне −6.',kind:'bad',resTop:-6},
 {id:'grant',t:'Федеральный грант на развитие туризма',d:'Правительство получает +400 млн.',kind:'good',money:{gov:400}},
 {id:'build',t:'Подорожали стройматериалы',d:'Проекты в этом году дороже на 15%.',kind:'bad',costMul:1.15},
 {id:'staff',t:'Нехватка персонала в отелях',d:'Вместимость всех зон −5% в этом году.',kind:'bad',capMul:.95},
 {id:'unesco',t:'ЮНЕСКО напоминает о статусе Куршской косы',d:'Если природа косы ниже 60, рейтинг региона −0,3.',kind:'bad',unesco:true},
 {id:'ecofund',t:'Экофонд поддержал волонтёров',d:'Экологи получают +100 млн, природа всех зон +2.',kind:'good',money:{eco:100},eco:{all:2}},
];
const EVENT=Object.fromEntries(EVENTS.map(e=>[e.id,e]));

/* Секретные цели: у каждой роли два варианта, вариант выбирается случайно в начале игры */
const lin=(v,a,b)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
const GOALS={
 gov:[{id:'g1',t:'Турпоток 3 млн',d:'Довести турпоток региона до 3 млн к 2030 году и сохранить индекс жителей не ниже 60.',
       score:(R)=>Math.round(70*lin(R.last.tourists,2400,3000)+30*lin(R.last.res,45,60))},
      {id:'g2',t:'Круглый год',d:'Снизить долю лета до 52% и сохранить в бюджете минимум 2 000 млн.',
       score:(R,T)=>Math.round(60*lin(-R.last.season,-62,-52)+40*lin(T.money,500,2000))}],
 inv:[{id:'i1',t:'Доходность',d:'Заработать на объектах суммарно 2 500 млн и построить не меньше 3 объектов.',
       score:(R,T)=>Math.round(70*lin(T.earned,0,2500)+30*lin(T.assets.length,0,3))},
      {id:'i2',t:'Флагманы в трёх зонах',d:'Построить объекты в трёх разных зонах и сохранить капитал не ниже 3 000 млн.',
       score:(R,T)=>Math.round(50*lin(new Set(T.assets.map(a=>a.zone)).size,0,3)+50*lin(T.money+T.assets.reduce((s,a)=>s+a.cost,0)*.7,1500,3000))}],
 eco:[{id:'e1',t:'Живая коса',d:'Природа Куршской косы в 2030 году не ниже 75, и косу ни разу не закрывали.',
       score:(R)=>Math.round(60*lin(R.lastZ.spit.eco,40,75)+(R.spitClosedEver?0:40))},
      {id:'e2',t:'Зелёный регион',d:'Средний индекс природы не ниже 70 и минимум 3 экологических проекта.',
       score:(R,T)=>Math.round(70*lin(R.last.eco,50,70)+30*lin(T.built,0,3))}],
 res:[{id:'r1',t:'Город для жителей',d:'Средний индекс жителей не ниже 65, и ни в одной зоне не ниже 45.',
       score:(R)=>Math.round(60*lin(R.last.res,45,65)+(Math.min(...ZONES.map(z=>R.lastZ[z.id].res))>=45?40:0))},
      {id:'r2',t:'Свой бизнес',d:'Заработать на местном бизнесе 600 млн и открыть не меньше 3 проектов.',
       score:(R,T)=>Math.round(60*lin(T.earned,0,600)+40*lin(T.built,0,3))}],
 mkt:[{id:'m1',t:'Рейтинг 4,3',d:'Рейтинг дестинации 4,3 и турпоток не меньше 2,8 млн.',
       score:(R)=>Math.round(60*lin(R.last.rating,3.5,4.3)+40*lin(R.last.tourists,2400,2800))},
      {id:'m2',t:'Новые направления',d:'Довести турпоток востока до 300 тыс. и запада до 300 тыс.',
       score:(R)=>Math.round(60*lin(R.lastZ.east.served,140,300)+40*lin(R.lastZ.west.served,190,300))}],
};
const COMMON_BONUS=20,COMMON_PENALTY=30;

/* ── утилиты ── */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fN=n=>Math.round(n).toLocaleString('ru-RU');
const fM=n=>fN(n)+' млн ₽';
const fT=n=>(n/1000).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})+' млн';
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
const loadColor=l=>l>=1?'#ff6b5e':l>=.85?'#ffcf5c':'#5fd3a0';
const idxColor=v=>v<40?'#ff6b5e':v<60?'#ffcf5c':'#5fd3a0';

/* ═════ МОДЕЛЬ ═════ */
function freshWorld(){
 const zones={};ZONES.forEach(z=>zones[z.id]={cap:z.C0,att:0,carry:0,eco:z.E0,res:z.R0,season:z.S0,quota:false,closed:false});
 return{zones,taxMul:1,digital:false,spitClosedEver:false};
}
// Расчёт одного года. W — мир (меняется), built — проекты, построенные в этом году, ev — событие, prevRating.
function simulateYear(W,year,built,ev,prevRating){
 ev=ev||{};const out={year,zones:{},reasons:{}};
 const tax=taxRate(year),taxF=1-.005*(tax-2),growth=Math.pow(1.03,year-START_YEAR),ratF=.85+.05*(prevRating||4);
 const once={};ZONES.forEach(z=>once[z.id]={eco:0,res:0,list:[]});
 built.forEach(b=>{const p=PROJ[b.pid];projZones(p,b.zone).forEach(zid=>{const e=projEff(p,zid),z=W.zones[zid];
  if(e.cap&&z.cap!==null)z.cap+=e.cap;z.att+=e.att||0;z.carry+=e.carry||0;z.season=clamp(z.season+(e.season||0),20,95);
  once[zid].eco+=e.eco||0;once[zid].res+=e.res||0;once[zid].list.push(p.name)});
  if(p.quota)W.zones.spit.quota=true;if(p.taxMul)W.taxMul=p.taxMul;if(p.digital)W.digital=true});
 let top=null;
 ZONES.forEach(Z=>{const z=W.zones[Z.id],R=[];
  const dm=1+z.att+((ev.dem||{})[Z.id]||0)+((ev.dem||{}).all||0);
  const demand=Z.D0*growth*Math.max(.2,dm)*taxF*ratF;
  const cap=Z.C0===null?Infinity:z.cap*(ev.capMul||1);
  const carry=Z.K0*(1+z.carry);
  let served=Math.min(demand,cap);
  if(z.quota)served=Math.min(served,carry*.9);
  const wasClosed=z.closed;if(wasClosed){served=0;R.push('Коса закрыта для туристов на год')}
  const load=served/carry;
  let dEco=once[Z.id].eco+((ev.eco||{})[Z.id]||0)+((ev.eco||{}).all||0),dRes=once[Z.id].res;
  if(once[Z.id].list.length)R.push('Построено: '+once[Z.id].list.join(', '));
  if(load>1){const k=Z.park?90:60,l=Math.round((load-1)*k);dEco-=l;dRes-=Math.round((load-1)*40);R.push(`Перегрузка ${Math.round(load*100)}%: природа −${l}`)}
  else if(load<.8){dEco+=2;R.push('Нагрузка в норме: природа восстанавливается +2')}
  if(Z.C0!==null&&demand>cap*1.02)R.push(`${fN(demand-cap)} тыс. туристов не нашли жильё`);
  if(z.quota&&demand>carry*.9)R.push('Квота отсекла часть посетителей');
  z.eco=clamp(z.eco+dEco);z.res=clamp(z.res+dRes);
  if(wasClosed){z.closed=false;z.eco=clamp(z.eco+12);R.push('После закрытия природа восстановилась +12')}
  else if(Z.park&&z.eco<30){z.closed=true;W.spitClosedEver=true;R.push('Природа ниже 30: на следующий год косу закрывают!')}
  out.zones[Z.id]={demand,served,cap:cap===Infinity?null:cap,carry,load,eco:z.eco,res:z.res,season:z.season,dEco,dRes,closed:wasClosed};
  out.reasons[Z.id]=R;
  if(!top||load>out.zones[top].load)top=Z.id;
 });
 if(ev.resTop&&top){const z=W.zones[top];z.res=clamp(z.res+ev.resTop);out.zones[top].res=z.res;out.reasons[top].push('Жалобы жителей: '+ev.resTop)}
 const nz=ZONES.filter(z=>!z.park),zs=out.zones;
 const tourists=nz.reduce((s,z)=>s+zs[z.id].served,0);
 const revenue=ZONES.reduce((s,z)=>s+zs[z.id].served*z.spend,0);
 const eco=ZONES.reduce((s,z)=>s+zs[z.id].eco,0)/ZONES.length,res=ZONES.reduce((s,z)=>s+zs[z.id].res,0)/ZONES.length;
 const season=nz.reduce((s,z)=>s+zs[z.id].season*zs[z.id].served,0)/Math.max(1,tourists);
 const over=ZONES.filter(z=>zs[z.id].load>1).length;
 let rating=ratingOf(eco,res,over)+(W.digital?.1:0);
 if(ev.unesco&&zs.spit.eco<60)rating-=.3;
 rating=Math.round(clamp(rating,1,5)*10)/10;
 const lost=nz.reduce((s,z)=>s+Math.max(0,zs[z.id].demand-(zs[z.id].cap||Infinity)),0);
 out.region={tourists,revenue,eco,res,season,rating,over,lost,tax,spitVisitors:zs.spit.served};
 return out;
}
// Рейтинг дестинации: природа и жители поднимают, перегруженные зоны опускают
const ratingOf=(eco,res,over)=>3.4+(eco-60)/25+(res-60)/25-.25*over;
function snapshot(W,year){ // состояние до первого года (2026)
 const out={year,zones:{},reasons:{}};
 ZONES.forEach(Z=>{const z=W.zones[Z.id],carry=Z.K0*(1+z.carry),served=Math.min(Z.D0,Z.C0===null?Infinity:z.cap);out.zones[Z.id]={demand:Z.D0,served,cap:Z.C0===null?null:z.cap,carry,load:served/carry,eco:z.eco,res:z.res,season:z.season,dEco:0,dRes:0};out.reasons[Z.id]=[]});
 const zs=out.zones,nz=ZONES.filter(z=>!z.park),tourists=nz.reduce((s,z)=>s+zs[z.id].served,0);
 const eco=ZONES.reduce((s,z)=>s+zs[z.id].eco,0)/ZONES.length,res=ZONES.reduce((s,z)=>s+zs[z.id].res,0)/ZONES.length;
 out.region={tourists,revenue:ZONES.reduce((s,z)=>s+zs[z.id].served*z.spend,0),eco,res,season:nz.reduce((s,z)=>s+zs[z.id].season*zs[z.id].served,0)/tourists,
  rating:Math.round(clamp(ratingOf(eco,res,ZONES.filter(z=>zs[z.id].load>1).length),1,5)*10)/10,over:ZONES.filter(z=>zs[z.id].load>1).length,lost:0,tax:taxRate(year),spitVisitors:zs.spit.served};
 return out;
}
// Доходы команд за год. teams — {role: {assets:[{pid,zone,cost,yield}]}}
function incomes(Y,W,teams){
 const r=Y.region,inc={},why={};
 const occ=zid=>{const z=Y.zones[zid];return z.cap?clamp(z.served/z.cap,.3,1):clamp(1-Math.max(0,z.load-1),.3,1)};
 const ratF=r.rating/4;
 const nonParkRev=ZONES.filter(z=>!z.park).reduce((s,z)=>s+Y.zones[z.id].served*z.spend,0);
 const taxRev=r.tax/100*.35*nonParkRev*W.taxMul;
 const asset=role=>(teams[role]?teams[role].assets:[]).reduce((s,a)=>s+a.cost*(PROJ[a.pid].yield||0)*occ(a.zone)*ratF,0);
 inc.gov=500+taxRev+.006*r.revenue;why.gov=`Базовый бюджет 500 + турналог ${fN(taxRev)} (ставка ${r.tax}%) + другие налоги ${fN(.006*r.revenue)}`;
 const ia=asset('inv');inc.inv=150+ia;why.inv=`Доход объектов ${fN(ia)} (зависит от загрузки и рейтинга) + прочие 150`;
 const eg=Y.zones.spit.eco>=70?80:0;inc.eco=120+.03*taxRev+eg;why.eco=`Гранты 120 + доля турналога ${fN(.03*taxRev)}${eg?' + бонус за здоровую косу 80':''}`;
 const ra=asset('res');inc.res=60+ra+.003*r.revenue;why.res=`Местный бизнес ${fN(ra)} + траты туристов ${fN(.003*r.revenue)} + 60`;
 const off=Math.max(0,(62-r.season))*15;inc.mkt=.004*r.revenue+off;why.mkt=`Комиссия с продаж ${fN(.004*r.revenue)}${off?` + бонус межсезонья ${fN(off)}`:''}`;
 Object.keys(inc).forEach(k=>inc[k]=Math.round(inc[k]));
 return{inc,why,ownEarn:{inv:Math.round(ia),res:Math.round(ra)}};
}

/* ═════ КАРТА ═════ */
const px=lon=>(lon-19.3)*270.2, py=lat=>(55.5-lat)*467.5;
const PP=a=>a.map(([lo,la])=>px(lo).toFixed(1)+','+py(la).toFixed(1)).join(' ');
function offsetPoly(C,dx,dy){return[...C.map(([a,b])=>[a-dx,b+dy]),...C.slice().reverse().map(([a,b])=>[a+dx,b-dy])]}
const MAINLAND=[[19.90,54.645],[19.92,54.72],[19.93,54.80],[19.94,54.88],[19.96,54.96],[20.10,54.95],[20.15,54.945],[20.30,54.955],[20.48,54.965],[20.53,54.97],[20.62,54.95],[20.80,54.93],[21.00,54.905],[21.15,54.92],[21.22,55.00],[21.25,55.12],[21.30,55.24],[21.38,55.29],[21.60,55.19],[21.80,55.115],[22.00,55.07],[22.30,55.06],[22.60,54.98],[22.85,54.88],[22.75,54.75],[22.78,54.60],[22.70,54.45],[22.78,54.36],[22.30,54.35],[21.80,54.335],[21.30,54.33],[20.80,54.36],[20.35,54.40],[20.00,54.42],[19.84,54.43],[19.94,54.47],[20.05,54.52],[20.20,54.58],[20.33,54.62],[20.42,54.65],[20.38,54.68],[20.20,54.69],[20.05,54.67],[19.95,54.655]];
const CUR_SPIT=offsetPoly([[20.52,54.965],[20.60,55.01],[20.65,55.03],[20.78,55.12],[20.90,55.21],[20.985,55.285]],.015,.004);
const LT_SPIT=offsetPoly([[20.985,55.285],[21.05,55.40],[21.10,55.52]],.015,0);
const VIS_SPIT=offsetPoly([[19.885,54.632],[19.80,54.565],[19.68,54.48],[19.60,54.43],[19.45,54.375],[19.3,54.36]],.01,-.006);
const CUR_LAG=[[20.53,54.97],[20.65,55.03],[20.78,55.12],[20.90,55.21],[20.985,55.285],[21.10,55.52],[21.30,55.52],[21.38,55.29],[21.30,55.24],[21.25,55.12],[21.22,55.00],[21.15,54.92],[21.00,54.905],[20.80,54.93],[20.62,54.95]];
const VIS_LAG=[[19.89,54.632],[19.80,54.565],[19.68,54.48],[19.60,54.43],[19.84,54.43],[19.94,54.47],[20.05,54.52],[20.20,54.58],[20.33,54.62],[20.42,54.65],[20.38,54.68],[20.20,54.69],[20.05,54.67],[19.95,54.655]];
const POLAND=[[19.3,54.2],[23.1,54.2],[23.1,54.36],[22.78,54.36],[22.30,54.35],[21.80,54.335],[21.30,54.33],[20.80,54.36],[20.35,54.40],[20.00,54.42],[19.84,54.43],[19.60,54.43],[19.3,54.355]];
const LITH=[[23.1,54.36],[22.78,54.36],[22.70,54.45],[22.78,54.60],[22.75,54.75],[22.85,54.88],[22.60,54.98],[22.30,55.06],[22.00,55.07],[21.80,55.115],[21.60,55.19],[21.38,55.29],[21.30,55.52],[23.1,55.52]];
const LBL={kgd:[14,34],zel:[-40,-30],svet:[-60,-30],spit:[18,-6],west:[-112,6],east:[-40,-36]};
// Y — результаты года (zones), sel — выбранная зона, built — [{zone, role}]
function regionSVG(Y,sel,built){
 built=built||[];
 const bubbles=ZONES.map(Z=>{const z=Y.zones[Z.id],x=px(Z.lon),y=py(Z.lat),r=Math.max(16,Math.min(58,Math.sqrt(z.served)*1.55)),c=z.closed?'#93b3c3':loadColor(z.load),on=sel===Z.id;
  const [lx,ly]=LBL[Z.id];const icons=built.filter(b=>b.zone===Z.id).slice(0,8).map((b,k)=>`<circle cx="${x-r+8+k*11}" cy="${y+r+10}" r="4.5" fill="${(ROLE[b.role]||{}).color||'#fff'}" stroke="#06121c" stroke-width="1.5"/>`).join('');
  return`<g class="zone" data-a="zone" data-id="${Z.id}" style="cursor:pointer">
   <circle cx="${x}" cy="${y}" r="${r+10}" fill="${c}" opacity="${z.load>=1?.18:.1}" class="${z.load>=1?'pulse-ring':''}"/>
   <circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".28" stroke="${on?'#ffd27a':c}" stroke-width="${on?4:2.5}"/>
   <text x="${x}" y="${y+6}" text-anchor="middle" font-size="17" font-weight="800" fill="#eaf3f6" font-family="JetBrains Mono,monospace">${z.closed?'закр.':Math.round(z.load*100)+'%'}</text>
   <text x="${x+lx}" y="${y+ly}" font-size="14" font-weight="800" fill="#eaf3f6" font-family="Manrope,Segoe UI,sans-serif">${esc(Z.name)}</text>
   ${icons}</g>`}).join('');
 return`<svg viewBox="0 0 1000 584" role="img" aria-label="Карта нагрузки на зоны области">
 <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#16332c" stroke-width="3"/></pattern>
 <radialGradient id="glow" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#0d3352"/><stop offset="1" stop-color="#08263b"/></radialGradient></defs>
 <rect width="1000" height="584" fill="url(#glow)"/>
 <polygon points="${PP(POLAND)}" fill="#0e231f"/><polygon points="${PP(POLAND)}" fill="url(#hatch)" opacity=".5"/>
 <polygon points="${PP(LITH)}" fill="#0e231f"/><polygon points="${PP(LITH)}" fill="url(#hatch)" opacity=".5"/>
 <polygon points="${PP(LT_SPIT)}" fill="#0e231f"/>
 <polygon points="${PP(CUR_LAG)}" fill="#0d3450"/><polygon points="${PP(VIS_LAG)}" fill="#0d3450"/>
 <polygon points="${PP(MAINLAND)}" fill="#173a33" stroke="#2c5a4e" stroke-width="1.5" stroke-linejoin="round"/>
 <polygon points="${PP(CUR_SPIT)}" fill="#3b5a3e" stroke="#c9b37a" stroke-width="1"/>
 <polygon points="${PP(VIS_SPIT)}" fill="#2f4d3a" stroke="#c9b37a" stroke-width=".8"/>
 <text x="${px(19.42)}" y="${py(55.25)}" font-size="20" font-weight="700" fill="#4d7d9a" font-family="Unbounded,Segoe UI,sans-serif" letter-spacing="3">БАЛТИЙСКОЕ МОРЕ</text>
 <text x="${px(22.35)}" y="${py(55.33)}" font-size="16" font-weight="700" fill="#2d4f47" font-family="Unbounded,sans-serif" letter-spacing="4">ЛИТВА</text>
 <text x="${px(21.4)}" y="${py(54.255)}" font-size="16" font-weight="700" fill="#2d4f47" font-family="Unbounded,sans-serif" letter-spacing="4">ПОЛЬША</text>
 ${bubbles}
 <g transform="translate(24 560)" font-family="Manrope,sans-serif" font-size="12" fill="#93b3c3"><circle r="6" fill="#5fd3a0"/><text x="12" y="4">нагрузка до 85%</text><circle cx="130" r="6" fill="#ffcf5c"/><text x="142" y="4">85–100%</text><circle cx="230" r="6" fill="#ff6b5e"/><text x="242" y="4">перегрузка</text><text x="340" y="4">Размер круга — число туристов. Точки — построенные проекты.</text></g>
 </svg>`;
}

/* ═════ ГРАФИК ═════ */
// series: [{name,color,values:[...]}], labels: годы. Одна ось Y от min до max.
function lineChart(labels,series,opts){
 opts=opts||{};const W=520,H=200,pl=44,pr=16,pt=14,pb=28;
 const all=series.flatMap(s=>s.values).filter(v=>v!=null);let lo=opts.min!=null?opts.min:Math.min(...all),hi=opts.max!=null?opts.max:Math.max(...all);
 if(hi-lo<1e-9){hi=lo+1}const pad=(hi-lo)*.1;if(opts.min==null)lo-=pad;if(opts.max==null)hi+=pad;
 const X=i=>pl+(W-pl-pr)*(labels.length<2?.5:i/(labels.length-1)),Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));
 const ticks=[0,.5,1].map(k=>lo+(hi-lo)*k);
 const grid=ticks.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1" opacity=".6"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="var(--mist)" font-family="JetBrains Mono,monospace">${opts.fmt?opts.fmt(v):fN(v)}</text>`).join('');
 const xl=labels.map((l,i)=>`<text x="${X(i)}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--mist)" font-family="JetBrains Mono,monospace">${l}</text>`).join('');
 const lines=series.map(s=>{const pts=s.values.map((v,i)=>v==null?null:[X(i),Y(v)]).filter(Boolean);if(!pts.length)return'';const d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');const last=pts[pts.length-1];
  return`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${s.color}"/>`).join('')}<circle cx="${last[0]}" cy="${last[1]}" r="5.5" fill="${s.color}" stroke="var(--sea-1)" stroke-width="2"/>`}).join('');
 const leg=series.length>1?`<div class="legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`:'';
 return`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(opts.label||'График')}">${grid}${xl}${lines}</svg>${leg}`;
}

/* ── конфетти ── */
function confetti(n){if(reduced)return;let c=document.getElementById('fx');if(!c){c=document.createElement('canvas');c.id='fx';document.body.appendChild(c)}
 const g=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
 const cols=['#f4a73b','#ffd27a','#4cc9f0','#ff8a65','#a5e36b','#eaf3f6','#c6a2e0'];
 const Ps=Array.from({length:n||200},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.6,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,s:5+Math.random()*8,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.random()*cols.length|0]}));
 const t0=performance.now();(function f(t){g.clearRect(0,0,c.width,c.height);Ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.04;p.r+=p.vr;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);g.restore()});if(t-t0<5000)requestAnimationFrame(f);else g.clearRect(0,0,c.width,c.height)})(t0)}
