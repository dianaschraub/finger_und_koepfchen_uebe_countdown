'use strict';
let goal=5,remaining=5;
let soundEnabled=true,audioContext,celebrationTimer;
const activeVoices=new Set();
const $=id=>document.getElementById(id);
function render(){
 $('goal-value').textContent=goal;
 $('count').textContent=remaining;
 $('count').setAttribute('aria-label',remaining===0?'Geschafft! Übeziel erreicht.':`Noch ${remaining} richtige Wiederholungen`);
 $('eyebrow').textContent=remaining===0?'GESCHAFFT!':'NOCH';
 $('caption').textContent=remaining===0?'Dein Übeziel ist erreicht.':remaining===1?'richtige Wiederholung':'richtige Wiederholungen';
 $('finish').textContent=remaining===0?'Gut gemacht!':'Einmal spielen. Dann antippen.';
 $('panel').classList.toggle('done',remaining===0);
 $('good').disabled=remaining===0;
 document.querySelectorAll('[data-goal]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.goal)===goal)));
}
function setGoal(value){if(!Number.isSafeInteger(value)||value<1)throw new Error('Bitte gib eine positive ganze Zahl ein.');stopCelebration();goal=value;remaining=value;$('error').textContent='';render();return {goal,remaining};}
function record(result){if(result!=='correct'&&result!=='mistake')throw new Error('Ungültiges Ergebnis');const before=remaining;if(result==='correct')remaining=Math.max(0,remaining-1);else if(remaining<Number.MAX_SAFE_INTEGER)remaining++;render();if(before>0&&remaining===0)celebrate();else if(remaining>0)stopCelebration();return {goal,remaining};}
$('good').addEventListener('click',()=>record('correct'));
$('mistake').addEventListener('click',()=>record('mistake'));
$('reset').addEventListener('click',()=>setGoal(goal));
document.querySelectorAll('[data-goal]').forEach(b=>b.addEventListener('click',()=>{setGoal(Number(b.dataset.goal));$('custom').value='';toggleSettings(false);}));
$('custom-form').addEventListener('submit',e=>{e.preventDefault();try{setGoal(Number($('custom').value));toggleSettings(false);}catch(err){$('error').textContent=err.message;}});
function toggleSettings(open){$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));if(!open)$('settings-toggle').focus();}
$('settings-toggle').addEventListener('click',()=>toggleSettings($('settings').hidden));
$('close-settings').addEventListener('click',()=>toggleSettings(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('settings').hidden)toggleSettings(false);});
document.addEventListener('click',e=>{if(!$('settings').hidden&&!$('settings').contains(e.target)&&!$('settings-toggle').contains(e.target))toggleSettings(false);});
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('sound').textContent=soundEnabled?'Ton an':'Ton aus';$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'Jubelton ausschalten':'Jubelton einschalten');if(!soundEnabled&&audioContext)audioContext.suspend().catch(()=>{});});
function stopCelebration(){clearTimeout(celebrationTimer);$('celebration').hidden=true;$('confetti').hidden=true;$('confetti').replaceChildren();for(const voice of activeVoices){try{voice.stop();}catch{}}activeVoices.clear();}
function updateConfettiWindow(){
 const number=$('count').getBoundingClientRect(),praise=$('finish').getBoundingClientRect();
 const left=Math.min(number.left,praise.left)-4,right=Math.max(number.right,praise.right)+4;
 const top=number.top-4,bottom=praise.bottom+4;
 for(const [key,value] of Object.entries({left,right,top,bottom}))$('confetti').style.setProperty('--clear-'+key,value+'px');
}
window.addEventListener('resize',()=>{if(remaining===0)updateConfettiWindow();});
window.addEventListener('scroll',()=>{if(remaining===0)updateConfettiWindow();},{passive:true});
function celebrate(){
 updateConfettiWindow();
 $('celebration').hidden=false;
 $('confetti').hidden=false;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced){const colors=['#f7c65b','#61d9c5','#ffffff','#c6b1ff','#fc9eaf'];for(let i=0;i<110;i++){const piece=document.createElement('i');piece.style.cssText=`left:${Math.random()*100}%;background:${colors[i%colors.length]};--delay:${Math.random()*1.3}s;--drift:${(Math.random()-.5)*160}px;--spin:${Math.random()*900}deg;`; $('confetti').appendChild(piece);}}
 celebrationTimer=setTimeout(stopCelebration,5500);
 if(soundEnabled)playJingle();
}
async function playJingle(){try{
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 audioContext??=new Audio();await audioContext.resume();if(!soundEnabled||remaining!==0)return;
 const start=audioContext.currentTime+.02;
 const master=audioContext.createGain();master.gain.value=.65;
 const compressor=audioContext.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=16;compressor.ratio.value=4;
 master.connect(compressor);compressor.connect(audioContext.destination);
 const score=[[0,67,.15],[.19,67,.15],[.38,67,.2],[.65,72,.32],[1.03,71,.16],[1.25,72,.85]];
 const chord=[[1.25,48,.95],[1.25,55,.95],[1.25,64,.95],[1.25,67,.95]];
 let voices=score.length+chord.length;
 for(const [offset,midi,duration] of [...score,...chord]){
  const osc=audioContext.createOscillator(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  osc.type='sawtooth';osc.frequency.value=440*2**((midi-69)/12);filter.type='lowpass';filter.frequency.value=1800;filter.Q.value=.5;
  osc.connect(filter);filter.connect(gain);gain.connect(master);
  const t=start+offset,level=midi>=71?.23:.15;
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.025);gain.gain.linearRampToValueAtTime(level*.7,t+.09);gain.gain.setValueAtTime(level*.7,t+duration);gain.gain.exponentialRampToValueAtTime(.001,t+duration+.22);
  activeVoices.add(osc);osc.start(t);osc.stop(t+duration+.25);
  osc.onended=()=>{activeVoices.delete(osc);osc.disconnect();filter.disconnect();gain.disconnect();if(--voices===0){master.disconnect();compressor.disconnect();}};
 }

 }catch{}
}
render();
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const specs=[{name:'set_practice_goal',description:'Set a positive integer starting goal and restart the visible counter.',inputSchema:{type:'object',properties:{goal:{type:'integer',minimum:1}},required:['goal'],additionalProperties:false},execute:input=>setGoal(input.goal)},{name:'record_practice_result',description:'Record a correct repetition (decrease remaining by one) or a mistake (increase by one).',inputSchema:{type:'object',properties:{result:{type:'string',enum:['correct','mistake']}},required:['result'],additionalProperties:false},execute:input=>record(input.result)}];
 for(const tool of specs){try{Promise.resolve(document.modelContext.registerTool({...tool,annotations:{readOnlyHint:false,untrustedContentHint:false}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
