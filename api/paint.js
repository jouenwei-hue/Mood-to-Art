// Vercel serverless function: turns one sentence into a painting brief using Claude.
// The API key stays on the server (set ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables).

const ENGINES={watercolor:"Watercolour",oil:"Oil",impasto:"Impasto",crayon:"Crayon",pastel:"Soft pastel",pencil:"Coloured pencil",charcoal:"Charcoal",ink:"Ink wash",collage:"Collage",abstract:"Colour field",woodcut:"Woodcut"};
const VERSES=[
 {id:"v01",ref:"Matthew 11:28",tags:"tired pressure burdened",text:"Come unto me, all ye that labour and are heavy laden, and I will give you rest."},
 {id:"v03",ref:"1 Peter 5:7",tags:"anxious worried uneasy care",text:"Casting all your care upon him; for he careth for you."},
 {id:"v04",ref:"John 14:27",tags:"afraid unsettled peace",text:"Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid."},
 {id:"v05",ref:"Psalm 34:18",tags:"sad loss heartbroken",text:"The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit."},
 {id:"v06",ref:"Psalm 147:3",tags:"hurt grief",text:"He healeth the broken in heart, and bindeth up their wounds."},
 {id:"v07",ref:"Isaiah 41:10",tags:"afraid lonely weak",text:"Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."},
 {id:"v08",ref:"Isaiah 40:31",tags:"weary waiting powerless",text:"But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."},
 {id:"v09",ref:"Proverbs 3:5–6",tags:"lost direction choices",text:"Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."},
 {id:"v10",ref:"Psalm 119:105",tags:"lost darkness direction",text:"Thy word is a lamp unto my feet, and a light unto my path."},
 {id:"v11",ref:"Psalm 118:24",tags:"joy happy ordinary day",text:"This is the day which the LORD hath made; we will rejoice and be glad in it."},
 {id:"v12",ref:"Lamentations 3:22–23",tags:"new start hope morning",text:"It is of the LORD’S mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."},
 {id:"v13",ref:"Psalm 107:1",tags:"grateful content",text:"O give thanks unto the LORD; for he is good: for his mercy endureth for ever."},
 {id:"v14",ref:"Romans 15:13",tags:"hope expectation",text:"Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost."},
 {id:"v15",ref:"Psalm 16:11",tags:"joy fulfilled",text:"Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore."},
 {id:"v16",ref:"Zephaniah 3:17",tags:"loved worth unseen",text:"The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing."},
 {id:"v17",ref:"Deuteronomy 31:8",tags:"lonely new place afraid",text:"And the LORD, he it is that doth go before thee; he will be with thee, he will not fail thee, neither forsake thee: fear not, neither be dismayed."}
];

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}

function buildPrompt(mood,recent){
 const pool=shuffle(Object.keys(ENGINES).filter(e=>!recent.includes(e))).slice(0,5);
 return `You are an art director for a procedural painting engine. A person wrote one sentence about how they feel right now:
"""${mood}"""
Give this feeling a visible form. The sentence may be in any language. Do NOT analyse, diagnose, comfort, judge or interpret the person — only decide how the feeling would look.

The engine can paint with these media (id: name): ${Object.entries(ENGINES).map(([k,v])=>k+": "+v).join(", ")}.
Choose 1 or 2 engines. Suggested for variety today: ${pool.join(", ")}. Avoid recently used: ${recent.join(", ")||"none"}. A surprising pairing is welcome. Name only the media, never an artist or an artist’s style (e.g. ink + collage, crayon + watercolor).
Notes: ink renders in ink tones except "circle" elements which keep their colour; charcoal renders in greys; woodcut is bold flat colour with carved lines; collage is torn paper.

Choose "orientation": "landscape" (wide, 4:3) or "portrait" (tall, 3:4), whichever suits this feeling.
Composition is built from elements painted back to front. x, y, w, h are fractions of the canvas width and height (x,y = centre); for blob and circle, w and h are fractions of the shorter side:
- field: soft rectangle (x,y,w,h)
- band: full-width wavy horizontal band at y with thickness h (x,w ignored)
- blob: organic shape; circle: round shape (w,h = diameters)
- mountain: ridge whose base is at y, width w, peak height h
- line: gestural brush stroke centred at x,y, length w, wave amplitude h, rotation rot (radians)
- scatter: many small marks spread over a box (x,y,w,h)
Use 4–9 elements. Leaving empty paper is fine and often beautiful (especially for ink). Make the composition specific to this feeling, not generic.

Also pick ONE verse id whose theme gently accompanies the feeling (presence, peace, hope — never correction), only from:
${VERSES.map(v=>v.id+": "+v.tags).join("\n")}
Set "care" true only if the sentence suggests self-harm, suicide or wanting to disappear.

Return JSON only:
{"orientation":"landscape","medium":"short English name of the chosen media, e.g. Ink wash × Collage","engines":["ink","collage"],"paper":"#hex paper colour","palette":["#hex",3-5 colours],"angle":-0.4,"elements":[{"kind":"band","x":0.5,"y":0.7,"w":1,"h":0.4,"color":0,"engine":0,"weight":0.7,"rot":0}],"verse_id":"v01","care":false}
angle = dominant stroke direction in radians. color = palette index. engine = index into engines. weight 0.1–1 = intensity.`;
}

export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Use POST"});
 const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
 const mood=String(body.mood||"").trim().slice(0,200);
 const recent=(Array.isArray(body.recent)?body.recent:[]).filter(e=>ENGINES[e]).slice(0,3);
 if(!mood)return res.status(400).json({error:"Missing mood"});
 if(!process.env.ANTHROPIC_API_KEY)return res.status(500).json({error:"Server is missing ANTHROPIC_API_KEY"});
 try{
  const r=await fetch("https://api.anthropic.com/v1/messages",{
   method:"POST",
   headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
   body:JSON.stringify({model:process.env.CLAUDE_MODEL||"claude-sonnet-5-5",max_tokens:2000,messages:[{role:"user",content:buildPrompt(mood,recent)}]})
  });
  const data=await r.json();
  if(!r.ok){console.error("Anthropic error",r.status,data);return res.status(502).json({error:"The painter is unavailable right now."})}
  const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  const m=text.match(/\{[\s\S]*\}/);
  if(!m)return res.status(502).json({error:"Could not read the painting brief."});
  return res.status(200).json(JSON.parse(m[0]));
 }catch(e){console.error(e);return res.status(500).json({error:"Something went wrong."})}
}
