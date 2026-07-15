const scenarios = {
  reporting: {label:'Weekly client reporting', result:'assist', decision:'Assist', note:'Automate preparation and first-pass synthesis; preserve account-team interpretation and client-specific judgment.', evidence:{outcome:['strong','Clear cycle-time and strategic-capacity benefit'],trust:['strong','Structured data and reviewable output'],reuse:['strong','Recurring across accounts with configurable KPIs'],proof:['develop','Instrument quality, rework, adoption, and time avoided']}},
  discovery: {label:'Publisher discovery', result:'productize', decision:'Productize', note:'The workflow has reusable data, recurring demand, and a natural place inside APVision - with human curation retained for fit and relationship context.', evidence:{outcome:['strong','Faster, broader partner opportunity discovery'],trust:['strong','Private warehouse and permissioned use'],reuse:['strong','Shared capability across programs and markets'],proof:['strong','Track qualified opportunities, activation, and account adoption']}},
  anomaly: {label:'Opportunity / risk review', result:'agentize', decision:'Agentize', note:'Let agents watch defined signals and assemble evidence; require a named human to accept, reject, or escalate the recommendation.', evidence:{outcome:['strong','Earlier attention on material opportunities and risks'],trust:['develop','Thresholds and explanation standards need calibration'],reuse:['strong','Common monitoring pattern with client-specific rules'],proof:['develop','Validate precision, false alarms, action rate, and outcome']}},
  briefing: {label:'Influencer / partner briefing', result:'human', decision:'Human-led', note:'Use AI for preparation and retrieval, but keep brand nuance, relationship judgment, and final recommendation visibly human-owned.', evidence:{outcome:['develop','Potential speed gain, but quality is highly contextual'],trust:['develop','Brand and relationship risk requires close review'],reuse:['weak','High variation by client, partner, and campaign'],proof:['develop','Pilot with explicit quality rubric before scale']}}
};
function applyScenario(key){
  const data=scenarios[key]; if(!data)return;
  document.querySelectorAll('.scenario').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.scenario===key)));
  const sheet=document.querySelector('.fold-sheet'); if(sheet) sheet.dataset.result=data.result;
  const chip=document.querySelector('.resolution-chip'); if(chip) chip.textContent=data.decision;
  const result=document.querySelector('.decision-result'); if(result) result.textContent=data.decision;
  const note=document.querySelector('.decision-note'); if(note) note.textContent=data.note;
  const title=document.querySelector('.scenario-title'); if(title) title.textContent=data.label;
  Object.entries(data.evidence).forEach(([id,[state,text]])=>{
    const el=document.querySelector(`[data-evidence="${id}"]`); if(!el)return;
    el.dataset.state=state; el.querySelector('strong').textContent=text;
  });
  const live=document.querySelector('#lab-live'); if(live) live.textContent=`${data.label}: disposition ${data.decision}. ${data.note}`;
}
document.querySelectorAll('.scenario').forEach(b=>b.addEventListener('click',()=>applyScenario(b.dataset.scenario)));
document.querySelector('.scenario-reset')?.addEventListener('click',()=>applyScenario('reporting'));
document.addEventListener('keydown',e=>{
  const active=document.activeElement;
  if(!active?.classList.contains('scenario'))return;
  const buttons=[...document.querySelectorAll('.scenario')]; let i=buttons.indexOf(active);
  if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();buttons[(i+1)%buttons.length].focus()}
  if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();buttons[(i-1+buttons.length)%buttons.length].focus()}
});
applyScenario('reporting');
