import test from "node:test";
import { classifyPrompt } from "../src/mesh-engine.js";
import assert from "node:assert/strict";
import { PALETTES, hashSeed, createRandom, triangulate, generateArtwork, artworkToSVG } from "../src/generator.js";
test("seed hashing and random generator are deterministic",()=>{assert.equal(hashSeed("hello"),hashSeed("hello"));assert.notEqual(hashSeed("hello"),hashSeed("world"));const a=createRandom("repeat"),b=createRandom("repeat");assert.deepEqual([a(),a(),a()],[b(),b(),b()]);});
test("triangulation handles fewer than three points",()=>{assert.deepEqual(triangulate([]),[]);assert.deepEqual(triangulate([{x:0,y:0},{x:1,y:1}]),[]);});
test("triangulation creates triangular faces from a square",()=>{const faces=triangulate([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]);assert.ok(faces.length>=2);assert.ok(faces.every(face=>face.length===3));});
test("triangulation rejects non-finite coordinates",()=>{assert.throws(()=>triangulate([{x:0,y:0},{x:Infinity,y:1},{x:1,y:2}]),TypeError);});
test("palettes contain valid colors",()=>{assert.deepEqual(Object.keys(PALETTES),["dusk","forest","candy","ocean","mono","ember"]);for(const palette of Object.values(PALETTES))assert.ok(palette.length>=4&&palette.every(color=>/^#[0-9a-f]{6}$/i.test(color)));});
test("artwork is reproducible with the same options",()=>{const options={seed:"test-seed",style:"abstract",density:4,variation:60,palette:"ocean",width:240,height:160};assert.deepEqual(generateArtwork(options),generateArtwork(options));});
test("different seeds change generated art",()=>{const base={style:"gradient",density:4,variation:50,palette:"dusk",width:240,height:160};assert.notDeepEqual(generateArtwork({...base,seed:"one"}).faces,generateArtwork({...base,seed:"two"}).faces);});
test("generated faces have three points and palette colors",()=>{const art=generateArtwork({width:240,height:160,density:3,seed:"test"});assert.ok(art.faces.length>0);for(const face of art.faces){assert.equal(face.points.length,3);assert.ok(art.palette.includes(face.color));}});
test("SVG export includes dimensions, polygons, and escaped seed",()=>{const svg=artworkToSVG(generateArtwork({width:240,height:160,seed:"test<&",density:3}));assert.match(svg,/width="240" height="160"/);assert.match(svg,/<polygon/);assert.match(svg,/test&lt;&amp;/);});
test("unknown styles and palettes safely fall back",()=>{const art=generateArtwork({style:"unexpected",palette:"missing",width:120,height:80,density:3});assert.equal(art.style,"landscape");assert.deepEqual(art.palette,PALETTES.dusk);});

test("prompt engine recognizes the starter fan and common prop categories",()=>{
  assert.equal(classifyPrompt("Build me a tabletop fan with three blades"),"fan");
  assert.equal(classifyPrompt("a dining chair with four legs"),"chair");
  assert.equal(classifyPrompt("a little robot"),"robot");
  assert.equal(classifyPrompt("make a compact car"),"car");
  assert.equal(classifyPrompt("a low-poly mushroom"),"mushroom");
  assert.equal(classifyPrompt("something I cannot identify"),"block");
});
