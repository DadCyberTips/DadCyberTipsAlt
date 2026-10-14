(function(){
  const $=id=>document.getElementById(id),menu=$('start-menu'),btn=$('start-button');
  const setOpen=o=>{menu.classList.toggle('open',o);btn.classList.toggle('active',o);};
  const toggle=()=>setOpen(!menu.classList.contains('open'));
  window.closeStartMenu=()=>setOpen(false);

  btn.addEventListener('pointerdown',e=>{e.stopPropagation();toggle();});
  btn.addEventListener('click',e=>{if(e.detail===0)toggle();});
  menu.addEventListener('click',e=>{
    const t=e.target.closest('[data-app]');
    if(t){setOpen(false);launchApp(t.dataset.app);}
  });

  const icons=[...document.querySelectorAll('.desktop-icon')];
  const select=ic=>{icons.forEach(i=>i.classList.toggle('sel',i===ic));};
  icons.forEach(ic=>{
    ic.addEventListener('pointerdown',e=>{e.stopPropagation();select(ic);setOpen(false);});
    ic.addEventListener('dblclick',()=>launchApp(ic.dataset.app));
    ic.addEventListener('click',e=>{if(e.pointerType==='touch')launchApp(ic.dataset.app);});
    ic.addEventListener('keydown',e=>{if(e.key==='Enter')launchApp(ic.dataset.app);});
  });

  document.addEventListener('pointerdown',e=>{
    if(!menu.contains(e.target)&&!btn.contains(e.target))setOpen(false);
    if(!e.target.closest('.desktop-icon'))select(null);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
})();
