(function(){
  const $=id=>document.getElementById(id);
  const qs=$('quick-settings'),slider=$('vol-slider'),val=$('vol-val');
  const tray=document.querySelector('.tray-icons'),tv=$('tray-vol'),tn=$('tray-net'),mute=$('qs-mute');
  let vol=50,muted=false;

  function update(){
    const lvl=muted||vol===0?0:vol<50?1:2;
    $('tray-vol-use').setAttribute('href','#i-vol-'+lvl);
    $('qs-vol-use').setAttribute('href','#i-vol-'+lvl);
    slider.value=vol;
    slider.style.setProperty('--p',vol+'%');
    val.textContent=vol;
    tv.title='Speakers: '+(muted?'Muted':vol+'%');
    mute.title=muted?'Unmute':'Mute';
  }
  function setVol(v){vol=Math.max(0,Math.min(100,Math.round(v)));if(vol>0)muted=false;update();}
  const setOpen=o=>{qs.classList.toggle('open',o);tray.classList.toggle('active',o);};
  const toggle=()=>setOpen(!qs.classList.contains('open'));

  [tv,tn].forEach(b=>{
    b.addEventListener('pointerdown',()=>{if(typeof closeStartMenu==='function')closeStartMenu();toggle();});
    b.addEventListener('click',e=>{if(e.detail===0)toggle();});
  });
  tv.addEventListener('wheel',e=>{e.preventDefault();setVol(vol+(e.deltaY<0?2:-2));},{passive:false});
  slider.addEventListener('input',()=>setVol(+slider.value));
  mute.addEventListener('click',()=>{muted=!muted;update();});

  // capture phase so clicks anywhere else (even where propagation is stopped) close the flyout
  document.addEventListener('pointerdown',e=>{
    if(!qs.contains(e.target)&&!tray.contains(e.target))setOpen(false);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});

  update();
})();
