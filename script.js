/* Modèle synodique : le Soleil reste à gauche, le repère tourne avec
   la direction Terre–Soleil. Il ne s'agit pas d'une éphéméride. */
'use strict';
const Lunar = (() => {
  const PERIOD = 29.53;
  const TAU = 2 * Math.PI;
  const normalize = day => ((day % PERIOD) + PERIOD) % PERIOD;
  function geometry(day) {
    const theta = normalize(day) / PERIOD * TAU;
    // θ = 0 : nouvelle Lune à gauche. Mouvement antihoraire vu du nord.
    // L'élongation α = angle Soleil–Terre–Lune, entre 0 et π.
    // L'angle de phase est π − α, donc k = (1 − cos α) / 2.
    return {
      theta,
      x: 420 - 145 * Math.cos(theta),
      y: 205 + 145 * Math.sin(theta),
      fraction: (1 - Math.cos(theta)) / 2,
      elongation: Math.acos(Math.max(-1, Math.min(1, Math.cos(theta)))),
      phaseIndex: Math.floor(theta / TAU * 8 + 0.5) % 8,
      waxing: theta <= Math.PI
    };
  }
  const dayFromPoint = (x, y) => normalize(Math.atan2(y - 205, -(x - 420)) / TAU * PERIOD);
  return { PERIOD, TAU, normalize, geometry, dayFromPoint };
})();

const PHASES = [
  {name:'Nouvelle Lune', short:'Une face tournée vers nous, presque entièrement dans la nuit.', explanation:'La Lune est approximativement dans la direction du Soleil. Sa moitié éclairée est tournée à l’opposé de nous : nous voyons sa face nocturne.'},
  {name:'Premier croissant', short:'Un fin croissant de lumière apparaît à droite.', explanation:'La Lune s’éloigne de la direction du Soleil dans notre ciel. Un croissant lumineux apparaît à droite et grandit chaque jour : la Lune est croissante.'},
  {name:'Premier quartier', short:'La moitié droite du disque est éclairée.', explanation:'Autour du premier quartier, la direction de la Lune forme un angle proche de 90° avec celle du Soleil. Nous voyons environ la moitié de sa face éclairée, à droite. Un quart du cycle est écoulé.'},
  {name:'Lune gibbeuse croissante', short:'Plus de la moitié du disque brille. Elle grandit encore.', explanation:'La Lune a dépassé le premier quartier. Nous voyons de plus en plus de sa moitié éclairée par le Soleil. Le disque est éclairé à plus de 50 % et la zone lumineuse continue de grandir.'},
  {name:'Pleine Lune', short:'Le disque nous présente toute sa face éclairée.', explanation:'La Terre se trouve approximativement entre le Soleil et la Lune. Depuis la Terre, nous observons presque toute la face éclairée de la Lune. L’inclinaison réelle de son orbite lui permet généralement d’éviter l’ombre terrestre.'},
  {name:'Lune gibbeuse décroissante', short:'La lumière diminue, en restant visible à gauche.', explanation:'Après la pleine Lune, la fraction éclairée visible diminue. La lumière occupe encore plus de la moitié du disque, surtout à gauche : la Lune est décroissante.'},
  {name:'Dernier quartier', short:'La moitié gauche du disque est éclairée.', explanation:'Autour du dernier quartier, les directions du Soleil et de la Lune forment à nouveau un angle proche de 90°. La moitié gauche du disque est éclairée. Environ trois quarts du cycle sont écoulés.'},
  {name:'Dernier croissant', short:'Un croissant à gauche avant un nouveau cycle.', explanation:'La Lune se rapproche de la direction du Soleil. Il reste un croissant éclairé à gauche, qui s’amincit jusqu’à la nouvelle Lune. Un nouveau cycle commence ensuite.'}
];

/* Disque orthographique d'une sphère, et non une suite de huit images.
   Pour un pixel (x,y), la normale est (x,y,√(1−x²−y²)). Dans le repère
   de l'observateur terrestre (nord en haut), le Soleil a pour direction
   L = (sin θ, 0, −cos θ). La surface est éclairée si normale · L > 0.
   La frontière est ainsi le vrai terminateur projeté d'une sphère. */
const MoonRenderer = (() => {
  const cache = new WeakMap();
  const craters = [ [-.36,.19,.22], [.2,-.1,.28], [.45,.42,.12], [-.18,-.47,.16], [.1,.53,.14], [-.6,-.3,.09], [.48,-.44,.13], [-.36,.52,.08], [.65,.05,.07] ];
  function prepare(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(w, h);
    const pixels = [];
    const radius = w * .475;
    for (let py=0; py<h; py++) for (let px=0; px<w; px++) {
      const x=(px+.5-w/2)/radius, y=(py+.5-h/2)/radius;
      const rr=x*x+y*y;
      if (rr>1) continue;
      const z=Math.sqrt(1-rr);
      let texture=.91+.025*Math.sin(px*2.31+py*4.17)+.018*Math.sin(px*.71-py*1.17);
      for (const [cx,cy,r] of craters) {
        const d=Math.hypot(x-cx,y-cy)/r;
        texture-=.18*Math.exp(-d*d*2);
        texture+=.05*Math.exp(-Math.pow((d-1)/.12,2));
      }
      const index=(py*w+px)*4;
      pixels.push({index,x,z,texture});
      image.data[index+3]=Math.round(Math.min(1,(1-Math.sqrt(rr))*radius)*255);
    }
    const result={ctx,image,pixels};cache.set(canvas,result);return result;
  }
  function draw(canvas, theta) {
    const {ctx,image,pixels}=cache.get(canvas)||prepare(canvas);
    const lx=Math.sin(theta), lz=-Math.cos(theta);
    for(const {index,x,z,texture} of pixels){
      const light=x*lx+z*lz;
      // Le faible plancher sombre rend le contour lisible ; c'est un choix
      // graphique, pas un calcul photométrique de la lumière cendrée.
      const luminance=light>0 ? (.55+.45*Math.sqrt(light))*texture : .075*texture;
      image.data[index]=Math.round(229*luminance);
      image.data[index+1]=Math.round(230*luminance);
      image.data[index+2]=Math.round(218*luminance);
    }
    ctx.putImageData(image,0,0);
  }
  return {draw};
})();

const $ = id => document.getElementById(id);
const format = (value, digits=1) => value.toLocaleString('fr-FR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const state = {day:9.7,playing:false,speed:1,exploring:false,lastTime:null,lastAnnounced:-1};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let frameId=null;

function createPhaseCards(){
  PHASES.forEach((phase,index)=>{
    const day=index/8*Lunar.PERIOD;
    const card=document.createElement('button');
    card.className='phase-card';
    card.setAttribute('aria-pressed','false');
    card.setAttribute('aria-label',`${phase.name}, jour ${format(day)}, ${Math.round(Lunar.geometry(day).fraction*100)} % éclairés. ${phase.short}`);
    card.innerHTML=`<span class="phase-index">0${index+1}</span><canvas width="96" height="96" aria-hidden="true"></canvas><strong>${phase.name}</strong><span class="phase-meta">J ${format(day)} · ${Math.round(Lunar.geometry(day).fraction*100)} %</span><span class="phase-description">${phase.short}</span>`;
    card.addEventListener('click',()=>{pause();setDay(day);selectTab('simulateur',{updateHash:true,focusPanel:true});});
    $('phase-grid').append(card);
    MoonRenderer.draw(card.querySelector('canvas'),index/8*Lunar.TAU);
  });
}

function setDay(day, announce=true){
  // Le curseur garde son point final 29,53 ; la géométrie est périodique.
  state.day=Math.max(0,Math.min(Lunar.PERIOD,day));
  const g=Lunar.geometry(state.day), phase=PHASES[g.phaseIndex];
  $('orbital-moon').setAttribute('transform',`translate(${g.x} ${g.y})`);
  $('earth-moon-line').setAttribute('d',`M420 205 L${g.x} ${g.y}`);
  // Montrer l'angle non orienté α : le petit secteur passe sous Terre
  // pendant la croissance et au-dessus pendant la décroissance.
  const r=62, endX=420-r*Math.cos(g.theta),endY=205+r*Math.sin(g.theta);
  $('angle-sector').setAttribute('d',`M420 205 L${420-r} 205 A${r} ${r} 0 0 ${g.waxing?0:1} ${endX} ${endY} Z`);
  $('angle-label').textContent=`${Math.round(g.elongation*180/Math.PI)}°`;
  $('angle-label').setAttribute('y',g.waxing?237:182);
  MoonRenderer.draw($('main-moon'),g.theta);
  $('main-moon').setAttribute('aria-label',`${phase.name}, ${Math.round(g.fraction*100)} % de la face visible éclairée`);
  $('phase-name').textContent=phase.name;
  $('illumination').textContent=`${Math.round(g.fraction*100)} %`;
  $('current-day').innerHTML=`${format(state.day)} <small>j</small>`;
  $('day-label').textContent=format(state.day,2);
  $('timeline').value=state.day;
  $('timeline').style.setProperty('--progress',`${state.day/Lunar.PERIOD*100}%`);
  $('timeline').setAttribute('aria-valuetext',`Jour ${format(state.day)}, ${phase.name}, ${Math.round(g.fraction*100)} % éclairés`);
  $('orbit').setAttribute('aria-valuenow',state.day.toFixed(2));
  $('orbit').setAttribute('aria-valuetext',`Jour ${format(state.day)}, ${phase.name}`);
  $('explanation-title').textContent=phase.name;
  $('dynamic-explanation').textContent=phase.explanation;
  $('angle-explanation').textContent=`Angle Soleil–Terre–Lune : ${Math.round(g.elongation*180/Math.PI)}° · Fraction éclairée visible : (1 − cos α) / 2 ≈ ${Math.round(g.fraction*100)} %. Le Soleil éclaire toujours environ la moitié de la surface totale.`;
  document.querySelectorAll('.phase-card').forEach((card,i)=>card.setAttribute('aria-pressed',String(i===g.phaseIndex)));
  if(announce&&g.phaseIndex!==state.lastAnnounced){
    $('announcer').textContent=`${phase.name}, ${Math.round(g.fraction*100)} % éclairés`;
    state.lastAnnounced=g.phaseIndex;
  }
}
function pause(){
  state.playing=false;state.lastTime=null;
  cancelAnimationFrame(frameId);frameId=null;
  $('play').innerHTML='<span>▶</span> Lecture';
  $('play').setAttribute('aria-pressed','false');
}
function animate(time){
  if(!state.playing)return;
  if(state.lastTime!==null){
    // ×1 : une lunaison en ~59 secondes. Limiter un long retour d'onglet.
    const dt=Math.min((time-state.lastTime)/1000,.1);
    setDay(Lunar.normalize(state.day+dt*.5*state.speed));
  }
  state.lastTime=time;frameId=requestAnimationFrame(animate);
}
function setMode(exploring){
  pause();state.exploring=exploring;
  $('explore').setAttribute('aria-pressed',String(exploring));
  $('observe').setAttribute('aria-pressed',String(!exploring));
  $('simulateur').classList.toggle('exploring',exploring);
  $('orbit-help').textContent=exploring?'↗ Faites glisser la Lune sur son orbite · touches ← →':'↗ Cliquez sur l’orbite pour déplacer la Lune';
}
$('play').addEventListener('click',()=>{
  if(state.playing){pause();return;}
  if(state.exploring)setMode(false);
  state.playing=true;state.lastTime=null;
  $('play').innerHTML='<span>Ⅱ</span> Pause';$('play').setAttribute('aria-pressed','true');
  frameId=requestAnimationFrame(animate);
});
$('timeline').addEventListener('input',event=>{pause();setDay(Number(event.target.value));});
$('back').addEventListener('click',()=>{pause();setDay(Lunar.normalize(state.day-1));});
$('forward').addEventListener('click',()=>{pause();setDay(Lunar.normalize(state.day+1));});
$('speed').addEventListener('change',event=>{state.speed=Number(event.target.value);});
$('reset').addEventListener('click',()=>{pause();setMode(false);state.speed=1;$('speed').value='1';setDay(0);});
$('observe').addEventListener('click',()=>setMode(false));
$('explore').addEventListener('click',()=>setMode(true));

// Convertir les coordonnées écran vers le viewBox, même avec des marges SVG.
function moveAtPointer(event){
  const svg=$('orbit'), matrix=svg.getScreenCTM();
  if(!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  if(Math.hypot(point.x-420,point.y-205)<35)return;
  pause();setDay(Lunar.dayFromPoint(point.x,point.y));
}
let dragging=false;
$('orbit').addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  moveAtPointer(event);
  if(state.exploring){dragging=true;$('orbit').setPointerCapture(event.pointerId);}
});
$('orbit').addEventListener('pointermove',event=>{if(dragging)moveAtPointer(event);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('orbit').addEventListener(type,()=>{dragging=false;}));
$('orbit').addEventListener('keydown',event=>{
  const steps={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:3,PageDown:-3};
  if(event.key in steps){event.preventDefault();pause();setDay(Lunar.normalize(state.day+steps[event.key]*(event.shiftKey?.1:1)));}
  else if(event.key==='Home'||event.key==='End'){event.preventDefault();pause();setDay(event.key==='Home'?0:Lunar.PERIOD);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)pause();});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)pause();});
// Aucune lecture automatique, y compris en mode prefers-reduced-motion.

const QUESTIONS=[
  {q:'Pourquoi la Lune change-t-elle d’apparence ?',options:['L’ombre de la Terre recouvre une partie de la Lune.','Nous voyons une part différente de sa moitié éclairée.','La Lune produit plus ou moins de lumière.'],answer:1,explain:'Le Soleil éclaire toujours environ une moitié de la Lune. Sa position change la portion éclairée visible depuis la Terre.'},
  {q:'Quelle phase suit le premier quartier ?',options:['La Lune gibbeuse croissante.','Le dernier croissant.','La nouvelle Lune.'],answer:0,explain:'Après le premier quartier, la partie éclairée continue de grandir : c’est la Lune gibbeuse croissante, puis vient la pleine Lune.'},
  {q:'Combien de temps dure une lunaison en moyenne ?',options:['24 heures.','27,32 jours.','29,53 jours.'],answer:2,explain:'Deux nouvelles Lunes sont séparées de 29,53 jours en moyenne. Les 27,32 jours correspondent à la révolution sidérale, par rapport aux étoiles.'},
  {q:'Pourquoi n’y a-t-il pas d’éclipse à chaque pleine Lune ?',options:['Le Soleil s’éteint pendant la nuit.','L’orbite de la Lune est inclinée d’environ 5,1°.','La Terre n’a pas d’ombre à la pleine Lune.'],answer:1,explain:'L’inclinaison de l’orbite lunaire fait que la Lune passe généralement au-dessus ou au-dessous de l’ombre terrestre.'},
  {q:'Au premier quartier, quelle fraction du disque visible est éclairée ?',options:['Environ 25 %.','Environ 50 %.','Environ 100 %.'],answer:1,explain:'« Quartier » désigne ici un quart du cycle. À cette phase, environ la moitié du disque visible est éclairée, à droite dans notre convention nord en haut.'},
  {q:'Pourquoi la Lune nous présente-t-elle approximativement la même face ?',options:['Elle ne tourne pas sur elle-même.','Elle tourne sur elle-même en un an.','Sa rotation et sa révolution sidérale ont la même durée.'],answer:2,explain:'La Lune tourne bien sur elle-même. Sa rotation synchrone prend environ 27,32 jours, comme son tour autour de la Terre par rapport aux étoiles.'}
];
const quiz={index:0,score:0,answered:false,finished:false};
function renderQuestion(){
  const question=QUESTIONS[quiz.index];quiz.answered=false;
  $('quiz-progress').textContent=`QUESTION ${String(quiz.index+1).padStart(2,'0')} / 06`;
  $('quiz-score').textContent=`${quiz.score} bonne${quiz.score>1?'s':''} réponse${quiz.score>1?'s':''}`;
  $('quiz-bar').style.width=`${(quiz.index+1)/QUESTIONS.length*100}%`;
  $('quiz-question').textContent=question.q;
  $('quiz-options').replaceChildren();$('quiz-feedback').textContent='';$('quiz-next').hidden=true;
  question.options.forEach((option,index)=>{
    const button=document.createElement('button');button.className='quiz-option';
    const letter=document.createElement('span');letter.textContent=String.fromCharCode(65+index);
    const text=document.createElement('span');text.textContent=option;text.style.color='inherit';
    button.append(letter,text);button.addEventListener('click',()=>answerQuestion(index));$('quiz-options').append(button);
  });
}
function answerQuestion(index){
  if(quiz.answered)return;quiz.answered=true;
  const question=QUESTIONS[quiz.index],correct=index===question.answer;
  if(correct)quiz.score++;
  [...$('quiz-options').children].forEach((button,i)=>{button.disabled=true;if(i===question.answer)button.classList.add('correct');else if(i===index)button.classList.add('incorrect');});
  $('quiz-feedback').textContent=`${correct?'Bonne réponse !':'Pas tout à fait.'} ${question.explain}`;
  $('quiz-score').textContent=`${quiz.score} bonne${quiz.score>1?'s':''} réponse${quiz.score>1?'s':''}`;
  $('quiz-next').textContent=quiz.index===QUESTIONS.length-1?'Voir mon résultat →':'Question suivante →';$('quiz-next').hidden=false;
}
$('quiz-next').addEventListener('click',()=>{
  if(quiz.finished){quiz.index=0;quiz.score=0;quiz.finished=false;renderQuestion();}
  else if(quiz.index<QUESTIONS.length-1){quiz.index++;renderQuestion();}
  else{
    quiz.finished=true;$('quiz-progress').textContent='EXPLORATION TERMINÉE';
    $('quiz-question').textContent=`Votre score : ${quiz.score} / ${QUESTIONS.length}`;
    $('quiz-options').replaceChildren();
    $('quiz-feedback').textContent=quiz.score===6?'Vous avez percé le secret des phases ! Continuez à explorer le ciel.':'Chaque observation aide à comprendre. Explorez à nouveau l’orbite, puis retentez votre chance !';
    $('quiz-next').textContent='↺ Recommencer le quiz';
  }
  $('quiz-question').setAttribute('tabindex','-1');$('quiz-question').focus({preventScroll:true});
});
createPhaseCards();setDay(state.day,false);renderQuestion();

// Onglets accessibles : état conservé, liens directs et historique navigateur.
const TOPICS = ['simulateur','phases','comprendre','eclipses','horaires-lune','marees','quiz'];
let activeTopic = null;
function selectTab(topic, {updateHash=false, focusPanel=false}={}) {
  if (!TOPICS.includes(topic)) return;
  if (topic !== 'simulateur' && state.playing) pause();
  TOPICS.forEach(id => {
    const selected=id===topic;
    $(`tab-${id}`).setAttribute('aria-selected',String(selected));
    $(`tab-${id}`).tabIndex=selected?0:-1;
    $(`panel-${id}`).hidden=!selected;
  });
  activeTopic=topic;
  if(updateHash && window.location.hash!==`#${topic}`){
    // pushState évite le saut vers une section située sous la barre d'onglets.
    try { window.history.pushState(null,'',`#${topic}`); }
    catch { window.location.hash=topic; }
  }
  if(focusPanel) $(`panel-${topic}`).focus({preventScroll:true});
}
TOPICS.forEach((topic,index)=>{
  const tab=$(`tab-${topic}`);
  tab.addEventListener('click',()=>selectTab(topic,{updateHash:true}));
  tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight')next=(index+1)%TOPICS.length;
    else if(event.key==='ArrowLeft')next=(index-1+TOPICS.length)%TOPICS.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=TOPICS.length-1;
    else return;
    event.preventDefault();
    selectTab(TOPICS[next],{updateHash:true});
    $(`tab-${TOPICS[next]}`).focus({preventScroll:true});
    $(`tab-${TOPICS[next]}`).scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  });
});
function restoreTopic(){
  const topic=window.location.hash.slice(1);
  selectTab(TOPICS.includes(topic)?topic:'simulateur');
}
window.addEventListener('hashchange',restoreTopic);
window.addEventListener('popstate',restoreTopic);
$('topic-tabs').hidden=false;
restoreTopic();
