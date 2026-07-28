/* chapter2.js — SEEN, Chapter 2: After Hours.
   One source of truth for the chapter: the panels, the lines under them, and
   the sizes of the art. Read by the scrolling reader (scroll.html) and by the
   page-turning book (flip.html), so the two editions can never drift apart. */
(function (root) {
  "use strict";

  // [file, tag, caption] — one narration line per panel
  const PANELS = [
    ["c2_p01_01","Day Three","Day three with the volume stuck on. Every desk, every head, every number — and no way to look away from any of it."],
    ["c2_p01_02","No Off Switch","He hasn't slept since Monday. There is no off switch. He has checked."],
    ["c2_p02_01","Jamie Cho","<q>No — this column. Look.</q> She leans across his desk, close enough that he can smell her perfume."],
    ["c2_p02_02","What She's Thinking","And then he hears exactly what she is thinking about him. It is specific. It is filthy. He is not remotely ready."],
    ["c2_p02_03","The Flinch","He recoils. Half a second — and it is the wrong half-second of his entire life."],
    ["c2_p03_01","CRASH","Coffee across three weeks of printouts. The whole floor turns to look."],
    ["c2_p03_02","Both Wrong","<q>I'm— sorry, was I too close—</q> <q>No! No, that's not—</q> Neither of them can say the real thing."],
    ["c2_p03_03","Of Course","She thinks: <em>of course. of course he did.</em> A friendship that hadn't started yet, broken before it began."],
    ["c2_p04_01","Chloe Presents","<q>So if the margin holds, the whole model still works—</q> She built it herself. She is proud of it."],
    ["c2_p04_02","The Theft","The man beside her thinks it plainly, without malice: <em>deck's good. I'll present it as mine. she won't know the difference.</em>"],
    ["c2_p04_03","One Rung Down","Exactly what Marcus did to him. And he is the only person alive who can hear it happening."],
    ["c2_p04_04","He Does Nothing","He turns back to his monitor. No speech. No scene. He tells himself it isn't his business."],
    ["c2_p05_01","Going Down","Just the two of them in the lift. Twenty-seventh floor, descending."],
    ["c2_p05_02","kuh-CHUNK","And then it stops."],
    ["c2_p05_03","Diana Shaw","<q>Well. Hello, Tuesday.</q> Sixty thousand one hundred and nine lies above her head, and not one flicker of panic in her."],
    ["c2_p06_01","Twenty Minutes","<q>Sit down. It's twenty minutes, minimum.</q> At minute five she kicks off her heels."],
    ["c2_p06_02","Three Thoughts","Whether the ceiling panel would take her weight. Whether her sister got to the hospital. How tired she is of being decorative."],
    ["c2_p06_03","Not One","Not one thought about him. He is starting to understand that this is the normal amount."],
    ["c2_p07_01","The Question","<q>How do you do the phones all day? Honestly.</q>"],
    ["c2_p07_02","The Answer","She laughs like it's obvious. <q>I lie. All day.</q>"],
    ["c2_p07_03","Forty an Hour","<q>'He's in a meeting.' 'She's just stepped out.' 'I'll make sure he gets it.' 'Of course, no problem at all.'</q>"],
    ["c2_p08_01","The Arithmetic","Forty times an hour. Eleven years. The highest count on the entire floor."],
    ["c2_p08_02","What They Were For","<q>Every one of them was to cover for somebody. That's the job.</q> <em>60,109</em> — and she is the most decent person in this building."],
    ["c2_p08_03","And One For Him","<q>Oh — and last week, that thing of yours? Told Marcus it was a system error.</q> <em>60,109 &rarr; 60,110.</em> She has never once mentioned it to him."],
    ["c2_p09_01","Sonya Vale","<q>You've been staring at people's foreheads all week.</q> She doesn't guess the power. She guesses something worse."],
    ["c2_p09_02","The Real Question","<q>You've started actually looking at people. That's new. What happened to you?</q>"],
    ["c2_p09_03","Nearly","<q>Just tired. Long quarter.</q> He almost tells her everything. He doesn't."],
    ["c2_p09_04","9 Against 1,205","Hers holds at <em>9</em> for the whole conversation. His ticks up twice. Passed over four times, still an analyst at 31 — that is the going rate for honesty here."],
    ["c2_p10_01","Company Dinner","<q>Cheers!</q> Lantern light, long table, everyone drinking. Attendance is not optional."],
    ["c2_p10_02","Both Directions","Everyone is so loud tonight. In both directions at once."],
    ["c2_p11_01","Greg","Four beers in, arm slung around him: <q>This guy! This guy is the best of us!</q>"],
    ["c2_p11_02","Underneath","And underneath it, with no malice in it at all: <em>why do you get to look like that.</em>"],
    ["c2_p11_03","Both","He meant both. Somehow he meant both at the same time, and neither one of them was a lie."],
    ["c2_p12_01","Jamie, Again","Blazer off, seat switched, straight at it: <q>Okay. About this morning.</q>"],
    ["c2_p12_02","Three Seconds","He heard her decide to be direct three full seconds before she was."],
    ["c2_p12_03","Caught","<q>You're not a good enough liar to pretend that was about the coffee.</q> She is the one person his power gives him nothing on — no gap between what she thinks and what she says."],
    ["c2_p12_04","What It Cost","He will never be surprised by a human being again. It takes him until this moment to work out that this was something he owned, and it is gone."],
    ["c2_p13_01","Chloe, Drunk","<q>You're the only good person at this company. I mean it.</q>"],
    ["c2_p13_02","Plus One","<em>412 &rarr; 413.</em> Not because she doesn't mean it. Because she is flattering him — and the number knows the difference even when she doesn't."],
    ["c2_p13_03","Thanks, Chloe","<q>Thanks, Chloe.</q> His face does something complicated. He gets it back under control fast."],
    ["c2_p14_01","Marcus, Late","<q>Nobody stand up. I'm late, it's on me, keep drinking.</q> He pays for all of it without being asked."],
    ["c2_p14_02","The Story","<q>—so my father says, 'that bicycle cost more than you did'—</q> Warm, funny, self-deprecating. The whole table leans in."],
    ["c2_p15_01","Greg Wipes His Eyes","<q>Ah— sir, that's— that's a good one—</q> They are genuinely moved. Every one of them."],
    ["c2_p15_02","The Counter","<em>148,663 &rarr; 149,061.</em> Climbing so fast the digits blur."],
    ["c2_p15_03","None Of It Happened","Ninety seconds. Four hundred lies. There was no father, no bicycle, no broken anything — he invented all of it on the spot, for them, because they needed a story."],
    ["c2_p15_04","Perfectly Still","Ethan is the only person at that table who knows. He keeps his face perfectly still. He is very, very good at this."],
    ["c2_p16_01","He Leaves Early","He stands up quietly, to go be sick somewhere else."],
    ["c2_p16_02","Air","Cold air on the back of his neck. He should have gone straight home."],
    ["c2_p17_01","Level B2","The parking garage. Sodium light, wet concrete, nobody."],
    ["c2_p17_02","Almost Nobody","Almost nobody."],
    ["c2_p17_03","The Stranger","Marcus, in the gap between two cars, with a man Ethan has never seen in his life. Above the stranger's head: <em>31.</em>"],
    ["c2_p18_01","The Envelope","Thick. Handed over without a single word passing between them."],
    ["c2_p18_02","Still Climbing","<em>149,061 &rarr; 149,064 &rarr; 149,071.</em>"],
    ["c2_p18_03","The Rule","Nobody is speaking. It was never counting what they <em>say.</em> It is counting what they are <em>planning</em> — and it has been, this entire time."],
    ["c2_p19_01","The Lobby","Next morning, lunch crowd, a number over every single head in the crush. And then one of them reads <em>0.</em>"],
    ["c2_p19_02","Zero","Zero. Not low — <em>zero.</em> In a building where the kindest person alive scores sixty thousand."],
    ["c2_p19_03","Wait","<q>Wait— WAIT—</q> He shoves through the crowd toward it."],
    ["c2_p19_04","Gone","Gone. As though nothing had ever been standing there."],
    ["c2_p20_01","The Favour","<q>Two minutes. And you owe me.</q> Diana pulls up the lobby footage."],
    ["c2_p20_02","Same Timestamp","Same timestamp. Same crowd. Same everything, frame for frame."],
    ["c2_p20_03","Empty","Nobody was standing there."],
    ["c2_p21_01","Home","He opens the laptop he has been quietly ranking the entire company on."],
    ["c2_p21_02","Delete","<em>EVERYONE — RANKED.</em> He deletes the whole thing."],
    ["c2_p21_03","tk","New file. Two columns this time."],
    ["c2_p21_04","The New Columns","<em>LIES TOLD</em> &nbsp;/&nbsp; <em>WHO IT PROTECTED.</em> He starts working through his own 1,203."],
    ["c2_p22_01","One Row","He stops. A single highlighted row. The date on it is twelve years old."],
    ["c2_p22_02","He Closes It","Hand still resting on the keyboard. He shuts the laptop without finishing."],
    ["c2_p23_01","bzzt","His phone. Unknown number."],
    ["c2_p23_02","Don't Do That Again","<q>You saw me in the lobby. Don't do that again.</q>"]
  ];

  // panel number -> a line that gets the whole screen to itself, between panels
  const BREATHERS = {
    12: "This is the wound.<br>Not what was done to him — what he <em>didn't do.</em>",
    24: "The biggest liar in the building<br>is the most <em>decent</em> person in it.",
    46: "Four hundred lies in ninety seconds.<br>And the whole table <em>loved</em> him for it.",
    55: "It was never counting what they <em>say.</em><br>It is counting what they are <em>planning.</em>"
  };

  // intrinsic panel sizes (px) — lets a reader reserve space before the art loads
  const DIMS={"c2_p01_01":[1300,732],"c2_p01_02":[1122,1402],"c2_p02_01":[1300,867],"c2_p02_02":[1254,1254],"c2_p02_03":[1300,557],"c2_p03_01":[1300,732],"c2_p03_02":[1300,867],"c2_p03_03":[1122,1402],"c2_p04_01":[1300,867],"c2_p04_02":[1254,1254],"c2_p04_03":[1300,867],"c2_p04_04":[1300,557],"c2_p05_01":[1300,867],"c2_p05_02":[1254,1254],"c2_p05_03":[1122,1402],"c2_p06_01":[1300,867],"c2_p06_02":[1254,1254],"c2_p06_03":[1254,1254],"c2_p07_01":[1300,867],"c2_p07_02":[1122,1402],"c2_p07_03":[1300,732],"c2_p08_01":[1300,557],"c2_p08_02":[1122,1402],"c2_p08_03":[1300,867],"c2_p09_01":[1003,1568],"c2_p09_02":[1254,1254],"c2_p09_03":[1254,1254],"c2_p09_04":[1300,557],"c2_p10_01":[1300,732],"c2_p10_02":[1003,1568],"c2_p11_01":[1300,867],"c2_p11_02":[1254,1254],"c2_p11_03":[1254,1254],"c2_p12_01":[1300,867],"c2_p12_02":[1254,1254],"c2_p12_03":[1122,1402],"c2_p12_04":[1300,557],"c2_p13_01":[1300,867],"c2_p13_02":[1254,1254],"c2_p13_03":[1254,1254],"c2_p14_01":[1122,1402],"c2_p14_02":[1300,732],"c2_p15_01":[1300,867],"c2_p15_02":[1254,1254],"c2_p15_03":[1122,1402],"c2_p15_04":[1300,557],"c2_p16_01":[1300,867],"c2_p16_02":[1122,1402],"c2_p17_01":[1300,732],"c2_p17_02":[1300,867],"c2_p17_03":[1003,1568],"c2_p18_01":[1254,1254],"c2_p18_02":[1300,867],"c2_p18_03":[1003,1568],"c2_p19_01":[1300,732],"c2_p19_02":[1254,1254],"c2_p19_03":[1300,867],"c2_p19_04":[1122,1402],"c2_p20_01":[1300,867],"c2_p20_02":[1300,732],"c2_p20_03":[1254,1254],"c2_p21_01":[1300,867],"c2_p21_02":[1254,1254],"c2_p21_03":[1254,1254],"c2_p21_04":[1300,867],"c2_p22_01":[1122,1402],"c2_p22_02":[1300,867],"c2_p23_01":[1254,1254],"c2_p23_02":[1122,1402]};

  root.SEEN2 = { PANELS: PANELS, BREATHERS: BREATHERS, DIMS: DIMS };
})(window);
