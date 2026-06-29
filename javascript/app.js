let toWatch=[],watchedList=[],skippedList=[];
let dirty=false,activeCat="all",activeView="all",searchQ="";
const SM={tv:"TV shows",movie:"Movies","anime-movie":"Anime films","anime-tv":"Anime TV shows","animated-tv":"Animated TV shows"};
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

let saveTimer=null;
function setDirty(){dirty=true;document.getElementById("dirty").classList.add("show");scheduleSave()}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(autoSave,400)}
async function autoSave(){
  try{
    await Promise.all([
      putJSON("to-watch.json",toWatch),
      putJSON("watched.json",watchedList),
      putJSON("skipped.json",skippedList)
    ]);
    dirty=false;document.getElementById("dirty").classList.remove("show");
    toast("Saved ✓");
  }catch(e){
    console.error(e);
    toast("Couldn't auto-save — is the server running? Use “Save changes” to download.");
  }
}

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

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

function infoUrl(item){
  if(item.mal) return "https://myanimelist.net/anime/"+item.mal;
  if(item.imdb) return "https://www.imdb.com/title/"+item.imdb+"/";
  return "https://www.imdb.com/find/?q="+encodeURIComponent(item.title+" "+item.year)+"&s=tt";
}
function infoSite(item){return item.mal?"MAL":"IMDb"}
function shareText(item){
  return item.title+" ("+item.year+") — "+infoSite(item)+" "+item.rating.toFixed(1)+"\n"+infoUrl(item);
}
function fallbackCopy(text,cb){
  const ta=document.createElement("textarea");
  ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
  document.body.appendChild(ta);ta.focus();ta.select();
  let ok=false;try{ok=document.execCommand("copy");}catch(e){}
  document.body.removeChild(ta);
  ok?cb():toast("Copy failed — select and copy manually");
}
function doCopy(text,label){
  const done=()=>toast(label);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));
  }else fallbackCopy(text,done);
}
window.copyShare=function(id){
  const item=allItems().find(x=>x.id===id);if(!item)return;
  doCopy(shareText(item),"Copied “"+item.title+"” — paste to share");
};
window.copyTitle=function(id){
  const item=allItems().find(x=>x.id===id);if(!item)return;
  doCopy(item.title,"Copied title: "+item.title);
};

function renderCard(item,listType){
  const isW=listType==="watched";
  const isSk=listType==="skipped";
  const cls=isW?"card w":isSk?"card sk":"card";
  let statusBtns="";
  if(listType==="towatch"){
    statusBtns=`<button class="act-w" title="Mark watched" onclick="markWatched('${item.id}')">✓ Watched</button>
      <button class="act-s" title="Skip" onclick="skip('${item.id}')">Skip</button>`;
  }else if(isW){
    statusBtns=`<button class="act-u" title="Move back to watchlist" onclick="unwatch('${item.id}')">↺ Unwatch</button>`;
  }else if(isSk){
    statusBtns=`<button class="act-r" title="Restore to watchlist" onclick="restore('${item.id}')">Restore</button>`;
  }
  const site=infoSite(item);
  const utilBtns=`<a class="act-open" href="${esc(infoUrl(item))}" target="_blank" rel="noopener noreferrer" title="Open full info on ${site}">${site} ↗</a>`+
    `<button class="act-copy" title="Copy title + link to share" onclick="copyShare('${item.id}')">Copy</button>`;
  const flag=isW?`<div class="flag flag-w">✓ Watched</div>`:isSk?`<div class="flag flag-s">Skipped</div>`:"";
  return `<div class="${cls}">
    <div class="pw">
      <img class="poster" src="${esc(item.poster||"")}" alt="${esc(item.title)}" loading="lazy" onerror="this.classList.add('noimg')">
      <span class="rt ${rc(item.rating)}">${item.rating.toFixed(1)}</span>
      <span class="yr">${item.year}</span>
      ${flag}
      <div class="ov"><div class="ov-row">${statusBtns}</div><div class="ov-row">${utilBtns}</div></div>
    </div>
    <div class="ci">
      <div class="ct"><span class="ctt" title="${esc(item.title)}">${esc(item.title)}</span><button class="ct-copy" title="Copy title" aria-label="Copy title" onclick="copyTitle('${item.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>
      <div class="cs"><span class="cm">${esc(item.meta)}</span></div>
    </div>
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

  // Watched entries always sink to the end; within each group, sort by rating desc.
  source.sort((a,b)=>{
    const aw=a.type==="watched"?1:0,bw=b.type==="watched"?1:0;
    return aw-bw||b.item.rating-a.item.rating;
  });

  const cats=activeCat==="all"?["tv","movie","anime-movie","anime-tv","animated-tv"]:[activeCat];
  const TIERS=[{cls:"elite",label:"★ 9.0 & above",test:r=>r>=9},{cls:"below",label:"Below 9.0",test:r=>r<9}];
  let html="";
  for(const tier of TIERS){
    const tierItems=source.filter(x=>tier.test(x.item.rating));
    if(!tierItems.length)continue;
    html+=`<div class="sec ${tier.cls}">${tier.label}<span class="b">${tierItems.length}</span></div>`;
    for(const sec of cats){
      const secItems=tierItems.filter(x=>x.item.category===sec);
      if(!secItems.length)continue;
      if(activeCat==="all")html+=`<div class="subsec">${SM[sec]}<span class="b2">${secItems.length}</span></div>`;
      html+=`<div class="grid">`;
      secItems.forEach(x=>{html+=renderCard(x.item,x.type)});
      html+=`</div>`;
    }
  }
  if(!html)html=`<div class="empty">${activeView==="skipped"?"No skipped entries":"No entries match"}</div>`;
  document.getElementById("list").innerHTML=html;
}

document.querySelectorAll(".fb").forEach(b=>{b.addEventListener("click",()=>{activeCat=b.dataset.cat;document.querySelectorAll(".fb").forEach(x=>x.classList.toggle("on",x===b));render()})});
document.querySelectorAll(".vb").forEach(b=>{b.addEventListener("click",()=>{activeView=b.dataset.view;document.querySelectorAll(".vb").forEach(x=>x.classList.toggle("on",x===b));render()})});
document.getElementById("search").addEventListener("input",e=>{searchQ=e.target.value;render()});
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
init();
