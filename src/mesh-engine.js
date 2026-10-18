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
  // Every built-in gets an intentional, coordinated palette instead of default grey.
  const palettes={
    f1_car:{Body:0xd62828,Nose:0xe63946,"Front wing":0x252932,"Rear wing":0x252932,Wheels:0x17191d,Cockpit:0x252932},
    car:{Body:0x2869a8,Cabin:0x77c9ee,Bumpers:0x252a32,Wheels:0x17191d},
    controller:{Shell:0x30343b,Thumbsticks:0x16191e,"D-pad":0x111318,Buttons:0xf0c75e},
    shoe:{Sole:0xf0eee8,Upper:0x28628a,Toe:0xf0eee8,Tongue:0x4f91b5,Laces:0xfaf7f0,Opening:0x202a35,Trim:0xe8b84a,Heel:0xf0eee8},
    lollipop:{Candy:0xf04478,Stick:0xf2d5a0},
    house:{Body:0xf1d4a7,Roof:0xc6533b,Door:0x70452e,Windows:0x76c8e8},
    japanese_maple:{Trunk:0x65412f,Branches:0x76503a,"Canopy red":0xc73548,"Canopy orange":0xe66a3c,"Canopy gold":0xf0a84d,Veins:0x9c2939},
    tree:{Trunk:0x755037,Foliage:0x4e8b49},
    flower:{Stem:0x39834b,Leaves:0x48a65b,"Flower center":0xf5c542,Petals:0xf06a9b},
    flower_vase:{Vase:0x3caaa5,Stem:0x39834b,Leaves:0x48a65b,"Flower center":0xf5c542,Petals:0xf06a9b},
    frog:{Body:0x63ad54,Head:0x79c967,Eyes:0xf5e8c8,Pupils:0x20262b,Legs:0x4b9845,Feet:0x3e823d,Face:0x3d6637},
    fan:{Base:0x4c5965,Stand:0x75838d,Motor:0x8c9da8,Cage:0x45515a,Blades:0x71b7d1},
    chair:{Seat:0xc38b55,Legs:0x795337,Backrest:0x9b6c43,Arms:0x795337},
    stool:{Seat:0xc38b55,Legs:0x795337,Top:0xc38b55},
    table:{Top:0xc38b55,Legs:0x795337},
    mug:{Body:0xe5edf4,Handle:0x6aa7d6},
    bottle:{Body:0x66b7b0,Shoulder:0x66b7b0,Neck:0x66b7b0,Rim:0xe3f3ef},
    vase:{Body:0x68b8b0,Shoulder:0x68b8b0,Neck:0x68b8b0,Rim:0xf0d8a6},
    lamp:{Base:0x4b6579,Stem:0x4b6579,Shade:0xf4c95d},
    robot:{Torso:0x5d8fc4,Head:0xa9d2e8,Arms:0x5d8fc4,Legs:0x47586a,Feet:0x343f4c,Face:0x242d36},
    sofa:{Base:0x477a9d,Back:0x477a9d,Arms:0x376782,Cushions:0x79adc7},
    speaker:{Cabinet:0x343b45,"Speaker cone":0x667582,Tweeter:0xe6b85c},
    crate:{Body:0xb9824c,Rails:0x79502f},
    mushroom:{Stem:0xf1e4cc,Cap:0xd8584b},
    rock:{Rock:0x8b969b},
    gear:{Body:0x8b9aa5,Axle:0x3e4852,Teeth:0xb6c1c8},
    block:{Body:0x7d9bc2}
  };
  const palette=palettes[type]||palettes.block;
  const material=(part)=>new THREE.MeshStandardMaterial({color:palette[part]??palette.Body??0xbfc9d4,roughness:.82,metalness:0,flatShading:true});
  function add(geo,name,part,pos=[0,0,0],rot=[0,0,0]) {
    const mesh=new THREE.Mesh(geo,material(part)); mesh.name=name;mesh.userData.part=part;
    mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
    if(!partMap.has(part))partMap.set(part,[]);partMap.get(part).push(mesh);serial++;return mesh;
  }
  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const cyl=(rt,rb,h,n=segments)=>new THREE.CylinderGeometry(rt,rb,h,n,1,false);
  const sphere=(r,n=segments)=>new THREE.IcosahedronGeometry(r,0);
  // A shared-apex indexed cone avoids the zero-area apex triangles produced by
  // some procedural cone generators, which keeps the built-in tree mesh clean.
  const cone=(r,h,n=segments)=>{
    const positions=[0,h/2,0];
    for(let i=0;i<n;i++){const a=i*Math.PI*2/n;positions.push(Math.cos(a)*r,-h/2,Math.sin(a)*r);}
    const centerIndex=positions.length/3;positions.push(0,-h/2,0);
    const indices=[];
    for(let i=0;i<n;i++){const next=(i+1)%n;indices.push(0,1+next,1+i);indices.push(centerIndex,1+i,1+next);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  };
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
    // Flat-faced low-poly candy disc, not a spherical golf-ball shape.
    add(cyl(.045,.045,.62,8),"Stick","Stick",[0,.32,0]);
    add(new THREE.CylinderGeometry(.34,.34,.13,10,1,false),"Flat candy disc","Candy",[0,.82,0],[Math.PI/2,0,0]);
    add(new THREE.CylinderGeometry(.065,.065,.04,8,1,false),"Candy collar","Stick",[0,.54,0],[Math.PI/2,0,0]);
  } else if(type==="controller") {
    // Front-facing shell, spaced thumbsticks, cross-shaped D-pad and action buttons.
    const shellShape=new THREE.Shape();
    shellShape.moveTo(-.47,.16);shellShape.quadraticCurveTo(-.66,.23,-.75,.02);
    shellShape.lineTo(-.82,-.18);shellShape.quadraticCurveTo(-.84,-.34,-.68,-.35);
    shellShape.quadraticCurveTo(-.55,-.34,-.42,-.20);shellShape.quadraticCurveTo(-.29,-.12,-.16,-.12);
    shellShape.lineTo(.16,-.12);shellShape.quadraticCurveTo(.29,-.12,.42,-.20);
    shellShape.quadraticCurveTo(.55,-.34,.68,-.35);shellShape.quadraticCurveTo(.84,-.34,.82,-.18);
    shellShape.lineTo(.75,.02);shellShape.quadraticCurveTo(.66,.23,.47,.16);
    shellShape.quadraticCurveTo(.28,.09,.16,.09);shellShape.lineTo(-.16,.09);
    shellShape.quadraticCurveTo(-.28,.09,-.47,.16);
    const shellGeo=new THREE.ExtrudeGeometry(shellShape,{depth:.20,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:4});
    shellGeo.translate(0,0,-.10);add(shellGeo,"Controller body","Shell",[0,.52,0]);
    const stick=(name,x,y)=>{
      add(new THREE.CylinderGeometry(.085,.10,.045,10),name+" rim","Thumbsticks",[x,y,.14],[Math.PI/2,0,0]);
      add(new THREE.CylinderGeometry(.062,.07,.055,10),name,"Thumbsticks",[x,y,.18],[Math.PI/2,0,0]);
    };
    stick("Left thumbstick",-.27,.52);stick("Right thumbstick",.22,.52);
    const dx=-.49,dy=.51,dz=.145;
    add(box(.22,.065,.045),"D-pad left-right","D-pad",[dx,dy,dz]);
    add(box(.065,.22,.045),"D-pad up-down","D-pad",[dx,dy,dz]);
    for(const [i,pos] of [[0,[.47,.62]],[1,[.56,.52]],[2,[.38,.52]],[3,[.47,.42]]]) {
      add(new THREE.CylinderGeometry(.046,.052,.05,8),"Action button "+(i+1),"Buttons",[pos[0],pos[1],.15],[Math.PI/2,0,0]);
    }
    add(box(.10,.035,.025),"Select button","Buttons",[-.09,.46,.145]);
    add(box(.10,.035,.025),"Start button","Buttons",[.09,.46,.145]);
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
    const baseY=type==="flower_vase"?.65:0;
    for(let f=0;f<(type==="flower_vase"?3:1);f++){
      const x=(f-1)*.085,z=(f%2)*.05;
      add(rod(.025,.72,5),"Stem","Stem",[x,baseY+.36,z]);
      add(new THREE.IcosahedronGeometry(.105,0),"Leaf","Leaves",[x+.1,baseY+.28,z],[0,0,-.55]);
      const centerY=baseY+.78;
      add(new THREE.IcosahedronGeometry(.085,0),"Flower center","Flower center",[x,centerY,z]);
      // Each petal is a tapered, slightly cupped low-poly leaf, not a sphere.
      // Its long axis points radially out from the flower center.
      const petalGeo=()=>{
        const positions=[
          0,0,0,  .11,-.075,0,  .245,0,0,  .11,.075,0,
          .105,0,.035,  .105,0,-.025
        ];
        const indices=[
          0,1,4, 1,2,4, 2,3,4, 3,0,4,
          1,0,5, 2,1,5, 3,2,5, 0,3,5
        ];
        const g=new THREE.BufferGeometry();
        g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
        g.setIndex(indices);g.computeVertexNormals();return g;
      };
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        add(petalGeo(),"Petal "+(i+1),"Petals",[x,centerY,z],[0,0,a]);
      }
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
    // A branching, layered momiji canopy with recognizable pointed palmate leaves
    // and a Japanese-maple autumn palette (crimson, vermilion and golden orange).
    add(cyl(.105,.19,1.12,7),"Tapered maple trunk","Trunk",[0,.56,0]);
    for(const s of [-1,1]){
      const branch=add(rod(.035,.57,5),"Angled maple branch","Branches",[s*.23,.92,0]);
      branch.rotation.z=-s*.58;
    }
    const leafShape=new THREE.Shape();
    leafShape.moveTo(0,0);leafShape.lineTo(-.075,.07);leafShape.lineTo(-.20,.085);
    leafShape.lineTo(-.155,.17);leafShape.lineTo(-.225,.205);leafShape.lineTo(-.12,.245);
    leafShape.lineTo(-.105,.355);leafShape.lineTo(0,.285);leafShape.lineTo(.105,.355);
    leafShape.lineTo(.12,.245);leafShape.lineTo(.225,.205);leafShape.lineTo(.155,.17);
    leafShape.lineTo(.20,.085);leafShape.lineTo(.075,.07);leafShape.closePath();
    const mapleLeafGeometry=new THREE.ExtrudeGeometry(leafShape,{depth:.025,bevelEnabled:false,steps:1,curveSegments:1});
    const canopyClusters=[
      [-.40,1.35,-.02],[-.18,1.48,.10],[.12,1.48,.02],[.40,1.36,-.02],
      [-.31,1.68,.03],[0,1.72,-.08],[.31,1.68,.04],[-.13,1.94,0],[.16,1.91,.02]
    ];
    canopyClusters.forEach((pos,i)=>{
      const colors=["Canopy red","Canopy orange","Canopy gold"];
      const count=i%3===1?3:2;
      for(let j=0;j<count;j++){
        const leaf=add(mapleLeafGeometry,"Pointed maple leaf",colors[(i+j)%colors.length],
          [pos[0]+(j-(count-1)/2)*.10,pos[1]+(j%2)*.045,pos[2]+(j%2)*.07],
          [0,(i%2?1:-1)*.28+j*.42,(j-1)*.12]);
        leaf.scale.set(1+(j%2)*.12,1+(i%3)*.04,1);
      }
    });
  } else if(type==="tree") {
    add(cyl(.12,.18,.8,6),"Trunk","Trunk",[0,.4,0]);add(cone(.68,.9,7),"Lower foliage","Foliage",[0,1.05,0]);add(cone(.5,.78,7),"Upper foliage","Foliage",[0,1.65,0]);
  } else if(type==="lamp") {
    add(cyl(.42,.48,.12,segments),"Base","Base",[0,.06,0]);add(rod(.045,.95,6),"Stem","Stem",[0,.57,0]);add(cyl(.25,.08,.32,8),"Shade","Shade",[0,1.16,0]);
  } else if(type==="robot") {
    add(box(.55,.62,.32),"Torso","Torso",[0,.72,0]);add(box(.42,.38,.35),"Head","Head",[0,1.25,0]);
    for(const s of [-1,1]){add(rod(.075,.52,6),"Arm","Arms",[s*.4,.76,0],[0,0,s*.12]);add(box(.15,.48,.16),"Leg","Legs",[s*.18,.18,0]);add(box(.16,.12,.24),"Foot","Feet",[s*.18,.04,.06]);}
    for(const x of [-.11,.11])add(sphere(.045,8),"Eye","Face",[x,1.3,.19]);
  } else if(type==="f1_car") {
    // Low Formula-style chassis, tapered nose, exposed tyres and wing planes.
    add(box(.62,.16,1.42),"Carbon monocoque","Body",[0,.30,-.02]);
    add(box(.40,.12,.62),"Rear engine cover","Body",[0,.42,-.36]);
    add(box(.24,.10,.42),"Nose spine","Nose",[0,.36,.50]);
    add(new THREE.CylinderGeometry(.015,.20,.68,8,1,false),"Tapered nose","Nose",[0,.32,.79],[Math.PI/2,0,0]);
    add(box(1.36,.055,.24),"Front wing main plane","Front wing",[0,.20,1.00]);
    for(const s of [-1,1]) {
      add(box(.045,.16,.20),"Front wing endplate","Front wing",[s*.64,.24,1.00]);
      add(box(.25,.13,.70),"Side pod","Body",[s*.36,.31,-.02]);
    }
    add(box(.34,.12,.40),"Cockpit surround","Cockpit",[0,.43,.10]);
    add(new THREE.TorusGeometry(.145,.035,5,10),"Cockpit rim","Cockpit",[0,.50,.10],[Math.PI/2,0,0]);
    add(new THREE.IcosahedronGeometry(.105,0),"Driver helmet","Cockpit",[0,.55,.06]);
    add(box(1.08,.055,.22),"Rear wing plane","Rear wing",[0,.52,-.79]);
    for(const s of [-1,1]) add(box(.045,.22,.18),"Rear wing endplate","Rear wing",[s*.49,.56,-.79]);
    for(const x of [-.69,.69]) for(const z of [-.48,.48]) {
      add(new THREE.CylinderGeometry(.235,.235,.18,10,1,false),"Wide racing tyre","Wheels",[x,.24,z],[0,0,Math.PI/2]);
      add(new THREE.CylinderGeometry(.125,.125,.19,10,1,false),"Wheel hub","Wheels",[x,.24,z],[0,0,Math.PI/2]);
    }
  } else if(type==="car") {
    // Road-car proportions: long bonnet, raised sloped cabin, bumpers and four tyres.
    add(box(1.30,.30,1.82),"Lower body","Body",[0,.39,0]);
    add(box(1.18,.24,.58),"Front hood","Body",[0,.54,.57]);
    const cabinShape=new THREE.Shape();
    cabinShape.moveTo(-.52,0);cabinShape.lineTo(.52,0);cabinShape.lineTo(.37,.34);cabinShape.lineTo(-.32,.34);cabinShape.closePath();
    const cabinGeo=new THREE.ExtrudeGeometry(cabinShape,{depth:.80,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:3});
    cabinGeo.translate(0,0,-.40);add(cabinGeo,"Sloped passenger cabin","Cabin",[0,.54,-.10]);
    add(box(1.18,.09,.20),"Front bumper","Bumpers",[0,.27,.94]);
    add(box(1.18,.09,.20),"Rear bumper","Bumpers",[0,.27,-.94]);
    for(const x of [-.69,.69]) for(const z of [-.57,.57]) {
      add(new THREE.CylinderGeometry(.205,.205,.16,10,1,false),"Road tyre","Wheels",[x,.25,z],[0,0,Math.PI/2]);
      add(new THREE.CylinderGeometry(.11,.11,.17,10,1,false),"Wheel hub","Wheels",[x,.25,z],[0,0,Math.PI/2]);
    }
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
    // Side-profile sneaker upper extruded across its width gives a proper toe,
    // instep, heel collar and grounded sole instead of stacked cuboids.
    const soleShape=new THREE.Shape();
    soleShape.moveTo(-.68,0);soleShape.lineTo(.58,0);
    soleShape.quadraticCurveTo(.72,.015,.70,.085);
    soleShape.lineTo(-.60,.085);soleShape.quadraticCurveTo(-.72,.07,-.68,0);
    const soleGeo=new THREE.ExtrudeGeometry(soleShape,{depth:.54,bevelEnabled:false,steps:1,curveSegments:3});
    soleGeo.rotateY(-Math.PI/2);soleGeo.translate(-.27,0,0);
    add(soleGeo,"Contoured rubber outsole","Sole",[0,.10,0]);
    const midsoleShape=new THREE.Shape();
    midsoleShape.moveTo(-.65,.08);midsoleShape.lineTo(.58,.08);
    midsoleShape.quadraticCurveTo(.68,.09,.65,.14);
    midsoleShape.lineTo(-.59,.14);midsoleShape.quadraticCurveTo(-.68,.13,-.65,.08);
    const midsoleGeo=new THREE.ExtrudeGeometry(midsoleShape,{depth:.52,bevelEnabled:false,steps:1,curveSegments:3});
    midsoleGeo.rotateY(-Math.PI/2);midsoleGeo.translate(-.26,0,0);
    add(midsoleGeo,"Midsole band","Sole",[0,.10,0]);
    const upperShape=new THREE.Shape();
    upperShape.moveTo(-.60,.13);
    upperShape.quadraticCurveTo(-.63,.25,-.51,.34);
    upperShape.lineTo(-.31,.43);
    upperShape.quadraticCurveTo(-.20,.48,-.08,.49);
    upperShape.lineTo(.20,.39);
    upperShape.quadraticCurveTo(.38,.34,.56,.25);
    upperShape.quadraticCurveTo(.65,.21,.61,.14);
    upperShape.lineTo(-.60,.13);
    const upperGeo=new THREE.ExtrudeGeometry(upperShape,{depth:.43,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.018,bevelThickness:.015,curveSegments:4});
    upperGeo.rotateY(-Math.PI/2);upperGeo.translate(-.215,0,0);
    add(upperGeo,"Sculpted sneaker upper","Upper",[0,.10,0]);
    // Rounded low-poly toe overlay softens the front profile while staying faceted.
    const toeCap=add(new THREE.SphereGeometry(.25,8,5),"Rounded contrasting toe cap","Toe",[0,.32,.48]);
    toeCap.scale.set(1.12,.62,1.05);
    add(box(.34,.16,.10),"Structured heel counter","Heel",[0,.39,-.43]);
    // Contrast foxing gives the sole a clean sneaker-like layered edge.
    add(box(.48,.025,.055),"Sole accent stripe","Trim",[0,.19,-.01]);
    // Raised tongue, dark collar opening and crossed laces make the top readable.
    add(box(.22,.045,.32),"Padded tongue","Tongue",[0,.56,.015]);
    add(box(.31,.035,.16),"Heel collar","Opening",[0,.48,-.38]);
    for(let i=0;i<4;i++){
      const z=.16-i*.085;
      for(const side of [-1,1]){
        const lace=add(box(.17,.018,.028),"Lace "+(i+1),"Laces",[side*.055,.60,z]);
        lace.rotation.y=side===-1?.48:-.48;
      }
    }
    // Two contrasting angled overlays act as a simple low-poly side stripe/logo.
    for(const side of [-1,1]){
      const stripeA=add(box(.025,.065,.25),"Side stripe upper","Trim",[side*.232,.355,.02],[.22,0,.15]);
      const stripeB=add(box(.025,.055,.22),"Side stripe lower","Trim",[side*.232,.325,.19],[-.18,0,-.18]);
      add(box(.025,.035,.23),"Stitching strip","Trim",[side*.232,.275,-.12]);
    }
    add(box(.30,.06,.075),"Heel pull tab","Heel",[0,.57,-.53]);
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
