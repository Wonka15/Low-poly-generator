/**
 * Lowpoly Studio prompt-to-mesh engine v1.
 * Deterministic, local procedural generation. This is the geometry backend seam
 * for a future AI planner; it does not claim to be a neural text-to-3D model.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const words = (s) => String(s || "").toLowerCase();
export function classifyPrompt(prompt) {
  const p = words(prompt);
  const rules = [
    ["f1_car", /\b(f1|formula\s*1|formula one|race car|racing car)\b/],
    ["flower_vase", /\b(flower\s*(?:in|inside|with)\s*(?:a\s*)?vase|vase\s*with\s*flowers?)\b/],
    ["controller", /\b(controller|gamepad|game controller|xbox controller|playstation controller|ps5 controller|switch controller)\b/],
    ["lollipop", /\b(lollipop|lollypop|sucker candy)\b/],
    ["japanese_maple", /\b(japanese maple|momiji|acer palmatum|maple tree)\b/],
    ["flower", /\b(flower|blossom|tulip|rose|daisy|sunflower)\b/],
    ["frog", /\b(frog|toad|tree frog|bullfrog)\b/],
    ["shoe", /\b(shoe|sneaker|boot|trainer|footwear|low[- ]top)\b/],
    ["fan", /\b(tabletop|desk|electric|standing)?\s*fan\b/],
    ["chair", /\b(chair|armchair|dining chair|office chair)\b/],
    ["table", /\b(table|desk|workbench|coffee table)\b/],
    ["stool", /\b(stool|ottoman)\b/],
    ["mug", /\b(mug|cup|teacup)\b/],
    ["bottle", /\b(bottle|flask|thermos)\b/],
    ["vase", /\b(vase|vessel)\b/],
    ["house", /\b(house|cabin|home|shed)\b/],
    ["tree", /\b(tree|pine|spruce|fir)\b/],
    ["lamp", /\b(lamp|desk light|table light)\b/],
    ["robot", /\b(robot|android|droid)\b/],
    ["car", /\b(car|automobile|sedan|hatchback|vehicle)\b/],
    ["sofa", /\b(sofa|couch|loveseat)\b/],
    ["speaker", /\b(speaker|loudspeaker|subwoofer)\b/],
    ["crate", /\b(crate|box|chest|storage box)\b/],
    ["mushroom", /\b(mushroom|toadstool)\b/],
    ["rock", /\b(rock|boulder|stone)\b/],
    ["gear", /\b(gear|cogwheel|cog)\b/],
  ];
  return rules.find(([, re]) => re.test(p))?.[0] || "block";
}
function readCount(p, nouns, fallback, min=1, max=16) {
  const numberWords={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  const re=new RegExp("\\b(\\d+|"+Object.keys(numberWords).join("|")+")\\s+(?:"+nouns+")\\b","i");
  const m=p.match(re); if(!m)return fallback;
  const n=numberWords[m[1].toLowerCase()] || Number(m[1]); return clamp(Number.isFinite(n)?n:fallback,min,max);
}
export function buildPromptModel(THREE, prompt, detail=1) {
  const p=words(prompt), type=classifyPrompt(p), segments=[6,10,14][clamp(Number(detail)||0,0,2)];
  const group=new THREE.Group(); group.name=({f1_car:"Formula 1 Race Car",flower_vase:"Flower in a Vase",controller:"Game Controller",lollipop:"Low-poly Lollipop",japanese_maple:"Japanese Maple Tree",flower:"Low-poly Flower",fan:"Tabletop Fan",chair:"Chair",table:"Table",stool:"Stool",mug:"Mug",bottle:"Bottle",vase:"Low-poly Vase",house:"Small House",tree:"Low-poly Tree",lamp:"Desk Lamp",robot:"Robot",car:"Compact Car",sofa:"Sofa",speaker:"Speaker",crate:"Crate",mushroom:"Mushroom",rock:"Low-poly Rock",gear:"Gear",frog:"Low-poly Frog",shoe:"Low-poly Shoe",block:"Primitive Blockout"})[type];
  const partMap=new Map(); let serial=0;
  const material=()=>new THREE.MeshStandardMaterial({color:0xbfc9d4,roughness:.82,metalness:0,flatShading:true});
  function add(geo,name,part,pos=[0,0,0],rot=[0,0,0]) {
    const mesh=new THREE.Mesh(geo,material()); mesh.name=name;mesh.userData.part=part;
    mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
    if(!partMap.has(part))partMap.set(part,[]);partMap.get(part).push(mesh);serial++;return mesh;
  }
  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const cyl=(rt,rb,h,n=segments)=>new THREE.CylinderGeometry(rt,rb,h,n,1,false);
  const sphere=(r,n=segments)=>new THREE.IcosahedronGeometry(r,0);
  const cone=(r,h,n=segments)=>new THREE.ConeGeometry(r,h,n,1);
  const rod=(r,len,n=6)=>cyl(r,r,len,n);
  const wider=/\b(wider|broader|wide|widen)\b/.test(p)?1.3:1;
  const taller=/\b(taller|higher|elongated|longer)\b/.test(p)?1.25:/\b(shorter|lower)\b/.test(p)?.78:1;
  const smaller=/\b(smaller|miniature|tiny)\b/.test(p)?.72:/\b(bigger|larger|oversized)\b/.test(p)?1.3:1;
  const legCount=readCount(p,"legs",type==="chair"?4:4,3,8);
  if(type==="fan"){
    const blades=readCount(p,"blades?",3,2,8), n=segments;
    add(cyl(.62*wider,.68*wider,.22,n),"Weighted base","Base",[0,.11,0]);
    add(cyl(.44*wider,.56*wider,.12,n),"Base trim","Base",[0,.25,0]);
    add(cyl(.13,.17,1.12*taller,n),"Support column","Stand",[0,.88*taller,0]);
    const head=new THREE.Group();head.name="Fan head";head.position.set(0,1.75*taller,0);group.add(head);
    const housing=add(cyl(.46,.46,.25,n),"Motor housing","Motor",[0,0,-.1],[Math.PI/2,0,0]);head.add(housing);
    const hub=add(new THREE.IcosahedronGeometry(.15,1),"Front hub","Motor",[0,0,.12]);head.add(hub);
    const ring=add(new THREE.TorusGeometry(.78,.035,5,n*2),"Outer safety ring","Cage",[0,0,.08]);head.add(ring);
    const inner=add(new THREE.TorusGeometry(.63,.018,4,n*2),"Inner safety ring","Cage",[0,0,.09]);head.add(inner);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const s=add(rod(.012,.76,5),"Cage spoke","Cage",[Math.sin(a)*.38,Math.cos(a)*.38,.08]);s.rotation.z=-a;head.add(s);}
    for(let i=0;i<blades;i++){const a=i*Math.PI*2/blades;const b=add(box(.19,.62,.045),"Blade "+(i+1),"Blades",[Math.sin(a)*.22,Math.cos(a)*.22,.15]);b.rotation.z=-a+.18;head.add(b);}
  } else if(type==="lollipop") {
    add(cyl(.045,.045,.58,8),"Stick","Stick",[0,.3,0]);
    add(new THREE.IcosahedronGeometry(.34,1),"Candy","Candy",[0,.78,0]);
    add(cyl(.055,.055,.1,8),"Candy collar","Stick",[0,.57,0]);
  } else if(type==="controller") {
    const shell=add(new THREE.IcosahedronGeometry(.57,1),"Controller shell","Shell",[0,.42,0]);shell.scale.set(1.35,.48,.72);
    add(cyl(.095,.095,.07,8),"Left thumbstick","Thumbsticks",[-.32,.65,.12]);
    add(cyl(.095,.095,.07,8),"Right thumbstick","Thumbsticks",[.22,.65,-.02]);
    add(box(.29,.055,.055),"D-pad horizontal","D-pad",[-.34,.65,-.12]);
    add(box(.055,.055,.29),"D-pad vertical","D-pad",[-.34,.65,-.12]);
    for(const [i,pos] of [[0,[.35,.65,.17]],[1,[.45,.65,.06]],[2,[.25,.65,.06]],[3,[.35,.65,-.05]]])add(new THREE.IcosahedronGeometry(.055,0),"Action button "+(i+1),"Buttons",pos);
    add(box(.16,.035,.07),"Menu button","Buttons",[0,.65,-.22]);
    add(box(.12,.045,.09),"Logo button","Buttons",[0,.66,.08]);
  } else if(type==="chair" || type==="stool") {
    const h=type==="stool"?.72:.82, seatY=h;
    add(box(.95*smaller,.13,.9),"Seat","Seat",[0,seatY,0]);
    for(let i=0;i<legCount;i++){const a=2*Math.PI*i/legCount+Math.PI/4;const x=Math.cos(a)*.34,z=Math.sin(a)*.32;add(box(.105,.72*taller,.105),"Leg "+(i+1),"Legs",[x,seatY-.39*taller,z]);}
    if(type==="chair"){add(box(.95,.82*taller,.12),"Backrest","Backrest",[0,seatY+.42*taller,-.39]);if(/armchair|arm rest|with arms/.test(p)){for(const s of [-1,1]){add(box(.11,.12,.65),"Arm support","Arms",[s*.48,seatY+.22,-.02]);add(box(.09,.2,.09),"Arm post","Arms",[s*.48,seatY+.1,.2]);}}}
  } else if(type==="table" || type==="stool") {
    const topY=type==="table"?.92:.72;
    add(box(type==="table"?1.8*wider:1,.13,type==="table"?1.1:1),"Tabletop","Top",[0,topY,0]);
    for(let i=0;i<legCount;i++){const a=2*Math.PI*i/legCount+Math.PI/4;add(box(.12,.86*taller,.12),"Leg "+(i+1),"Legs",[Math.cos(a)*.72,topY-.48*taller,Math.sin(a)*.4]);}
  } else if(type==="mug") {
    add(cyl(.38,.32,.72,segments),"Cup body","Body",[0,.38,0]);
    add(new THREE.TorusGeometry(.29,.055,6,segments),"Handle","Handle",[.36,.42,0]); // Face the handle toward the viewer, in the XY plane.
  } else if(type==="bottle" || type==="vase") {
    const base=type==="bottle"?.35:.5, bodyH=type==="bottle"?.78:.9;
    add(cyl(base*.86,base,bodyH,segments),"Body","Body",[0,bodyH/2,0]);
    add(cyl(base*.48,base*.7,.22,segments),"Shoulder","Shoulder",[0,bodyH+.09,0]);
    add(cyl(type==="bottle"?.12:.22,type==="bottle"?.12:.22,.34,segments),"Neck","Neck",[0,bodyH+.34,0]);
    add(cyl(type==="bottle"?.14:.24,type==="bottle"?.14:.24,.06,segments),"Rim","Rim",[0,bodyH+.53,0]);
  } else if(type==="flower" || type==="flower_vase") {
    if(type==="flower_vase"){
      // A lathed wall profile gives the vase a real open mouth and visible inner wall,
      // instead of stacking solid cylinders that cap the opening.
      const profile=[
        new THREE.Vector2(.06,.10),new THREE.Vector2(.25,.10),
        new THREE.Vector2(.32,.14),new THREE.Vector2(.37,.27),
        new THREE.Vector2(.35,.40),new THREE.Vector2(.28,.51),
        new THREE.Vector2(.18,.59),new THREE.Vector2(.18,.68),
        new THREE.Vector2(.23,.68),new THREE.Vector2(.23,.58),
        new THREE.Vector2(.30,.49),new THREE.Vector2(.33,.39),
        new THREE.Vector2(.34,.27),new THREE.Vector2(.29,.16),
        new THREE.Vector2(.23,.13),new THREE.Vector2(.06,.13)
      ];
      add(new THREE.LatheGeometry(profile,8),"Hollow vase body","Vase",[0,0,0]);
    }
    const baseY=type==="flower_vase"?.72:0;
    for(let f=0;f<(type==="flower_vase"?3:1);f++){
      const x=(f-1)*.24,z=(f%2)*.12;
      add(rod(.025,.72,5),"Stem","Stem",[x,baseY+.36,z]);
      add(new THREE.IcosahedronGeometry(.105,0),"Leaf","Leaves",[x+.1,baseY+.28,z],[0,0,-.55]);
      const center=[x,baseY+.78,z];
      add(new THREE.IcosahedronGeometry(.105,0),"Flower center","Flower center",center);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;const petal=add(new THREE.IcosahedronGeometry(.105,0),"Petal","Petals",[x+Math.cos(a)*.16,baseY+.79+Math.sin(a)*.16,z]);petal.scale.set(1,.8,1);}
    }
  } else if(type==="house") {
    add(box(1.5,1.05,1.25),"House body","Body",[0,.55,0]);
    // Build a four-sided pyramid from explicit triangles. ConeGeometry duplicates
    // its apex per side, which can create zero-area triangles in a square-roof mesh.
    const roofVertices=[], roofBase=[[-.82,0,-.68],[.82,0,-.68],[.82,0,.68],[-.82,0,.68]], roofApex=[0,.72,0];
    for(let i=0;i<4;i++){const a=roofBase[i],b=roofBase[(i+1)%4];roofVertices.push(...roofApex,...b,...a);}
    const roofGeometry=new THREE.BufferGeometry();roofGeometry.setAttribute("position",new THREE.Float32BufferAttribute(roofVertices,3));roofGeometry.computeVertexNormals();
    const roof=add(roofGeometry,"Roof","Roof",[0,1.06,0]);roof.material.side=THREE.DoubleSide;
    add(box(.28,.58,.06),"Door","Door",[0,.3,.66]);for(const x of [-.43,.43])add(box(.24,.24,.06),"Window","Windows",[x,.72,.66]);
  } else if(type==="japanese_maple") {
    add(cyl(.11,.2,1.05,7),"Trunk","Trunk",[0,.52,0]);
    for(const s of [-1,1]){const branch=add(rod(.045,.48,5),"Branch","Branches",[s*.22,.94,0]);branch.rotation.z=s*.62;}
    const clusters=[[-.42,1.35,0],[0,1.52,.02],[.42,1.35,0],[-.25,1.72,-.06],[.28,1.73,.02],[0,1.88,0]];
    clusters.forEach((pos,i)=>{const leaf=add(new THREE.IcosahedronGeometry(.32,i%2),"Maple foliage cluster","Canopy",pos);leaf.scale.set(1.15,.72,.92);});
  } else if(type==="tree") {
    add(cyl(.12,.18,.8,6),"Trunk","Trunk",[0,.4,0]);add(cone(.68,.9,7),"Lower foliage","Foliage",[0,1.05,0]);add(cone(.5,.78,7),"Upper foliage","Foliage",[0,1.65,0]);
  } else if(type==="lamp") {
    add(cyl(.42,.48,.12,segments),"Base","Base",[0,.06,0]);add(rod(.045,.95,6),"Stem","Stem",[0,.57,0]);add(cyl(.25,.08,.32,8),"Shade","Shade",[0,1.16,0]);
  } else if(type==="robot") {
    add(box(.55,.62,.32),"Torso","Torso",[0,.72,0]);add(box(.42,.38,.35),"Head","Head",[0,1.25,0]);
    for(const s of [-1,1]){add(rod(.075,.52,6),"Arm","Arms",[s*.4,.76,0],[0,0,s*.12]);add(box(.15,.48,.16),"Leg","Legs",[s*.18,.18,0]);add(box(.16,.12,.24),"Foot","Feet",[s*.18,.04,.06]);}
    for(const x of [-.11,.11])add(sphere(.045,8),"Eye","Face",[x,1.3,.19]);
  } else if(type==="f1_car") {
    add(box(1.8,.18,.68),"Low chassis","Body",[0,.3,0]);
    add(box(.48,.18,.42),"Cockpit","Cockpit",[0,.48,-.03]);
    add(new THREE.IcosahedronGeometry(.17,1),"Driver helmet","Cockpit",[0,.62,.02]);
    add(box(.32,.06,1.08),"Front wing","Wings",[0,.2,.62]);
    add(box(.34,.07,.98),"Rear wing","Wings",[0,.45,-.72]);
    add(box(.2,.12,.65),"Engine cover","Body",[0,.46,-.35]);
    for(const x of [-.63,.63])for(const z of [-.48,.48]){
      add(new THREE.CylinderGeometry(.2,.2,.16,10),"Racing tire","Wheels",[x,.2,z],[0,0,Math.PI/2]);
      add(new THREE.CylinderGeometry(.105,.105,.17,10),"Wheel hub","Wheels",[x,.2,z],[0,0,Math.PI/2]);
    }
    add(box(.12,.1,.34),"Front nose","Body",[0,.25,.43]);
  } else if(type==="car") {
    add(box(1.65,.42,.82),"Chassis","Body",[0,.38,0]);add(box(.9,.38,.7),"Cabin","Cabin",[0,.76,-.03]);
    for(const x of [-.56,.56])for(const z of [-.44,.44])add(new THREE.CylinderGeometry(.2,.2,.12,10),"Wheel","Wheels",[x,.22,z],[0,0,Math.PI/2]); // Axles run left-to-right, matching the wheel positions.
  } else if(type==="sofa") {
    add(box(1.7,.28,.75),"Seat base","Base",[0,.35,0]);add(box(1.7,.52,.18),"Back cushion","Back",[0,.7,-.29]);
    for(const s of [-1,1]){add(box(.22,.48,.75),"Armrest","Arms",[s*.78,.56,0]);add(box(.72,.16,.58),"Seat cushion","Cushions",[s*.4,.58,.02]);}
  } else if(type==="speaker") {
    add(box(.8,1.2,.45),"Cabinet","Cabinet",[0,.62,0]);add(new THREE.TorusGeometry(.22,.04,6,segments),"Woofer surround","Speaker cone",[0,.65,.24],[0,0,0]);add(new THREE.CircleGeometry(.2,segments),"Woofer","Speaker cone",[0,.65,.275]);add(new THREE.TorusGeometry(.1,.025,5,segments),"Tweeter ring","Tweeter",[0,1.02,.24]);
  } else if(type==="crate") {
    add(box(1,1,1),"Crate body","Body",[0,.5,0]);for(let y of [.15,.5,.85])add(box(1.04,.06,1.04),"Reinforcement rail","Rails",[0,y,0]);
  } else if(type==="mushroom") {
    add(cyl(.16,.2,.5,8),"Stem","Stem",[0,.25,0]);add(new THREE.SphereGeometry(.58,segments,5,0,Math.PI*2,0,Math.PI/2),"Cap","Cap",[0,.54,0]);
  } else if(type==="rock") {
    const g=new THREE.IcosahedronGeometry(.65,1);const a=g.getAttribute("position");for(let i=0;i<a.count;i++){const k=0.78+((i*17)%11)/30;a.setXYZ(i,a.getX(i)*k,a.getY(i)*k*.8,a.getZ(i)*k);}g.computeVertexNormals();add(g,"Rock","Rock",[0,.48,0]);
  } else if(type==="frog") {
    // A readable frog silhouette with raised eyes, bent legs and toes.
    const body=add(new THREE.IcosahedronGeometry(.55,1),"Body","Body",[0,.55,0]);body.scale.set(1.05,.78,1.12);
    const head=add(new THREE.IcosahedronGeometry(.39,1),"Head","Head",[0,.78,.43]);head.scale.set(1.12,.88,.9);
    for(const s of [-1,1]){
      add(rod(.055,.18,6),"Eye stalk","Eyes",[s*.23,1.04,.48]);
      const eye=add(new THREE.IcosahedronGeometry(.145,1),"Eye","Eyes",[s*.25,1.15,.52]);eye.scale.set(.9,1.05,.8);
      add(new THREE.IcosahedronGeometry(.055,0),"Pupil","Eyes",[s*.25,1.16,.645]);
      const haunch=add(new THREE.IcosahedronGeometry(.25,0),"Hind leg","Legs",[s*.48,.32,-.2]);haunch.scale.set(1,.8,1.25);
      const shin=add(box(.16,.13,.38),"Lower hind leg","Legs",[s*.48,.12,.05]);shin.rotation.x=-.15;
      add(box(.25,.08,.17),"Foot","Feet",[s*.48,.075,.23]);
      for(let t=-1;t<=1;t++)add(new THREE.IcosahedronGeometry(.045,0),"Toe","Feet",[s*.48+t*.075,.06,.31]);
      const front=add(box(.12,.12,.34),"Front leg","Legs",[s*.3,.27,.42]);front.rotation.x=-.18;
      add(new THREE.IcosahedronGeometry(.12,0),"Front foot","Feet",[s*.3,.12,.56]);
    }
    const mouth=add(new THREE.TorusGeometry(.19,.018,4,12,Math.PI),"Mouth","Face",[0,.66,.765]);mouth.rotation.z=Math.PI;
  } else if(type==="shoe") {
    // Toe points toward +Z; named components remain selectable in the outliner.
    add(box(.72,.13,1.42),"Rubber sole","Sole",[0,.12,.02]);
    add(box(.7,.09,1.34),"Midsole","Sole",[0,.205,.02]);
    const upper=add(new THREE.IcosahedronGeometry(.43,1),"Upper","Upper",[0,.39,-.02]);upper.scale.set(.82,.66,1.18);
    const toe=add(new THREE.IcosahedronGeometry(.32,1),"Toe cap","Toe",[0,.34,.43]);toe.scale.set(1,.72,1.05);
    add(box(.28,.23,.25),"Tongue","Tongue",[0,.56,.08]);
    add(box(.42,.045,.48),"Opening","Opening",[0,.59,-.13]);
    for(let i=0;i<4;i++){const z=.13-i*.12;const lace=add(box(.32,.025,.035),"Lace "+(i+1),"Laces",[0,.61,z]);lace.rotation.y=(i%2?-.12:.12);}
    for(const s of [-1,1])add(box(.045,.07,.58),"Side trim","Trim",[s*.285,.39,-.05]);
    add(box(.38,.045,.12),"Heel tab","Heel",[0,.53,-.55]);
  } else if(type==="gear") {
    add(cyl(.62,.62,.16,12),"Gear body","Body",[0,.62,0]);add(cyl(.18,.18,.22,12),"Axle hole placeholder","Axle",[0,.62,0]);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;add(box(.18,.16,.16),"Tooth","Teeth",[Math.cos(a)*.65,.62,Math.sin(a)*.65]);}
  } else {
    add(box(1*smaller,1*taller,1*smaller),"Blockout body","Body",[0,.5*taller,0]);
  }
  // Apply simple global dimensions uniformly; keep Y-up and ground near y=0.
  if(smaller!==1) group.scale.setScalar(smaller);
  group.updateMatrixWorld(true);
  const report=inspectMesh(group);
  return {group,name:group.name,type,recognized:type!=="block",parts:partMap,report};
}
export function inspectMesh(root) {
  let meshes=0,vertices=0,triangles=0,nonFinite=0,degenerate=0;
  const names=new Set();root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!o.isMesh)return;meshes++;if(o.name)names.add(o.name);
    const g=o.geometry,p=g?.getAttribute("position");if(!p)return;vertices+=p.count;
    const idx=g.index, count=idx?idx.count:p.count;triangles+=Math.floor(count/3);
    for(let i=0;i<p.count;i++)if(!Number.isFinite(p.getX(i))||!Number.isFinite(p.getY(i))||!Number.isFinite(p.getZ(i)))nonFinite++;
    for(let i=0;i+2<count;i+=3){const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;
      const ax=p.getX(ib)-p.getX(ia),ay=p.getY(ib)-p.getY(ia),az=p.getZ(ib)-p.getZ(ia),bx=p.getX(ic)-p.getX(ia),by=p.getY(ic)-p.getY(ia),bz=p.getZ(ic)-p.getZ(ia);
      const cx=ay*bz-az*by,cy=az*bx-ax*bz,cz=ax*by-ay*bx;if(cx*cx+cy*cy+cz*cz<1e-16)degenerate++;
    }
  });
  return {meshes,vertices,triangles,nonFinite,degenerate,uniqueNames:names.size,checksPassed:nonFinite===0&&degenerate===0};
}
