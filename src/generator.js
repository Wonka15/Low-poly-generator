export const PALETTES = {
  dusk: ["#243b55", "#4c6684", "#ed8b72", "#f4c78c", "#8a9bb4", "#b8c6d8"],
  forest: ["#173f35", "#38745b", "#91b77d", "#e2d6a5", "#5c9b78", "#a9cba0"],
  candy: ["#543b79", "#a55d91", "#f09a9c", "#ffd6a5", "#7c6bb2", "#e9b4d3"],
  ocean: ["#123b58", "#197b8a", "#52b6a5", "#d4e7c5", "#2b6c91", "#8dd0c0"],
  mono: ["#1a1b1f", "#50535b", "#9699a3", "#e8e9ed", "#6f737e", "#c2c4cb"],
  ember: ["#42221b", "#873d2c", "#d36b3b", "#f6c36b", "#a94c31", "#e89b4c"]
};

export function hashSeed(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function createRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function circumcircle(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-10) return null;
  const aa = a.x * a.x + a.y * a.y, bb = b.x * b.x + b.y * b.y, cc = c.x * c.x + c.y * c.y;
  const x = (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d;
  const y = (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d;
  return { x, y, r2: (a.x - x) ** 2 + (a.y - y) ** 2 };
}

/** Bowyer–Watson Delaunay triangulation. Points are objects with finite x/y coordinates. */
export function triangulate(input) {
  if (!Array.isArray(input) || input.length < 3) return [];
  const points = input.map(p => ({ x: Number(p.x), y: Number(p.y) }));
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new TypeError("Points must contain finite x and y coordinates.");
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1), mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const n = points.length;
  points.push({x:mx-20*span,y:my-span},{x:mx,y:my+20*span},{x:mx+20*span,y:my-span});
  let triangles = [{a:n,b:n+1,c:n+2}];
  for (let i=0;i<n;i++) {
    const p = points[i];
    const bad = triangles.filter(t => { const circle = circumcircle(points[t.a],points[t.b],points[t.c]); return circle && (p.x-circle.x)**2+(p.y-circle.y)**2 <= circle.r2+1e-7; });
    const edges = [];
    for (const t of bad) for (const edge of [[t.a,t.b],[t.b,t.c],[t.c,t.a]]) {
      const reverse = edges.findIndex(e => e[0]===edge[1] && e[1]===edge[0]);
      if (reverse >= 0) edges.splice(reverse,1); else edges.push(edge);
    }
    const removed = new Set(bad); triangles = triangles.filter(t => !removed.has(t));
    for (const [a,b] of edges) triangles.push({a,b,c:i});
  }
  return triangles.filter(t=>t.a<n&&t.b<n&&t.c<n).map(t=>[points[t.a],points[t.b],points[t.c]]);
}

export function generateArtwork(options = {}) {
  const width = Math.max(120, Math.floor(options.width || 1200));
  const height = Math.max(80, Math.floor(options.height || 800));
  const density = Math.max(3, Math.min(11, Math.floor(options.density ?? 6)));
  const variation = Math.max(0, Math.min(100, Number(options.variation ?? 68))) / 100;
  const style = ["landscape","abstract","gradient"].includes(options.style) ? options.style : "landscape";
  const palette = [...(PALETTES[options.palette] ? PALETTES[options.palette] : PALETTES.dusk)];
  const seed = String(options.seed ?? "GEOMETRY-01");
  const random = createRandom(`${seed}|${style}|${density}|${variation}|${options.palette || "dusk"}`);
  const spacing = 34-density*2.1, points = [], cols = Math.ceil(width/spacing), rows = Math.ceil(height/spacing);
  for(let row=-1;row<=rows;row++) for(let col=-1;col<=cols;col++) {
    const x = Math.max(0,Math.min(width,col*spacing+(row%2)*spacing*.5+(random()-.5)*spacing*.9));
    let y = row*spacing+(random()-.5)*spacing*.9;
    if(style==="landscape" && y>height*.48) y += Math.sin(x/width*Math.PI*2)*height*.055;
    points.push({x,y:Math.max(0,Math.min(height,y))});
  }
  points.push({x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height});
  const faces = triangulate(points).map((triangle,index)=>{
    const center=triangle.reduce((sum,p)=>({x:sum.x+p.x/3,y:sum.y+p.y/3}),{x:0,y:0});
    let tone=style==="gradient"?center.x/width*.58+center.y/height*.42:style==="landscape"?center.y/height:random();
    tone=Math.max(0,Math.min(.999,tone+(random()-.5)*variation*.72));
    return {points:triangle,color:palette[Math.min(palette.length-1,Math.floor(tone*palette.length))],index};
  });
  return {width,height,seed,style,palette,faces};
}

function escapeXML(value) { return String(value).replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c])); }
export function artworkToSVG(artwork) {
  const polygons=artwork.faces.map(face=>`<polygon points="${face.points.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${face.color}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${artwork.width}" height="${artwork.height}" viewBox="0 0 ${artwork.width} ${artwork.height}"><title>Low-poly artwork — ${escapeXML(artwork.seed)}</title><rect width="100%" height="100%" fill="${artwork.palette[0]}"/>${polygons}</svg>`;
}
