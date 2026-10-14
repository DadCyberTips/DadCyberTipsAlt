const CAPTION={
  min:'<svg viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor"/></svg>',
  max:'<svg viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" fill="none" stroke="currentColor"/></svg>',
  close:'<svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor"/></svg>'
};

class WindowManager{
  constructor(){this.n=0;this.wins=new Map();this.order=[];}

  createWindow(o){
    const id=o.key||'window-'+(++this.n);
    if(this.wins.has(id)){this.restore(id);return this.wins.get(id).el;}
    const icon=o.icon||'doc',el=document.createElement('div');
    el.className='window';el.id=id;
    el.innerHTML=`<div class="title-bar"><svg class="icon"><use href="#i-${icon}"/></svg><span class="title"></span><div class="controls"><button class="minimize" title="Minimize">${CAPTION.min}</button><button class="maximize" title="Maximize">${CAPTION.max}</button><button class="close" title="Close">${CAPTION.close}</button></div></div><div class="content"></div>`;
    el.querySelector('.title').textContent=o.title||'Window';
    const c=el.querySelector('.content');
    if(o.node)c.appendChild(o.node);else c.innerHTML=o.content||'';

    const k=this.wins.size%6*28,W=Math.min(o.width||600,innerWidth-16),H=Math.min(o.height||400,innerHeight-64);
    Object.assign(el.style,{
      width:W+'px',height:H+'px',
      left:Math.max(0,Math.min(o.left??80+k,innerWidth-W))+'px',
      top:Math.max(0,Math.min(o.top??50+k,innerHeight-H-48))+'px'
    });

    const btn=document.createElement('button');
    btn.className='tb-btn taskbar-app';btn.title=o.title||'';
    btn.innerHTML=`<svg><use href="#i-${icon}"/></svg>`;
    btn.addEventListener('click',()=>{
      const w=this.wins.get(id);
      if(w.min)this.restore(id);
      else if(this.order[this.order.length-1]===id)this.minimize(id);
      else this.focus(id);
    });
    document.getElementById('taskbar-apps').appendChild(btn);
    this.wins.set(id,{id,el,btn,min:false});

    el.addEventListener('pointerdown',()=>this.focus(id));
    el.querySelector('.minimize').onclick=()=>this.minimize(id);
    el.querySelector('.maximize').onclick=()=>this.toggleMaximize(el);
    el.querySelector('.close').onclick=()=>this.closeWindow(id);
    const bar=el.querySelector('.title-bar');
    bar.addEventListener('dblclick',e=>{if(!e.target.closest('.controls'))this.toggleMaximize(el);});
    this.makeDraggable(el,bar);

    document.body.appendChild(el);
    this.focus(id);
    return el;
  }

  topVisible(){return this.order.filter(x=>!this.wins.get(x).min).pop();}

  focus(id){
    if(!this.wins.has(id))return;
    this.order=this.order.filter(x=>x!==id);this.order.push(id);
    this.order.forEach((x,i)=>{
      const w=this.wins.get(x),a=x===id;
      w.el.style.zIndex=100+i;
      w.el.classList.toggle('active',a);
      w.btn.classList.toggle('active',a);
    });
  }

  minimize(id){
    const w=this.wins.get(id);if(!w)return;
    w.min=true;w.el.classList.add('min');w.el.classList.remove('active');w.btn.classList.remove('active');
    this.order=this.order.filter(x=>x!==id);this.order.unshift(id);
    const t=this.topVisible();if(t)this.focus(t);
  }

  restore(id){
    const w=this.wins.get(id);if(!w)return;
    w.min=false;w.el.classList.remove('min');this.focus(id);
  }

  toggleMaximize(el){el.classList.toggle('max');}

  closeWindow(id){
    const w=this.wins.get(id);if(!w)return;
    w.el.remove();w.btn.remove();this.wins.delete(id);
    this.order=this.order.filter(x=>x!==id);
    const t=this.topVisible();if(t)this.focus(t);
  }

  makeDraggable(el,bar){
    bar.addEventListener('pointerdown',e=>{
      if(e.target.closest('.controls')||el.classList.contains('max'))return;
      const sx=e.clientX-el.offsetLeft,sy=e.clientY-el.offsetTop;
      bar.setPointerCapture(e.pointerId);
      const move=ev=>{
        el.style.left=Math.max(80-el.offsetWidth,Math.min(innerWidth-80,ev.clientX-sx))+'px';
        el.style.top=Math.max(0,Math.min(innerHeight-88,ev.clientY-sy))+'px';
      };
      const up=()=>{bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',up);bar.removeEventListener('pointercancel',up);};
      bar.addEventListener('pointermove',move);
      bar.addEventListener('pointerup',up);
      bar.addEventListener('pointercancel',up);
    });
  }

  openDocumentWindow(text){
    const n=document.createElement('div');
    n.innerHTML='<div class="menubar"><span>File</span><span>Edit</span><span>View</span></div><div class="doc-content"></div>';
    n.querySelector('.doc-content').textContent=text;
    return this.createWindow({key:'doc',title:'Documents.txt',icon:'doc',node:n,width:700,height:500,top:90,left:140});
  }

  openSettingsWindow(){
    let b=0;
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);b+=k.length+localStorage.getItem(k).length;}
    const done=localStorage.getItem('updatesComplete')==='true';
    return this.createWindow({key:'settings',title:'Settings',icon:'gear',width:500,height:400,top:130,left:200,content:`
      <div class="settings-content">
        <div class="settings-item"><h4>💾 Storage</h4><p>Local storage usage: ${(b/1024).toFixed(1)} KB used</p></div>
        <div class="settings-item"><h4>🖼️ Appearance</h4><p>Theme: Light</p></div>
        <div class="settings-item"><h4>🔄 Windows Update</h4><p>Status: ${done?'Up to date':'Updates pending'}</p></div>
        <div class="settings-item"><h4>ℹ️ Version</h4><p>Web Desktop Simulator v1.1.0</p></div>
      </div>`});
  }
}

const windowManager=new WindowManager();

window.openSettings=()=>windowManager.openSettingsWindow();
window.showAbout=()=>document.getElementById('about-modal').classList.remove('hidden');
window.closeAbout=()=>document.getElementById('about-modal').classList.add('hidden');
window.launchApp=a=>{
  if(a==='doc')window.openDocument();
  else if(a==='settings')window.openSettings();
  else if(a==='about')window.showAbout();
};
window.fakeShutdown=function(){
  const s=document.createElement('div');
  s.className='shutdown-screen';s.style.display='flex';s.innerHTML='<p>Shutting down...</p>';
  document.body.appendChild(s);
  setTimeout(()=>location.reload(),1500);
};
