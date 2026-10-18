import { generateArtwork, artworkToSVG } from "./generator.js";
const $ = selector => document.querySelector(selector);
const canvas = $("#art-canvas"), ctx = canvas.getContext("2d");
const state = {style:"landscape",palette:"dusk",density:6,variation:68,seed:"GEOMETRY-01"};
let artwork;
function render() {
  state.density=Number($("#density").value); state.variation=Number($("#variation").value);
  state.seed=($("#seed").value.trim()||"LOWPOLY").slice(0,32); $("#seed").value=state.seed;
  $("#density-value").value=({3:"Low",4:"Low",5:"Medium",6:"Medium",7:"High",8:"High",9:"Ultra",10:"Ultra",11:"Ultra"})[state.density]||"Medium";
  $("#variation-value").value=`${state.variation}%`; $("#preview-title").textContent=`UNTITLED ${state.style.toUpperCase()}`; $("#art-seed").textContent=`SEED: ${state.seed.toUpperCase()}`;
  artwork=generateArtwork(state); canvas.width=artwork.width; canvas.height=artwork.height;
  ctx.fillStyle=artwork.palette[0];ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const face of artwork.faces){ctx.beginPath();ctx.moveTo(face.points[0].x,face.points[0].y);for(let i=1;i<face.points.length;i++)ctx.lineTo(face.points[i].x,face.points[i].y);ctx.closePath();ctx.fillStyle=face.color;ctx.fill();}
  $("#triangle-count").textContent=`${artwork.faces.length.toLocaleString()} triangles　/　LIVE PREVIEW`;
  $("#status").textContent=`Generated ${artwork.faces.length.toLocaleString()} triangles. Ready to export.`;
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);}
function filename(){return state.seed.toLowerCase().replace(/[^a-z0-9-_]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"lowpoly-art";}
function selectButtons(selector,attribute,value,activeClass){document.querySelectorAll(selector).forEach(button=>{const active=button.dataset[attribute]===value;button.classList.toggle(activeClass,active);button.setAttribute("aria-pressed",String(active));});}
document.querySelectorAll("[data-style]").forEach(button=>button.addEventListener("click",()=>{state.style=button.dataset.style;selectButtons("[data-style]","style",state.style,"active");render();}));
document.querySelectorAll("[data-palette]").forEach(button=>button.addEventListener("click",()=>{state.palette=button.dataset.palette;selectButtons("[data-palette]","palette",state.palette,"active");render();}));
$("#density").addEventListener("input",render);$("#variation").addEventListener("input",render);$("#seed").addEventListener("change",render);$("#seed").addEventListener("keydown",e=>{if(e.key==="Enter")render();});$("#generate").addEventListener("click",render);
$("#new-seed").addEventListener("click",()=>{$("#seed").value=`LP-${Math.random().toString(36).slice(2,10).toUpperCase()}`;render();});
$("#surprise").addEventListener("click",()=>{state.style=["landscape","abstract","gradient"][Math.floor(Math.random()*3)];state.palette=["dusk","forest","candy","ocean","mono","ember"][Math.floor(Math.random()*6)];$("#density").value=4+Math.floor(Math.random()*7);$("#variation").value=Math.floor(Math.random()*101);$("#seed").value=`SURPRISE-${Math.random().toString(36).slice(2,8).toUpperCase()}`;selectButtons("[data-style]","style",state.style,"active");selectButtons("[data-palette]","palette",state.palette,"active");render();});
$("#export-svg").addEventListener("click",()=>{download(new Blob([artworkToSVG(artwork)],{type:"image/svg+xml;charset=utf-8"}),`${filename()}.svg`);$("#status").textContent="SVG exported — infinitely scalable.";});
$("#export-png").addEventListener("click",()=>{const out=document.createElement("canvas");out.width=artwork.width*2;out.height=artwork.height*2;const c=out.getContext("2d");c.scale(2,2);c.fillStyle=artwork.palette[0];c.fillRect(0,0,artwork.width,artwork.height);for(const face of artwork.faces){c.beginPath();c.moveTo(face.points[0].x,face.points[0].y);for(let i=1;i<face.points.length;i++)c.lineTo(face.points[i].x,face.points[i].y);c.closePath();c.fillStyle=face.color;c.fill();}out.toBlob(blob=>{if(blob)download(blob,`${filename()}@2x.png`);else $("#status").textContent="PNG export failed. Try SVG instead.";},"image/png");});
window.addEventListener("keydown",e=>{if(e.key==="Enter"&&!['INPUT','BUTTON'].includes(document.activeElement?.tagName))render();});render();
