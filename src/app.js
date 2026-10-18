import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { buildPromptModel, classifyPrompt, inspectMesh } from "./mesh-engine.js";
const $=s=>document.querySelector(s), viewport=$("#viewport");
const scene=new THREE.Scene();scene.background=new THREE.Color("#101723");scene.fog=new THREE.Fog("#101723",10,28);
const perspectiveCamera=new THREE.PerspectiveCamera(42,1,.1,100);perspectiveCamera.position.set(5.8,4.1,8.5);const orthographicCamera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);let camera=perspectiveCamera,cameraMode="perspective";
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setSize(viewport.clientWidth,viewport.clientHeight);renderer.domElement.setAttribute("aria-label","Interactive 3D model viewport");viewport.prepend(renderer.domElement);$("#viewport-loading").hidden=true;
scene.add(new THREE.HemisphereLight(0xdceeff,0x34404f,2));const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(5,8,6);scene.add(key);const fill=new THREE.DirectionalLight(0x91d8d0,1.1);fill.position.set(-6,3,-4);scene.add(fill);const rim=new THREE.DirectionalLight(0x8ab8ff,1.2);rim.position.set(0,2,-7);scene.add(rim);
const grid=new THREE.GridHelper(12,24,0x577184,0x263747);grid.position.y=-.015;scene.add(grid);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.target.set(0,1.55,0);controls.minDistance=2.2;controls.maxDistance=18;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let modelRoot=new THREE.Group(),selectedPart=null,currentMode="solid",showEdges=false,detail=1,vertexDots=null,edgeLines=[],recognition=null,listening=false;const parts=new Map();
let polyPizzaKey="", polyPizzaSearchSerial=0, activeAssetCredit="";
const gltfLoader=new GLTFLoader();
function mat(color=0xbfc9d4){return new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.06,flatShading:true});}
function addMesh(parent,geo,name,part,color=0xbfc9d4,pos=[0,0,0],rot=[0,0,0]){const m=new THREE.Mesh(geo,mat(color));m.name=name;m.userData.part=part;m.position.set(...pos);m.rotation.set(...rot);parent.add(m);if(!parts.has(part))parts.set(part,[]);parts.get(part).push(m);return m;}
function cyl(rt,rb,h,n){return new THREE.CylinderGeometry(rt,rb,h,n,1,false);}
function clearModel(){scene.remove(modelRoot);modelRoot.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});edgeLines.forEach(o=>{o.parent?.remove(o);o.geometry?.dispose();o.material?.dispose();});edgeLines=[];if(vertexDots){scene.remove(vertexDots);vertexDots.geometry.dispose();vertexDots.material.dispose();vertexDots=null;}modelRoot=new THREE.Group();modelRoot.name="Tabletop Fan";parts.clear();}
function bladeShape(length,width){const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(width*.25,length*.26,width*.38,length*.66);s.quadraticCurveTo(width*.42,length*.92,width*.12,length);s.quadraticCurveTo(-width*.02,length*.77,-width*.12,length*.49);s.quadraticCurveTo(-width*.32,length*.2,0,0);return s;}
function buildFan(){clearModel();const n=detail===0?6:detail===1?10:16,wide=window.fanBaseWide?1.3:1,tilt=window.fanTilt||0;
addMesh(modelRoot,cyl(.62*wide,.69*wide,.22,n),"Weighted base","Base",0x647789,[0,.11,0]);addMesh(modelRoot,cyl(.44*wide,.58*wide,.12,n),"Base trim","Base",0x8d9aa7,[0,.25,0]);addMesh(modelRoot,cyl(.13,.18,1.2,n),"Support column","Stand",0x9aa9b6,[0,.88,0]);addMesh(modelRoot,cyl(.22,.22,.12,n),"Neck collar","Stand",0x718596,[0,1.47,0]);
const head=new THREE.Group();head.name="Fan head";head.position.set(0,1.85,0);head.rotation.x=tilt;modelRoot.add(head);
addMesh(head,cyl(.48,.48,.27,n),"Motor housing","Motor",0x8b9aa9,[0,0,-.12],[Math.PI/2,0,0]);addMesh(head,new THREE.SphereGeometry(.16,n,8),"Front hub","Motor",0xb7c4cf,[0,0,.12]);
addMesh(head,new THREE.TorusGeometry(.83,.035,6,n*2),"Outer safety ring","Cage",0x9baab7,[0,0,.09]);addMesh(head,new THREE.TorusGeometry(.68,.018,5,n*2),"Inner safety ring","Cage",0x718394,[0,0,.1]);
for(let i=0;i<12;i++){const a=i*Math.PI/6,m=addMesh(head,cyl(.012,.012,.81,5),"Cage spoke","Cage",0x9eacb8,[Math.sin(a)*.405,Math.cos(a)*.405,.09]);m.rotation.z=-a;}
const count=window.fanBladeCount||3,geo=new THREE.ExtrudeGeometry(bladeShape(.62,.28),{depth:.055,bevelEnabled:false,curveSegments:1,steps:1});geo.translate(0,.1,0);
for(let i=0;i<count;i++){const b=addMesh(head,geo.clone(),"Blade "+(i+1),"Blades",0x758b9e,[0,0,.16]);b.rotation.z=i*Math.PI*2/count+.25;}
modelRoot.traverse(o=>{if(o.isMesh)o.geometry.computeVertexNormals();});scene.add(modelRoot);selectedPart=null;updateSelection();rebuildOverlays();updateStats();buildOutliner();controls.target.set(0,1.5,0);frameModel();window.currentModelType="fan";window.currentModelPrompt=$("#prompt")?.value||"Build me a tabletop fan with three blades.";const report=inspectMesh(modelRoot);$("#mesh-status").textContent=report.checksPassed?"Geometry checks passed":"Mesh needs review";$("#export-status").textContent=report.checksPassed?"Fan generated. Basic coordinate and degenerate-face checks passed; topology still needs review.":"Mesh validation found issues; inspect before exporting.";}
function meshes(){const a=[];modelRoot.traverse(o=>{if(o.isMesh)a.push(o)});return a;}
// GLTF assets may use material arrays or materials without emissive support.
// Normalize material access so inspection modes never crash on imported models.
function materialsFor(mesh) {
  if (!mesh.material) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function rebuildOverlays() {
  edgeLines.forEach((line) => {
    line.parent?.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  });
  edgeLines = [];

  if (vertexDots) {
    scene.remove(vertexDots);
    vertexDots.geometry.dispose();
    vertexDots.material.dispose();
    vertexDots = null;
  }

  const points = [];
  meshes().forEach((mesh) => {
    if (showEdges) {
      const line = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 20),
        new THREE.LineBasicMaterial({ color: 0x0a111b, transparent: true, opacity: 0.85 }),
      );
      // Match the mesh's local transform and parent so the edge overlay stays aligned.
      line.position.copy(mesh.position);
      line.quaternion.copy(mesh.quaternion);
      line.scale.copy(mesh.scale);
      mesh.parent.add(line);
      edgeLines.push(line);
    }

    if (currentMode === "vertices") {
      const position = mesh.geometry.getAttribute("position");
      if (!position) return;
      for (let i = 0; i < position.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(position, i);
        mesh.localToWorld(point);
        points.push(point.x, point.y, point.z);
      }
    }
  });

  if (currentMode === "vertices" && points.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    vertexDots = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xb8f4e2, size: 5, sizeAttenuation: false }),
    );
    scene.add(vertexDots);
  }

  meshes().forEach((mesh) => {
    materialsFor(mesh).forEach((material) => {
      material.wireframe = currentMode === "wireframe";
      material.transparent = currentMode === "xray";
      material.opacity = currentMode === "xray" ? 0.24 : 1;
      material.depthWrite = currentMode !== "xray";
      material.needsUpdate = true;
    });
  });

  if (selectedPart) highlight(selectedPart);
}

function highlight(part) {
  meshes().forEach((mesh) => {
    materialsFor(mesh).forEach((material) => {
      // Basic and custom GLTF materials do not all expose an emissive property.
      if (!material.emissive) return;
      material.emissive.set(mesh.userData.part === part ? 0x214d48 : 0x000000);
      material.emissiveIntensity = mesh.userData.part === part ? 0.8 : 0;
    });
  });
}
function updateSelection(){highlight(selectedPart);$("#selected-name").textContent=selectedPart||"Nothing selected";$("#selected-type").textContent=selectedPart?(parts.get(selectedPart)||[]).length+" meshes":"—";document.querySelectorAll(".outliner-item").forEach(b=>b.classList.toggle("active",b.dataset.part===selectedPart));}
function buildOutliner(){const order=[["Base","▰"],["Stand","▥"],["Motor","◉"],["Blades","✳"],["Cage","◎"],["Seat","▰"],["Legs","▥"],["Backrest","▤"],["Arms","▥"],["Top","▰"],["Body","▣"],["Roof","⌂"],["Door","▯"],["Windows","▦"],["Wheels","◉"],["Cabin","▱"],["Foliage","♠"],["Stem","│"],["Head","◉"],["Torso","▣"],["Face","◉"],["Feet","▰"],["Speaker cone","◉"],["Tweeter","◉"],["Cabinet","▣"],["Cushions","▰"],["Back","▰"],["Rails","▤"],["Cap","◠"],["Rock","◆"],["Teeth","✳"],["Axle","◎"],["Handle","◔"],["Neck","▥"],["Shoulder","▱"],["Rim","◉"]];for(const name of parts.keys())if(!order.some(x=>x[0]===name))order.push([name,"◈"]);$("#outliner").innerHTML="";for(const [name,icon] of order){if(!parts.has(name))continue;const b=document.createElement("button");b.className="outliner-item";b.dataset.part=name;b.innerHTML='<span class="tree-arrow">›</span><span class="object-icon">'+icon+'</span><span class="object-name">'+name+'</span><span class="object-type">'+parts.get(name).length+'×</span>';b.addEventListener("click",()=>{selectedPart=name;updateSelection();});$("#outliner").append(b);}$("#scene-count").textContent=parts.size+" parts";}
function updateStats(){let v=0,f=0;meshes().forEach(m=>{const p=m.geometry.getAttribute("position");v+=p.count;f+=m.geometry.index?m.geometry.index.count/3:p.count/3;});$("#mesh-vertices").textContent=Math.round(v).toLocaleString();$("#mesh-faces").textContent=Math.round(f).toLocaleString();$("#mesh-status").textContent="Procedural geometry";}
function frameModel(){const box=new THREE.Box3().setFromObject(modelRoot),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(max*1.15,max*.8,max*1.6));camera.near=Math.max(.01,max/1000);camera.far=max*100;if(cameraMode==="orthographic"){const h=Math.max(max*1.35,.5),a=Math.max(1,viewport.clientWidth)/Math.max(1,viewport.clientHeight);camera.top=h/2;camera.bottom=-h/2;camera.left=-h*a/2;camera.right=h*a/2;}camera.updateProjectionMatrix();controls.update();}
function setCameraMode(mode){if(mode!=="perspective"&&mode!=="orthographic")return;const target=controls.target.clone(),position=camera.position.clone(),distance=position.distanceTo(target);cameraMode=mode;camera=mode==="orthographic"?orthographicCamera:perspectiveCamera;camera.position.copy(position);camera.up.set(0,1,0);controls.object=camera;controls.target.copy(target);if(mode==="orthographic"){const h=Math.max(1,distance*.92),a=Math.max(1,viewport.clientWidth)/Math.max(1,viewport.clientHeight);camera.top=h/2;camera.bottom=-h/2;camera.left=-h*a/2;camera.right=h*a/2;}controls.update();resize();}
function setMode(mode){currentMode=mode;document.querySelectorAll("[data-mode]").forEach(b=>{const a=b.dataset.mode===mode;b.classList.toggle("active",a);b.setAttribute("aria-pressed",String(a));});rebuildOverlays();}
function resize(){const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);if(camera.isPerspectiveCamera)camera.aspect=w/h;else{const viewHeight=Math.max(1,camera.top-camera.bottom),aspect=w/h;camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;}camera.updateProjectionMatrix();renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));}new ResizeObserver(resize).observe(viewport);
renderer.domElement.addEventListener("pointerdown",e=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width*2-1;pointer.y=-(e.clientY-r.top)/r.height*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(meshes(),false);if(hits.length){selectedPart=hits[0].object.userData.part;updateSelection();}});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
function buildGeneric(raw){
  clearModel();
  const normalizedPrompt = /\bbuild me a low[- ]poly set up\b/i.test(raw) ? raw : `Build me a low poly set up with ${raw}`;
  const result=buildPromptModel(THREE,normalizedPrompt,detail);
  modelRoot=result.group;modelRoot.name=result.name;parts.clear();
  modelRoot.traverse(o=>{if(o.isMesh){const part=o.userData.part||"Body";if(!parts.has(part))parts.set(part,[]);parts.get(part).push(o);}});
  scene.add(modelRoot);selectedPart=null;$("#model-title").textContent=result.name;
  updateSelection();rebuildOverlays();updateStats();buildOutliner();frameModel();
  $("#mesh-status").textContent=result.report.checksPassed?"Mesh checks passed · "+result.report.degenerate+" degenerate faces":"Mesh needs review";
  const note=result.recognized?"Generated "+result.name.toLowerCase()+" from the prompt. "+result.report.meshes+" named mesh objects; "+result.report.triangles+" triangles.":"I couldn't identify that object yet, so I made a starter blockout. Try a lollipop, car, F1 car, controller, flower, flower in a vase, house, Japanese maple tree, frog, shoe, or fan.";
  $("#export-status").textContent=note+" Checks cover finite coordinates and zero-area triangles, not watertightness or self-intersections.";
  window.currentModelType=result.type;window.currentModelPrompt=normalizedPrompt;
}
function applySelectedPrompt(raw){
  if(!selectedPart)return false;
  const p=raw.toLowerCase(),part=selectedPart.toLowerCase();
  const pronoun=/\b(this|it|that|selected part)\b/.test(p);
  const names=[part,part.replace(/s$/,""),part==="stand"?"support":part==="blades"?"blade":part==="body"?"body":part==="legs"?"leg":part];
  if(!pronoun&&!names.some(n=>n&&p.includes(n)))return false;
  const targets=parts.get(selectedPart)||[];if(!targets.length)return false;
  let changed=false;
  const factor=/\b(wider|broader|widen)\b/.test(p)?[1.2,1,1]:/\b(taller|higher|elongate)\b/.test(p)?[1,1.2,1]:/\b(deeper|thicker)\b/.test(p)?[1,1,1.2]:/\b(smaller|shrink)\b/.test(p)?[.85,.85,.85]:/\b(bigger|larger|enlarge)\b/.test(p)?[1.15,1.15,1.15]:null;
  if(factor){for(const o of targets)o.scale.multiply(new THREE.Vector3(...factor));changed=true;}
  if(/\b(move|shift|slide)\b/.test(p)){const d=.12;const axis=/\bleft\b/.test(p)?[-d,0,0]:/\bright\b/.test(p)?[d,0,0]:/\b(up|higher)\b/.test(p)?[0,d,0]:/\b(down|lower)\b/.test(p)?[0,-d,0]:/\bforward\b/.test(p)?[0,0,d]:/\b(back|backward)\b/.test(p)?[0,0,-d]:null;if(axis){for(const o of targets)o.position.add(new THREE.Vector3(...axis));changed=true;}}
  if(/\b(reset|original size|normal size)\b/.test(p)){for(const o of targets)o.scale.set(1,1,1);changed=true;}
  if(changed){modelRoot.updateMatrixWorld(true);updateStats();rebuildOverlays();const report=inspectMesh(modelRoot);$("#mesh-status").textContent=report.checksPassed?"Geometry checks passed":"Mesh needs review";$("#export-status").textContent="Applied prompt to selected part: "+selectedPart+". "+(report.checksPassed?"Basic geometry checks passed.":"Validation found issues.")+" Review the change before exporting.";return true;}
  return false;
}

// Poly Pizza adapter: keeps asset search, loading, and attribution separate from procedural geometry.
function polyStatus(message){const el=$("#poly-status");if(el)el.textContent=message;}
function cleanAssetQuery(raw){
  return String(raw||"").replace(/build me a low[- ]poly set up/ig,"").replace(/^(with|of|for)\s+/i,"").replace(/\b(low[- ]poly|3d model|please|make me|create me|build me|make|build|create|generate)\b/ig," ").replace(/\s+/g," ").trim();
}
function assetAttribution(model){
  const title=model.Title||"Untitled model", creator=model.Creator?.Username||"Unknown creator", licence=model.Licence||"License not provided";
  if(/CC0/i.test(licence))return `"${title}" by ${creator} — Poly Pizza (${licence})`;
  if(/CC[- ]?BY/i.test(licence))return `"${title}" by ${creator} (${model.Creator?.PURL||"https://poly.pizza"}) — Poly Pizza, ${licence}`;
  return `"${title}" by ${creator} — Poly Pizza, ${licence}. Verify reuse terms before redistributing.`;
}
function renderPolyResults(models){
  const root=$("#poly-results");root.replaceChildren();
  if(!models.length){root.textContent="No matching GLB models found. Try a shorter search.";return;}
  for(const model of models){
    const card=document.createElement("article");card.className="poly-result";
    const img=document.createElement("img");img.alt="";img.loading="lazy";img.src=model.Thumbnail||"";img.onerror=()=>{img.hidden=true;};
    const body=document.createElement("div");body.className="poly-result-copy";
    const title=document.createElement("strong");title.textContent=model.Title||"Untitled model";
    const meta=document.createElement("span");meta.textContent=[model.Creator?.Username||"Unknown creator",model.Licence||"License unknown",model.TriangleCount?model.TriangleCount.toLocaleString()+" tris":""].filter(Boolean).join(" · ");
    const load=document.createElement("button");load.className="library-button";load.textContent="Load model";load.addEventListener("click",()=>loadPolyPizzaModel(model));
    body.append(title,meta,load);card.append(img,body);root.append(card);
  }
}
// Search through Poly Pizza’s documented API; callers retain the procedural fallback when no asset loads.
async function searchPolyPizza(query,{autoLoad=false}={}){
  const q=cleanAssetQuery(query||$("#poly-search").value);
  if(!polyPizzaKey){polyStatus("Add your Poly Pizza API key to enable live asset search. Using procedural models for now.");return false;}
  if(!q){polyStatus("Enter an object to search for.");return false;}
  const serial=++polyPizzaSearchSerial;$("#poly-search").value=q;polyStatus(`Searching Poly Pizza for “${q}”…`);
  try{
    const url="https://api.poly.pizza/v1/search/"+encodeURIComponent(q)+"?limit=8&format=glb&tricount=0-15000";
    const response=await fetch(url,{headers:{"X-Auth-Token":polyPizzaKey,"Accept":"application/json"}});
    if(!response.ok)throw new Error(response.status===401?"API key was rejected. Check the key and try again.":response.status===429?"Rate limit reached. Wait a moment before searching again.":`Poly Pizza API returned HTTP ${response.status}.`);
    const data=await response.json(),models=Array.isArray(data.results)?data.results:[];
    if(serial!==polyPizzaSearchSerial)return false;
    renderPolyResults(models);
    if(!models.length){polyStatus("No matching models found. Falling back to the procedural generator.");return false;}
    polyStatus(`Found ${models.length} model(s). Choose one to load it.`);
    if(autoLoad)return await loadPolyPizzaModel(models[0]);
    return true;
  }catch(error){
    if(serial===polyPizzaSearchSerial)polyStatus(`Poly Pizza unavailable: ${error.message} Procedural fallback is still available.`);
    return false;
  }
}
// Load a selected GLB into the same scene graph used by the local mesh tools.
async function loadPolyPizzaModel(model){
  if(!model?.Download||!/^https:\/\//i.test(model.Download)){polyStatus("This model has no safe HTTPS GLB download URL.");return false;}
  polyStatus("Loading "+(model.Title||"model")+"…");
  try{
    const gltf=await new Promise((resolve,reject)=>gltfLoader.load(model.Download,resolve,undefined,reject));
    clearModel();modelRoot=gltf.scene||gltf.scenes?.[0]||new THREE.Group();modelRoot.name=model.Title||"Poly Pizza Model";
    modelRoot.traverse(o=>{if(o.isMesh){o.userData.part=o.userData.part||o.parent?.name||"Model";if(!parts.has(o.userData.part))parts.set(o.userData.part,[]);parts.get(o.userData.part).push(o);if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.flatShading=true;m.needsUpdate=true;}}}});
    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;

    // Scale first, then center in world space. Translating by the pre-scaled
    // center would leave large or offset source assets visibly off-center.
    modelRoot.position.set(0, 0, 0);
    modelRoot.scale.setScalar(3.2 / max);
    const normalizedBox = new THREE.Box3().setFromObject(modelRoot);
    const normalizedCenter = normalizedBox.getCenter(new THREE.Vector3());
    modelRoot.position.x -= normalizedCenter.x;
    modelRoot.position.y -= normalizedBox.min.y;
    modelRoot.position.z -= normalizedCenter.z;
    scene.add(modelRoot);selectedPart=null;activeAssetCredit=assetAttribution(model);$("#model-title").textContent=model.Title||"Poly Pizza Model";
    updateSelection();rebuildOverlays();updateStats();buildOutliner();frameModel();
    $("#mesh-status").textContent="Poly Pizza asset loaded";
    $("#export-status").textContent="Loaded from Poly Pizza. "+activeAssetCredit+" Check attribution and license before sharing exported files.";
    window.currentModelType="poly-pizza";window.currentModelPrompt=$("#prompt").value;polyStatus("Loaded "+(model.Title||"model")+". Attribution: "+activeAssetCredit);
    return true;
  }catch(error){polyStatus("Couldn't load this model: "+error.message);return false;}
}
$("#poly-connect").addEventListener("click",()=>{
  const key=$("#poly-api-key").value.trim();
  if(!key){polyStatus("Paste your Poly Pizza API key first.");return;}
  polyPizzaKey=key;$("#poly-api-key").value="";polyStatus("Key is active in this page session only. Try searching or build an object.");
});
$("#poly-search-button").addEventListener("click",()=>searchPolyPizza($("#poly-search").value));
$("#poly-search").addEventListener("keydown",e=>{if(e.key==="Enter")searchPolyPizza($("#poly-search").value);});

async function parsePrompt(raw){
const requested=cleanAssetQuery(raw);
if(polyPizzaKey && requested && !/\b(wider|broader|widen|tilt|angle|lean|blades?|reset|default|start over|move|shift|slide|smaller|shrink|bigger|larger|enlarge|taller|higher|deeper|thicker)\b/i.test(raw)){const loaded=await searchPolyPizza(requested,{autoLoad:true});if(loaded)return;}const p=raw.toLowerCase();let changed=false;
if(applySelectedPrompt(raw)){return;}
const requestedType=classifyPrompt(raw);
if(requestedType!=="fan" && (requestedType!=="block" || /\b(build|make|create|generate|model)\b/.test(p))){buildGeneric(raw);return;}
if(requestedType==="fan" && /\b(build|make|create|generate)\b/.test(p) && !/\b(wider|broader|widen|tilt|angle|lean|blades?|reset|default|start over)\b/.test(p)){window.fanBaseWide=false;window.fanTilt=0;window.fanBladeCount=3;$("#model-title").textContent="Tabletop Fan";buildFan();$("#export-status").textContent="Generated the tabletop fan sample. Select a part to refine it.";return;}
if(/tabletop fan|desk fan|electric fan|build me a fan|make a fan|fan with/.test(p)){window.fanBaseWide=false;window.fanTilt=0;window.fanBladeCount=3;$("#model-title").textContent="Tabletop Fan";buildFan();changed=true;}
if(/wider.{0,15}base|base.{0,18}(wider|broader)|broaden.{0,12}base/.test(p)){window.fanBaseWide=true;buildFan();$("#model-title").textContent="Tabletop Fan · Wide Base";changed=true;}
const count=p.match(/\b(2|three|3|four|4|five|5)\s*(?:fan )?blades?\b/);if(count){window.fanBladeCount=({"2":2,"three":3,"3":3,"four":4,"4":4,"five":5,"5":5})[count[1]];buildFan();$("#model-title").textContent="Tabletop Fan · "+window.fanBladeCount+" Blades";changed=true;}
if(/tilt|angle|lean/.test(p)&&/head|back|up|fan/.test(p)){window.fanTilt=p.includes("back")?-.22:.16;buildFan();$("#model-title").textContent="Tabletop Fan · Tilted Head";changed=true;}
if(/reset|default|start over/.test(p)){window.fanBaseWide=false;window.fanTilt=0;window.fanBladeCount=3;buildFan();$("#model-title").textContent="Tabletop Fan";changed=true;}
$("#prompt").value=raw;$("#export-status").textContent=changed?"Model updated from your prompt. Inspect the parts, then export.":"I don't recognize that edit yet. Try “make the base wider”, “add four blades”, or “tilt the head back”.";}
$("#build-button").addEventListener("click",()=>parsePrompt($("#prompt").value));document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>{const p=b.dataset.prompt;$("#prompt").value=p;parsePrompt(p);}));
function refine(){const v=$("#refine-prompt").value.trim();if(!v)return;parsePrompt(v);$("#refine-prompt").value="";}$("#refine-button").addEventListener("click",refine);$("#refine-prompt").addEventListener("keydown",e=>{if(e.key==="Enter")refine();});
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));$("#detail").addEventListener("input", () => {
  detail = Number($("#detail").value);
  $("#detail-value").textContent = ["Very low", "Low-poly", "More detail"][detail];

  if (window.currentModelType === "fan") {
    buildFan();
  } else if (window.currentModelType === "poly-pizza") {
    // Procedural detail changes cannot regenerate a downloaded asset; preserve it.
    $("#export-status").textContent =
      "Mesh detail applies to procedural models. The loaded Poly Pizza asset was kept unchanged.";
  } else {
    buildGeneric(window.currentModelPrompt || $("#prompt").value);
  }
});$("#show-grid").addEventListener("change",e=>grid.visible=e.target.checked);$("#show-edges").addEventListener("change",e=>{showEdges=e.target.checked;rebuildOverlays();});$("#reset-view").addEventListener("click",()=>{setCameraMode("perspective");document.querySelectorAll("[data-view]").forEach(b=>{const active=b.dataset.view==="perspective";b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});camera.position.set(5.8,4.1,8.5);controls.target.set(0,1.55,0);controls.update();});$("#focus-model").addEventListener("click",frameModel);
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-view]").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active));});const requested=b.dataset.view;if(requested==="orthographic"||requested==="perspective"){setCameraMode(requested);return;}const c=controls.target.clone(),d=camera.position.distanceTo(c);if(requested==="front")camera.position.set(c.x,c.y,c.z+d);else if(requested==="side")camera.position.set(c.x+d,c.y,c.z);controls.update();}));
function cleanupMesh(){let merged=0,removed=0,processed=0;for(const m of meshes()){const source=m.geometry;const p=source.getAttribute("position");if(!p)continue;const idx=source.index,count=idx?idx.count:p.count,triangles=[];for(let i=0;i+2<count;i+=3){const ids=[idx?idx.getX(i):i,idx?idx.getX(i+1):i+1,idx?idx.getX(i+2):i+2],a=new THREE.Vector3().fromBufferAttribute(p,ids[0]),b=new THREE.Vector3().fromBufferAttribute(p,ids[1]),c=new THREE.Vector3().fromBufferAttribute(p,ids[2]);if(![a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z].every(Number.isFinite)){removed++;continue;}if(new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).lengthSq()<1e-16){removed++;continue;}triangles.push(...a.toArray(),...b.toArray(),...c.toArray());}const raw=new THREE.BufferGeometry();raw.setAttribute("position",new THREE.Float32BufferAttribute(triangles,3));const clean=mergeVertices(raw,1e-5);raw.dispose();clean.computeVertexNormals();merged+=Math.max(0,triangles.length/3-clean.getAttribute("position").count);m.geometry = clean;
    // Imported GLTF scenes can share a geometry between multiple meshes.
    // Dispose the original only after the final mesh stops referencing it.
    if (!meshes().some((other) => other !== m && other.geometry === source)) source.dispose();
    processed++;}modelRoot.updateMatrixWorld(true);rebuildOverlays();updateStats();const report=inspectMesh(modelRoot);$("#mesh-status").textContent=report.checksPassed?"Cleanup checks passed":"Mesh needs review";$("#export-status").textContent=`Cleanup complete: checked ${processed} mesh objects, merged ${merged} duplicate vertex references, removed ${removed} invalid or zero-area triangles. This does not detect every stray vertex or guarantee manifold topology.`;}
$("#cleanup-mesh").addEventListener("click",cleanupMesh);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function cloneForExport(){const c=modelRoot.clone(true);c.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshStandardMaterial({color:0xbfc8d2,flatShading:true,roughness:.8});});c.updateMatrixWorld(true);return c;}
function filename(ext){return ($("#model-title").textContent.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"lowpoly-model")+"."+ext;}
$("#export-obj").addEventListener("click",()=>{try{download(new Blob([new OBJExporter().parse(cloneForExport())],{type:"text/plain;charset=utf-8"}),filename("obj"));$("#export-status").textContent="OBJ exported. Import into Blender or Maya and validate before production."; }catch(e){$("#export-status").textContent="OBJ export failed: "+e.message;}});
$("#export-stl").addEventListener("click",()=>{try{download(new Blob([new STLExporter().parse(cloneForExport(),{binary:true})],{type:"model/stl"}),filename("stl"));$("#export-status").textContent="Binary STL exported. STL contains geometry only, not named scene hierarchy.";}catch(e){$("#export-status").textContent="STL export failed: "+e.message;}});
$("#export-glb").addEventListener("click",async()=>{try{$("#export-status").textContent="Preparing GLB…";const out=await new GLTFExporter().parseAsync(cloneForExport(),{binary:true});download(new Blob([out],{type:"model/gltf-binary"}),filename("glb"));$("#export-status").textContent="GLB exported with named parts. Blender supports GLB import; Maya support depends on plugins.";}catch(e){$("#export-status").textContent="GLB export failed: "+e.message;}});
function micStatus(s){$("#mic-status").textContent=s;}const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(SpeechRecognition){recognition=new SpeechRecognition();recognition.lang=navigator.language||"en-US";recognition.interimResults=true;recognition.continuous=false;recognition.onstart=()=>{listening=true;$("#mic-button").classList.add("recording");$("#mic-label").textContent="Listening";micStatus("Listening… speak now");};recognition.onresult=e=>{let finalText="",interim="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript;else interim+=e.results[i][0].transcript;}$("#prompt").value=finalText||interim;if(finalText)micStatus("Speech captured. Building…");};recognition.onerror=e=>micStatus(e.error==="not-allowed"?"Microphone permission denied":"Mic issue: "+e.error);recognition.onend=()=>{listening=false;$("#mic-button").classList.remove("recording");$("#mic-label").textContent="Speak";if($("#prompt").value.trim())parsePrompt($("#prompt").value.trim());};}
$("#mic-button").addEventListener("click",()=>{if(!recognition){micStatus("Speech recognition is not supported here. Type a prompt instead.");return;}if(listening)recognition.stop();else{try{recognition.start();}catch(e){micStatus("Microphone is starting — try again.");}}});
window.fanBaseWide=false;window.fanTilt=0;window.fanBladeCount=3;resize();buildFan();
