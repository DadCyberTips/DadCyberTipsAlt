function delay(ms){return new Promise(r=>setTimeout(r,ms));}
async function bootSequence(){
  const boot=document.getElementById('boot-screen'),desktop=document.getElementById('desktop');
  let skip=false;
  ['pointerdown','keydown'].forEach(e=>window.addEventListener(e,()=>{skip=true;},{once:true}));
  for(let i=0;i<14&&!skip;i++)await delay(100);
  desktop.style.display='block';
  boot.classList.add('fade-out');
  await delay(250);
  boot.style.display='none';
  document.addEventListener('contextmenu',e=>e.preventDefault());
}
