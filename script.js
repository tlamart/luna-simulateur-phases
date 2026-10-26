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

// Huit questions, deux par thème. Les réponses sont mémorisées pour le bilan.
const QUIZ_TOPICS={
  phases:{label:'Phases',panel:'phases'},
  eclipses:{label:'Éclipses',panel:'eclipses'},
  horaires:{label:'Lever & coucher',panel:'horaires-lune'},
  marees:{label:'Marées',panel:'marees'}
};
const QUESTIONS=[
  {topic:'phases',q:'Au premier quartier, quelle partie du disque voit-on éclairée, avec le nord en haut ?',options:['La moitié gauche.','La moitié droite.','Un quart seulement du disque.'],answer:1,explain:'Dans la convention de l’hémisphère Nord utilisée ici, la moitié droite est éclairée au premier quartier. « Quartier » désigne un quart du cycle, pas un quart du disque.'},
  {topic:'phases',q:'Deux nouvelles Lunes successives sont séparées en moyenne de…',options:['27,32 jours : la révolution sidérale.','30 ou 31 jours exactement, selon le mois.','29,53 jours : la lunaison.'],answer:2,explain:'La lunaison est le cycle des phases : 29,53 jours en moyenne. La période sidérale de 27,32 jours mesure le tour de la Lune par rapport aux étoiles. La Terre avance aussi autour du Soleil, d’où la différence.'},
  {topic:'eclipses',q:'Pendant une éclipse de Soleil, un anneau lumineux entoure la Lune. Quel type d’éclipse observes-tu ?',options:['Une éclipse annulaire.','Une éclipse totale de Lune.','Une éclipse solaire totale.'],answer:0,explain:'Lors d’une éclipse annulaire, la Lune paraît trop petite pour cacher tout le disque solaire. Un anneau de Soleil reste visible. Il faut un filtre solaire adapté pour l’observer.'},
  {topic:'eclipses',q:'Pourquoi une pleine Lune ne provoque-t-elle pas une éclipse de Lune chaque mois ?',options:['La Terre ne projette une ombre qu’en hiver.','L’orbite lunaire est inclinée : l’alignement exact est rare.','La Lune est alors trop lumineuse pour être assombrie.'],answer:1,explain:'L’orbite lunaire est inclinée d’environ 5,1° par rapport au plan de l’orbite terrestre. La Lune passe généralement au-dessus ou au-dessous de l’ombre terrestre. Une pleine Lune doit avoir lieu près d’un nœud orbital pour qu’une éclipse soit possible.'},
  {topic:'horaires',q:'Vers quelle heure la pleine Lune se lève-t-elle généralement ?',options:['Vers midi.','Vers le lever du Soleil.','Vers le coucher du Soleil.'],answer:2,explain:'La pleine Lune est à l’opposé du Soleil dans le ciel : elle se lève approximativement quand le Soleil se couche, culmine vers minuit solaire et se couche vers le lever du Soleil. Le lieu et la saison modifient ces repères.'},
  {topic:'horaires',q:'Que signifie le décalage d’environ 50 minutes par jour ?',options:['Le retour au méridien est retardé en moyenne ; les levers et couchers ont un décalage variable.','La Lune se lève exactement 50 minutes plus tard partout et chaque jour.','La Lune reste visible seulement 50 minutes chaque nuit.'],answer:0,explain:'Pendant que la Terre tourne, la Lune avance vers l’est. Son retour au méridien prend environ 24 h 50 min en moyenne. Les heures de lever et de coucher dépendent aussi de la latitude et de sa trajectoire dans le ciel : leur retard quotidien n’est pas constant.'},
  {topic:'marees',q:'Près des nouvelles et pleines Lunes, pourquoi observe-t-on généralement des vives-eaux ?',options:['Les phases rendent l’eau plus lourde.','Les effets de marée de la Lune et du Soleil se renforcent.','Une éclipse aspire les océans vers le haut.'],answer:1,explain:'Les directions du Soleil et de la Lune sont approximativement alignées depuis la Terre : leurs effets de marée se renforcent. Le marnage, différence entre pleine mer et basse mer successives, est généralement plus grand. Aucune éclipse n’est nécessaire et un retard local est possible.'},
  {topic:'marees',q:'Tu veux explorer une plage à marée basse. Quelle information faut-il consulter ?',options:['Seulement la phase de la Lune.','L’heure du lever de la Lune, identique à celle de la basse mer.','Les prévisions de marée locales et la météo.'],answer:2,explain:'La phase seule ne donne ni l’heure ni la hauteur de la marée sur une plage. Les fonds, les côtes et les rythmes locaux modifient la réponse de l’océan ; le vent et la pression changent aussi le niveau réel de la mer.'}
];
const quiz={index:0,score:0,answered:false,finished:false,started:false,answers:[]};
function quizProgress(count){
  $('quiz-bar').style.width=`${count/QUESTIONS.length*100}%`;
  $('quiz-progress-track').setAttribute('aria-valuenow',String(count));
  $('quiz-progress-track').setAttribute('aria-valuetext',`${count} réponse${count>1?'s':''} sur ${QUESTIONS.length}`);
}
function focusQuizQuestion(){ $('quiz-question').focus({preventScroll:true}); }
function startQuiz(){
  Object.assign(quiz,{index:0,score:0,answered:false,finished:false,started:true,answers:[]});
  $('quiz-welcome').hidden=true;$('quiz-results').hidden=true;$('quiz-stage').hidden=false;
  $('quiz-restart').hidden=false;renderQuestion();focusQuizQuestion();
}
function renderQuestion(){
  const question=QUESTIONS[quiz.index];quiz.answered=false;
  $('quiz-progress').textContent=`QUESTION ${String(quiz.index+1).padStart(2,'0')} / ${String(QUESTIONS.length).padStart(2,'0')}`;
  $('quiz-topic').textContent=QUIZ_TOPICS[question.topic].label;
  $('quiz-score').textContent=`${quiz.score} / ${QUESTIONS.length} point${quiz.score>1?'s':''}`;
  quizProgress(quiz.index);
  $('quiz-question').textContent=question.q;
  $('quiz-options').replaceChildren();$('quiz-feedback').textContent='';$('quiz-next').hidden=true;
  question.options.forEach((option,index)=>{
    const button=document.createElement('button');button.type='button';button.className='quiz-option';
    const letter=document.createElement('span');letter.textContent=String.fromCharCode(65+index);letter.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.textContent=option;text.className='quiz-option-text';
    button.append(letter,text);button.addEventListener('click',()=>answerQuestion(index));$('quiz-options').append(button);
  });
}
function answerQuestion(index){
  if(!quiz.started||quiz.answered||quiz.finished||!Number.isInteger(index)||index<0||index>=QUESTIONS[quiz.index].options.length)return;
  quiz.answered=true;
  const question=QUESTIONS[quiz.index],correct=index===question.answer;
  quiz.answers.push({chosen:index,correct});if(correct)quiz.score++;
  [...$('quiz-options').children].forEach((button,i)=>{
    button.disabled=true;
    if(i===question.answer){button.classList.add('correct');const badge=document.createElement('span');badge.className='answer-badge';badge.textContent='✓ Bonne réponse';button.append(badge);}
    else if(i===index){button.classList.add('incorrect');const badge=document.createElement('span');badge.className='answer-badge';badge.textContent='✕ Votre réponse';button.append(badge);}
  });
  $('quiz-feedback').textContent=`${correct?'Bien vu !':'À retenir :'} ${question.explain}`;
  $('quiz-score').textContent=`${quiz.score} / ${QUESTIONS.length} point${quiz.score>1?'s':''}`;
  quizProgress(quiz.index+1);
  $('quiz-next').textContent=quiz.index===QUESTIONS.length-1?'Découvrir mon bilan →':'Question suivante →';
  $('quiz-next').hidden=false;$('quiz-next').focus({preventScroll:true});
}
function showQuizResults(){
  quiz.finished=true;$('quiz-stage').hidden=true;$('quiz-results').hidden=false;
  $('quiz-result-score').textContent=`${quiz.score} / ${QUESTIONS.length}`;
  $('quiz-result-message').textContent=quiz.score===QUESTIONS.length?'Tout juste ! Tu relies maintenant les phases, les éclipses, les horaires et les marées.':quiz.score>=QUESTIONS.length/2?'De bons repères ! Consulte tes corrections pour éclaircir les points qui restent.':'Chaque réponse est une occasion d’apprendre. Reprends les thèmes ci-dessous, puis réessaie à ton rythme.';
  $('quiz-theme-results').replaceChildren();
  Object.entries(QUIZ_TOPICS).forEach(([key,topic])=>{
    const indices=QUESTIONS.map((q,i)=>q.topic===key?i:-1).filter(i=>i>=0);
    const points=indices.filter(i=>quiz.answers[i].correct).length;
    const button=document.createElement('button');button.type='button';button.className='quiz-theme-result';
    const label=document.createElement('strong');label.textContent=topic.label;
    const score=document.createElement('span');score.textContent=`${points} / ${indices.length} · Revoir le cours ↗`;
    button.append(label,score);button.addEventListener('click',()=>selectTab(topic.panel,{updateHash:true,focusPanel:true}));
    $('quiz-theme-results').append(button);
  });
  $('quiz-review').replaceChildren();
  QUESTIONS.forEach((question,i)=>{
    const result=quiz.answers[i],details=document.createElement('details');
    const summary=document.createElement('summary');summary.textContent=`${result.correct?'✓':'✕'} ${i+1}. ${question.q}`;
    const chosen=document.createElement('p');chosen.textContent=`Ta réponse : ${question.options[result.chosen]}`;
    const answer=document.createElement('p');answer.textContent=`Bonne réponse : ${question.options[question.answer]}`;
    const explanation=document.createElement('p');explanation.textContent=question.explain;
    details.append(summary,chosen,answer,explanation);$('quiz-review').append(details);
  });
  $('quiz-result-title').focus({preventScroll:true});
}
$('quiz-start').addEventListener('click',startQuiz);
$('quiz-restart').addEventListener('click',startQuiz);
$('quiz-retry').addEventListener('click',startQuiz);
$('quiz-next').addEventListener('click',()=>{
  if(!quiz.answered||quiz.finished)return;
  if(quiz.index===QUESTIONS.length-1){showQuizResults();return;}
  quiz.index++;renderQuestion();focusQuizQuestion();
});
createPhaseCards();setDay(state.day,false);

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
