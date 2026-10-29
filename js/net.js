/* Сетевой слой: публичный MQTT-брокер через WebSocket. Регистрация не нужна.
   Все сообщения игры живут в теме kubok-yk/v1/<КОД КОМНАТЫ>/...
   Ведущий — единственный, кто меняет деньги, рейтинг и этапы. Телефоны шлют черновики и команды. */

const NET_BROKERS=[
 {name:'EMQX',url:'wss://broker.emqx.io:8084/mqtt'},
 {name:'HiveMQ',url:'wss://broker.hivemq.com:8884/mqtt'},
];
const NET_NS='dest2030/v1/';

// Библиотека MQTT грузится с CDN; если первый недоступен, пробуем второй.
const MQTT_SRC=['https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js','https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js'];
let mqttLoading=null;
function ensureMqtt(){
 if(typeof mqtt!=='undefined')return Promise.resolve(true);
 if(mqttLoading)return mqttLoading;
 mqttLoading=(async()=>{for(const src of MQTT_SRC){const ok=await new Promise(res=>{const s=document.createElement('script');s.src=src;s.onload=()=>res(typeof mqtt!=='undefined');s.onerror=()=>{s.remove();res(false)};document.head.appendChild(s)});if(ok)return true}mqttLoading=null;return false})();
 return mqttLoading;
}

function makeRoomCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=A[Math.random()*A.length|0];return s}
function makeId(){return Math.random().toString(36).slice(2,10)}

function makeNet(o){
 // o: {room, subs:[подтемы с # или +], will:'pres/<id>', onStatus(s), onMsg(sub, value)}
 let cl=null;const base=NET_NS+o.room+'/';
 const api={connected:false,broker:-1,base,
  tryBroker(idx){return new Promise(res=>{
   if(typeof mqtt==='undefined'){o.onStatus&&o.onStatus('nolib');return res(false)}
   let done=false;const opts={clientId:'ky_'+makeId(),clean:true,reconnectPeriod:2500,connectTimeout:7000,keepalive:30};
   if(o.will)opts.will={topic:base+o.will,payload:'',retain:true,qos:0};
   let c;try{c=mqtt.connect(NET_BROKERS[idx].url,opts)}catch(e){return res(false)}
   c.on('connect',()=>{api.connected=true;cl=c;api.broker=idx;o.onStatus&&o.onStatus('online');
    (o.subs||['#']).forEach(s=>c.subscribe(base+s,{qos:0}));if(!done){done=true;res(true)}});
   c.on('reconnect',()=>{if(cl===c)o.onStatus&&o.onStatus('reconnect')});
   c.on('close',()=>{if(cl===c){api.connected=false;o.onStatus&&o.onStatus('offline')}});
   c.on('error',()=>{});
   c.on('message',(t,p)=>{if(cl!==c)return;const sub=t.slice(base.length),s=p.toString();let v=null;if(s){try{v=JSON.parse(s)}catch(e){return}}o.onMsg&&o.onMsg(sub,v)});
   setTimeout(()=>{if(!done){done=true;try{c.end(true)}catch(e){}res(false)}},8000);
  })},
  async connect(pref){
   o.onStatus&&o.onStatus('connecting');
   if(!await ensureMqtt()){o.onStatus&&o.onStatus('nolib');return -1}
   const order=[...NET_BROKERS.keys()];if(pref>=0&&pref<order.length){order.splice(order.indexOf(pref),1);order.unshift(pref)}
   for(const i of order){if(await api.tryBroker(i))return i}
   o.onStatus&&o.onStatus(typeof mqtt==='undefined'?'nolib':'fail');return -1;
  },
  pub(sub,val,retain){if(!cl||!api.connected)return false;cl.publish(base+sub,val==null?'':JSON.stringify(val),{qos:0,retain:!!retain});return true},
  end(){try{cl&&cl.end(true)}catch(e){}cl=null;api.connected=false},
 };
 return api;
}

