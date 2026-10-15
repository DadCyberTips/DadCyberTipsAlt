(function(){
  const $=id=>document.getElementById(id), A=window.EmuAudio;
  const qs=$('quick-settings'),slider=$('vol-slider'),val=$('vol-val');
  const tray=document.querySelector('.tray-icons'),tv=$('tray-vol'),tn=$('tray-net'),mute=$('qs-mute');

  // Refresh the volume UI from the shared state in EmuAudio
  function update(){
    const vol=A.vol,muted=A.muted,lvl=muted||vol===0?0:vol<50?1:2;
    $('tray-vol-use').setAttribute('href','#i-vol-'+lvl);
    $('qs-vol-use').setAttribute('href','#i-vol-'+lvl);
    slider.value=vol;
    slider.style.setProperty('--p',vol+'%');
    val.textContent=vol;
    tv.title='Speakers: '+(muted?'Muted':vol+'%');
    mute.title=muted?'Unmute':'Mute';
  }
  const setOpen=o=>{qs.classList.toggle('open',o);tray.classList.toggle('active',o);};
  const toggle=()=>setOpen(!qs.classList.contains('open'));

  [tv,tn].forEach(b=>{
    b.addEventListener('pointerdown',()=>{if(typeof closeStartMenu==='function')closeStartMenu();toggle();});
    b.addEventListener('click',e=>{if(e.detail===0)toggle();});
  });
  tv.addEventListener('wheel',e=>{e.preventDefault();A.set(A.vol+(e.deltaY<0?2:-2));},{passive:false});
  slider.addEventListener('input',()=>A.set(+slider.value));
  slider.addEventListener('change',()=>A.ding());   // chime on release, like Windows
  mute.addEventListener('click',()=>A.set(A.vol,!A.muted));
  window.addEventListener('emuvolume',update);

  // capture phase so clicks anywhere else (even where propagation is stopped) close the flyout
  document.addEventListener('pointerdown',e=>{
    if(!qs.contains(e.target)&&!tray.contains(e.target))setOpen(false);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});

  update();
})();
