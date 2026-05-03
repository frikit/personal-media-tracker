let toWatch=[],watchedList=[],skippedList=[];
let dirty=false,activeCat="all",activeView="all",searchQ="";
const SM={tv:"TV shows",movie:"Movies","anime-movie":"Anime films","anime-tv":"Anime TV shows"};
const TR=[{min:9,l:"9.0+ — Elite"},{min:8.7,l:"8.7–8.9 — Outstanding"},{min:8.5,l:"8.5–8.6 — Excellent"},{min:8.1,l:"8.1–8.4 — Great"}];

async function init(){
  try{
    const [tw,w,s]=await Promise.all([
      fetch("to-watch.json").then(r=>r.json()),
      fetch("watched.json").then(r=>r.json()),
      fetch("skipped.json").then(r=>r.json())
    ]);
    toWatch=tw; watchedList=w; skippedList=s;
    render();
  }catch(e){
    document.getElementById("list").innerHTML=`<div class="err">Failed to load JSON files. Make sure <code>to-watch.json</code>, <code>watched.json</code>, and <code>skipped.json</code> are in the same directory.<br><br><small>${e.message}</small></div>`;
  }
}

function allItems(){return[...toWatch,...watchedList,...skippedList]}
function findAndRemove(id){
  let item;
  let i=toWatch.findIndex(x=>x.id===id);if(i>=0){item=toWatch.splice(i,1)[0];return item}
  i=watchedList.findIndex(x=>x.id===id);if(i>=0){item=watchedList.splice(i,1)[0];return item}
  i=skippedList.findIndex(x=>x.id===id);if(i>=0){item=skippedList.splice(i,1)[0];return item}
  return null;
}

function markWatched(id){
  const item=findAndRemove(id);if(!item)return;
  watchedList.push(item);
  watchedList.sort((a,b)=>b.rating-a.rating);
  setDirty();render();
}
function unwatch(id){
  const item=findAndRemove(id);if(!item)return;
  toWatch.push(item);
  toWatch.sort((a,b)=>b.rating-a.rating);
  setDirty();render();
}
function skip(id){
  const item=findAndRemove(id);if(!item)return;
  skippedList.push(item);
  skippedList.sort((a,b)=>b.rating-a.rating);
  setDirty();render();
}
function restore(id){
  const item=findAndRemove(id);if(!item)return;
  toWatch.push(item);
  toWatch.sort((a,b)=>b.rating-a.rating);
  setDirty();render();
}

function setDirty(){dirty=true;document.getElementById("dirty").classList.add("show")}

function downloadJSON(data,filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.style.display="none";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1000);
}
async function putJSON(filename,data){
  const r=await fetch("/"+filename,{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data,null,2)
  });
  if(!r.ok)throw new Error(`${filename}: ${r.status} ${await r.text()}`);
}

async function saveAll(){
  try{
    await Promise.all([
      putJSON("to-watch.json",toWatch),
      putJSON("watched.json",watchedList),
      putJSON("skipped.json",skippedList)
    ]);
    dirty=false;document.getElementById("dirty").classList.remove("show");
    toast("Saved.");
  }catch(e){
    console.error(e);
    toast("Save failed — falling back to downloads. Is the server running?");
    saveAllAsDownload();
  }
}

function saveAllAsDownload(){
  downloadJSON(toWatch,"to-watch.json");
  setTimeout(()=>downloadJSON(watchedList,"watched.json"),600);
  setTimeout(()=>downloadJSON(skippedList,"skipped.json"),1200);
  dirty=false;document.getElementById("dirty").classList.remove("show");
  toast("Downloaded 3 JSON files — move them to the repo and commit.");
}
function resetAll(){
  if(!confirm("Reset all progress? This moves everything back to to-watch."))return;
  toWatch=[...allItems()].sort((a,b)=>b.rating-a.rating);
  watchedList=[];skippedList=[];
  setDirty();render();toast("Progress reset");
}

function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000)}

function getTier(r){for(const t of TR)if(r>=t.min)return t.l;return"Other"}
function rc(r){return r>=9?"re":r>=8.5?"rg":"rb"}

const pp=document.getElementById("poster"),pimg=document.getElementById("pimg"),ptitle=document.getElementById("ptitle");
let ht=null;
window._showP=function(e,id){
  clearTimeout(ht);
  const item=allItems().find(x=>x.id===id);if(!item)return;
  ht=setTimeout(()=>{
    pimg.src=item.poster||"";
    ptitle.textContent=item.title+" ("+item.year+")";
    pp.classList.add("vis");posP(e);
  },300);
};
window._moveP=function(e){posP(e)};
window._hideP=function(){clearTimeout(ht);pp.classList.remove("vis")};
function posP(e){
  let x=e.clientX+20,y=e.clientY-60;
  if(x+160>window.innerWidth)x=e.clientX-180;
  if(y+280>window.innerHeight)y=window.innerHeight-290;
  if(y<10)y=10;
  pp.style.left=x+"px";pp.style.top=y+"px";
}

function renderRow(item,listType){
  const isW=listType==="watched";
  const isSk=listType==="skipped";
  const cls=isW?"item w":isSk?"item ig":"item";
  let actions="";
  if(listType==="towatch"){
    actions=`<button class="cb" onclick="event.stopPropagation();markWatched('${item.id}')"><svg viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    actions+=`<button class="sb" onclick="event.stopPropagation();skip('${item.id}')">Skip</button>`;
  }else if(isW){
    actions=`<div class="cb" onclick="event.stopPropagation();unwatch('${item.id}')" style="background:var(--green);border-color:var(--green)"><svg viewBox="0 0 14 14" fill="none" style="opacity:1"><path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  }else if(isSk){
    actions=`<button class="rb2" onclick="event.stopPropagation();restore('${item.id}')">Restore</button>`;
  }
  return `<div class="${cls}" onmouseenter="_showP(event,'${item.id}')" onmousemove="_moveP(event)" onmouseleave="_hideP()">
  ${actions}
  <span class="rt ${rc(item.rating)}">${item.rating.toFixed(1)}</span>
  <span class="tt">${item.title}</span>
  <span class="yp">${item.year}</span>
  <span class="mt">${item.meta}</span>
  </div>`;
}

function render(){
  const all=allItems();
  const activeCount=toWatch.length+watchedList.length;
  const wc=watchedList.length;
  document.getElementById("s-total").textContent=all.length;
  document.getElementById("s-watched").textContent=wc;
  document.getElementById("s-remain").textContent=toWatch.length;
  document.getElementById("s-skip").textContent=skippedList.length;
  const pct=activeCount?Math.round(wc/activeCount*100):0;
  document.getElementById("s-pct").textContent=pct+"%";
  document.getElementById("pf").style.width=pct+"%";

  let source;
  if(activeView==="watched")source=watchedList.map(i=>({item:i,type:"watched"}));
  else if(activeView==="skipped")source=skippedList.map(i=>({item:i,type:"skipped"}));
  else if(activeView==="unwatched")source=toWatch.map(i=>({item:i,type:"towatch"}));
  else source=[...toWatch.map(i=>({item:i,type:"towatch"})),...watchedList.map(i=>({item:i,type:"watched"}))];

  if(activeCat!=="all")source=source.filter(x=>x.item.category===activeCat);
  if(searchQ){const q=searchQ.toLowerCase();source=source.filter(x=>x.item.title.toLowerCase().includes(q)||x.item.meta.toLowerCase().includes(q))}

  source.sort((a,b)=>b.item.rating-a.item.rating);

  const secs=activeCat==="all"?["tv","movie","anime-movie","anime-tv"]:[activeCat];
  let html="";
  for(const sec of secs){
    const secItems=source.filter(x=>x.item.category===sec);
    if(!secItems.length)continue;
    html+=`<div class="sec">${SM[sec]}<span class="b">${secItems.length}</span></div>`;
    if(activeView!=="skipped"){
      const tiers={};secItems.forEach(x=>{const t=getTier(x.item.rating);if(!tiers[t])tiers[t]=[];tiers[t].push(x)});
      for(const tr of TR){const g=tiers[tr.l];if(!g)continue;html+=`<div class="tier">${tr.l}</div>`;g.forEach(x=>{html+=renderRow(x.item,x.type)})}
    }else{
      secItems.forEach(x=>{html+=renderRow(x.item,x.type)});
    }
  }
  if(!html)html=`<div style="text-align:center;padding:3rem;color:var(--text-dim)">${activeView==="skipped"?"No skipped entries":"No entries match"}</div>`;
  document.getElementById("list").innerHTML=html;
}

document.querySelectorAll(".fb").forEach(b=>{b.addEventListener("click",()=>{activeCat=b.dataset.cat;document.querySelectorAll(".fb").forEach(x=>x.classList.toggle("on",x===b));render()})});
document.querySelectorAll(".vb").forEach(b=>{b.addEventListener("click",()=>{activeView=b.dataset.view;document.querySelectorAll(".vb").forEach(x=>x.classList.toggle("on",x===b));render()})});
document.getElementById("search").addEventListener("input",e=>{searchQ=e.target.value;render()});
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
init();
