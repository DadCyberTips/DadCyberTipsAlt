(function(){
  const $=id=>document.getElementById(id),menu=$('start-menu'),btn=$('start-button');
  const setOpen=o=>{menu.classList.toggle('open',o);btn.classList.toggle('active',o);};
  const toggle=()=>setOpen(!menu.classList.contains('open'));
  window.closeStartMenu=()=>setOpen(false);

  btn.addEventListener('pointerdown',e=>{e.stopPropagation();toggle();});
  btn.addEventListener('click',e=>{if(e.detail===0)toggle();});
  $('search-button').addEventListener('pointerdown',e=>{e.stopPropagation();setOpen(true);menu.querySelector('input').focus();});
  menu.addEventListener('click',e=>{
    const t=e.target.closest('[data-app]');
    if(t){setOpen(false);launchApp(t.dataset.app);}
  });

  const icons=[...document.querySelectorAll('.desktop-icon')];
  const select=ic=>{icons.forEach(i=>i.classList.toggle('sel',i===ic));};
  let lastIc=null,lastT=0;
  icons.forEach(ic=>{
    ic.addEventListener('pointerdown',e=>{
      e.stopPropagation();select(ic);setOpen(false);
      const t=performance.now();
      if(lastIc===ic&&t-lastT<450){lastIc=null;launchApp(ic.dataset.app);}
      else{lastIc=ic;lastT=t;}
    });
    ic.addEventListener('keydown',e=>{if(e.key==='Enter')launchApp(ic.dataset.app);});
  });

  document.addEventListener('pointerdown',e=>{
    if(!menu.contains(e.target)&&!btn.contains(e.target))setOpen(false);
    if(!e.target.closest('.desktop-icon'))select(null);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
})();
