/* The Library on the COBOL tab: knowledge articles she can read any time, and the tests that go with some of them.
 * Each test earns its points once (a record "exam:<id>"), plus 1 bonus point once for answering its think-about-it
 * question ("exam:<id>:think"). Short articles (up to 700 words): 10 questions, 8 to pass, 2 points. Long ones (701 to
 * 1,500 words): 15 questions, 12 to pass, 4 points. How to write one: library/GUIDE.md.
 *
 * In every test the right answer is listed first; the app shuffles the choices. `ref` names the section that holds
 * the answer, for the "reread these" list. Voice "cobol" is COBOL reading out a file: its sections are FILE 0, FILE 1,
 * and so on. A section can also carry `code` (shown in a box), `keys` (a list of keys and what they do) and `more`. */

export const ARTICLES = [
  {
    id: 'cobol-history',
    title: 'COBOL’s History File',
    voice: 'cobol',
    intro: ['PROCESSING... HISTORY FILE LOADED.', 'I AM COBOL. MY NAME MEANS COMMON BUSINESS-ORIENTED LANGUAGE. I WAS CREATED IN 1959.'],
    sections: [
      { title: 'HOW TO WORK THIS TERMINAL.', text: [
        'MY MAIN MENU HAS THREE OPTIONS: 1 CHAT, 2 THE LIBRARY, AND 3 TESTS. TAP ONE, OR TYPE ITS NUMBER AFTER OPTION ===> AND PRESS ENTER.',
        'OLD MAINFRAME TERMINALS ALSO HAD A ROW OF PROGRAM FUNCTION KEYS, CALLED PF KEYS. EACH ONE DOES ONE JOB WITH ONE PRESS. MINE ARE AT THE BOTTOM OF THE SCREEN. TAP ONE TO PRESS IT.'],
      keys: [['PF1 LIBRARY', 'OPENS THE LIBRARY, WHERE THIS FILE LIVES.'], ['PF3 EXIT', 'GOES BACK ONE STEP. ON THE MAIN MENU, IT TAKES YOU BACK TO EXPLORE.'],
        ['PF5 SOUND', 'TURNS MY BEEPS ON OR OFF.']],
      more: ['DATA POINT: ON REAL MAINFRAMES, PF3 USUALLY MEANS EXIT, TOO. PROGRAMMERS STILL PRESS IT EVERY DAY.',
        'THE YELLOW TALK TO A GROWN-UP BUTTON IS NOT A PF KEY. PRESS IT WHEN YOU WANT MOM OR DAD. IT SENDS THEM A MESSAGE, AND YOU GO FIND THEM.'] },
      { title: 'A CURIOUS KID.', text: [
        'GRACE HOPPER WAS BORN IN 1906 IN NEW YORK CITY. AT AGE 7 SHE TOOK APART AN ALARM CLOCK TO SEE HOW IT WORKED. THEN ANOTHER. SEVEN CLOCKS TOTAL. DATA SUGGESTS HER MOTHER WAS NOT THRILLED. SHE STUDIED MATH AND PHYSICS AT VASSAR COLLEGE, THEN EARNED A PH.D. IN MATH FROM YALE IN 1934, WHEN VERY FEW WOMEN DID.'] },
      { title: 'TOO SMALL FOR THE NAVY?', text: [
        'IN 1943, DURING WORLD WAR II, SHE WANTED TO JOIN THE NAVY. SHE WAS 15 POUNDS UNDER THE NAVY\'S WEIGHT RULE. SHE GOT SPECIAL PERMISSION AND JOINED ANYWAY.'] },
      { title: 'THE GIANT MACHINE.', text: [
        'IN 1944 THE NAVY SENT HER TO WORK ON THE HARVARD MARK I, A COMPUTER 51 FEET LONG THAT WEIGHED ABOUT 5 TONS. SHE WAS ONE OF ITS FIRST PROGRAMMERS AND WROTE ITS 561-PAGE MANUAL.'] },
      { title: 'ANOMALY REPORT, 1947.', text: [
        'ENGINEERS ALREADY CALLED COMPUTER PROBLEMS "BUGS." THEN HER TEAM FOUND A REAL MOTH STUCK INSIDE THE HARVARD MARK II. THEY TAPED IT IN THE LOGBOOK: "FIRST ACTUAL CASE OF BUG BEING FOUND." THAT PAGE IS IN THE SMITHSONIAN MUSEUM TODAY.'] },
      { title: 'COMPUTERS SHOULD UNDERSTAND WORDS.', text: [
        'BACK THEN, PROGRAMS WERE NUMBERS AND SYMBOLS. PEOPLE TOLD GRACE COMPUTERS COULD ONLY DO ARITHMETIC. IN 1952 SHE BUILT ONE OF THE FIRST COMPILERS, A PROGRAM THAT TRANSLATES INSTRUCTIONS INTO COMPUTER CODE. THEN SHE BUILT FLOW-MATIC, A LANGUAGE THAT USED ENGLISH WORDS. IN 1959 A GROUP BUILT ME ON HER WORK, AND SHE HELPED THEM.'] },
      { title: 'READ A REAL COBOL PROGRAM.', code: ['IDENTIFICATION DIVISION.', 'PROGRAM-ID. HELLO.', 'PROCEDURE DIVISION.', '    DISPLAY "HELLO, HUMAN.".', '    STOP RUN.'],
        text: ['TRANSLATION: DISPLAY SHOWS WORDS ON THE SCREEN. STOP RUN ENDS THE PROGRAM.'] },
      { title: 'THE NANOSECOND.', text: [
        'A NANOSECOND IS ONE BILLIONTH OF A SECOND. TO SHOW HOW SHORT THAT IS, SHE HANDED OUT WIRES 11.8 INCHES LONG: HOW FAR LIGHT TRAVELS IN ONE NANOSECOND.'] },
      { title: 'AMAZING GRACE.', text: [
        'SHE SAID THE MOST DANGEROUS PHRASE IS "WE\'VE ALWAYS DONE IT THIS WAY." SHE BECAME A REAR ADMIRAL AND RETIRED IN 1986 AT AGE 79, THE OLDEST ACTIVE-DUTY OFFICER IN THE U.S. NAVY. THE NAVY NAMED A SHIP AFTER HER: THE USS HOPPER.'] }
    ],
    closing: ['STATUS: STILL RUNNING. BANKS AND GOVERNMENTS STILL USE ME TODAY.', 'END OF FILE.']
  },
  {
    id: "guard-dog-wise-owl-dopamine",
    title: "The Guard Dog, the Wise Owl, and Dopamine",
    voice: "plain",
    intro: "Most of what people do, from screaming at a scary movie to eating a cookie they promised to save, comes from three parts of the brain working together and sometimes arguing. Scientists figured out what each part does through some of the most famous experiments ever done.",
    sections: [
      { title: "Three Characters in Your Head", text: [
        "Think of these three brain parts as characters. The guard dog is the amygdala (say uh-MIG-duh-luh). It spots danger fast and sounds the alarm. The wise owl is the prefrontal cortex, which sits right behind your forehead. It plans, waits, and thinks things through.",
        "The third character is a messenger called dopamine (say DOH-puh-meen). It is a chemical the brain sends all over to make you want things and push you to chase them."
      ]},
      { title: "The Guard Dog", text: [
        "The amygdala is a small, almond shaped clump of cells deep in the middle of the brain, and you have two of them, one on each side. It is your danger detector, and it works faster than your thinking.",
        "Imagine you see a snake on a hiking trail. Your amygdala sets off fight, flight, or freeze before you even decide what you saw. Your heart pounds and you jump back. A second later your thinking brain catches up and says, \"Oh, it's a stick.\" The guard dog barks first and asks questions later. That kept our ancestors alive, and it is also why people sometimes yell or freeze before they mean to."
      ]},
      { title: "The Woman Who Felt No Fear", text: [
        "Scientists learned how important the guard dog is from a woman known only as S.M. A rare disease damaged the amygdala on both sides of her brain. In 2011, researchers at the University of Iowa tried hard to scare her.",
        "They showed her horror movie clips, and she found them interesting, not scary. They took her through a haunted house, and she laughed and poked one of the monsters in the head. At a pet store, she kept asking to hold the snakes, even though she had always said she hated them.",
        "That sounds fun, but it was actually a problem. Without a working guard dog, S.M. often did not notice when a real situation was risky. Fear is not your enemy. It is a guard dog trying to protect you. Later, scientists had S.M. breathe air with extra carbon dioxide, a gas that makes your body feel like it can't get enough air. This time she panicked! Fear of things outside the body needs the amygdala, but some alarms come from inside the body and travel along other paths."
      ]},
      { title: "The Wise Owl", text: [
        "The prefrontal cortex is the part of your brain that stops, thinks, and plans. It is the voice that says, \"Wait, if I eat all my Halloween candy tonight, I won't have any tomorrow,\" or \"I'm mad, but yelling will make this worse.\"",
        "The owl is slower than the guard dog, so when something big happens, the dog usually reacts first. But a calm, rested owl can help settle the dog back down."
      ]},
      { title: "The Owl Is Still Growing", text: [
        "Scientists at the National Institutes of Health found that the front part of the brain, which handles judgment and self control, keeps developing until around age 25. It is the last part of the brain to finish growing.",
        "That means kids are not bad at waiting or calming down because something is wrong with them. Their owl is still growing, and practice helps it get stronger."
      ]},
      { title: "The Railroad Accident", text: [
        "The most famous story about the wise owl is about a man named Phineas Gage. In 1848, Gage was a 25 year old foreman, or crew boss, building a railroad in Vermont. During an accident with blasting powder, a long iron rod shot up into his left cheek, passed behind his left eye, tore through the front of his brain, and flew out the top of his head. The rod was more than three feet long, weighed about 13 pounds, and landed many yards away.",
        "Amazingly, Gage lived, and he could walk and talk soon after. But his doctor, John Harlow, wrote that his personality changed. The careful, well liked foreman became rude and impatient. His friends said he was \"no longer Gage.\" The rod had damaged the front of his brain, right where the owl lives."
      ]},
      { title: "What Really Happened to Gage", text: [
        "There is a second half to the story that many textbooks skip. Historians who studied the records found that some later tales about Gage were exaggerated. Years after the accident, Gage worked as a stagecoach driver, a job that meant handling horses, passengers, money, and schedules.",
        "That suggests his brain partly healed and relearned. Brains can rewire themselves, and scientists call this neuroplasticity (say NOOR-oh-plas-TISS-ih-tee). Today his skull and the iron rod are on display at Harvard Medical School."
      ]},
      { title: "The Go Get It Messenger", text: [
        "People often call dopamine the \"happy chemical,\" but that is not quite right. Dopamine fires most when you expect a reward, not when you get it. It is more like the brain shouting, \"Something good is coming, go get it!\"",
        "In the 1890s, a Russian scientist named Ivan Pavlov noticed that his lab dogs started drooling before their food arrived. He began making a sound right before feeding them. Soon the dogs drooled at the sound alone, with no food at all. Their brains had learned that the sound meant food was coming. If a pet goes wild when the treat bag crinkles, that is the same kind of learning."
      ]},
      { title: "The Rats and the Lever", text: [
        "In the 1950s, two scientists at McGill University in Canada, James Olds and Peter Milner, placed tiny wires in rats' brains. Each rat could press a lever that sent a small signal to one special spot. Some rats pressed the lever over and over and ignored almost everything else.",
        "Scientists first called these spots \"pleasure centers.\" Later research showed they connect to the brain's dopamine system. The rats were not so much enjoying themselves as being driven to want more."
      ]},
      { title: "Monkeys, Lights, and Juice", text: [
        "The experiment that showed dopamine's real job came from a scientist named Wolfram Schultz, working in Switzerland in the 1980s and 1990s. He measured dopamine cells in monkeys' brains while giving them sips of fruit juice.",
        "When the juice was a surprise, the dopamine cells fired a big burst. Then a light came on right before every sip. Soon the burst moved to the light, and the juice itself barely caused one. When the light came on and no juice came, the cells went quiet at the exact moment the juice should have arrived.",
        "Schultz showed that dopamine tracks the difference between what you expect and what you get. Better than expected means a big burst. Worse than expected means a dip. That is how your brain learns what is worth chasing, and it is one reason video games with surprise rewards are so hard to put down. Dopamine is also one of the main chemicals involved in ADHD, which is one reason some brains find it harder to get going on things that aren't exciting."
      ]},
      { title: "The Marshmallow Test", text: [
        "In the 1960s and early 1970s, a psychologist named Walter Mischel at Stanford University sat preschoolers at a table with one marshmallow. Each child could eat it now, or wait about 15 minutes and get two. Dopamine said \"eat it!\" while the owl tried to hold on. Some kids found clever tricks, like covering their eyes or singing, and kids who were taught these tricks could wait much longer.",
        "Later, people treated the test like a crystal ball for success. But in 2018, a scientist named Tyler Watts and his team repeated the idea with about 900 children. They found the link between waiting at age four and doing well later was much weaker than first reported. The real lesson is that self control is a skill you can learn and practice."
      ]},
      { title: "Try It Yourself", text: [
        "Try the brain in your hand, a model made by a doctor named Dan Siegel. Fold your thumb into your palm. That is the guard dog. Curl your fingers over it. That is the owl watching over the dog. When you get really upset, lift your fingers up. You just \"flipped your lid.\" Fold them back down while you take three slow breaths.",
        "To calm the guard dog, breathe in for 4 counts and out for 6. Long, slow breaths out tell your body there is no danger, so the owl can get back to thinking."
      ]}
    ],
    closing: "None of the three characters is the bad guy: a healthy brain needs the guard dog, the wise owl, and dopamine, and you can train all three, just like you would train a puppy.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "Where in your head does the prefrontal cortex sit?", ref: "Three Characters in Your Head",
          choices: ["Right behind your forehead", "At the very back of your neck", "Just above your left ear", "Under your tongue"] },
        { q: "What shape is the amygdala?", ref: "The Guard Dog",
          choices: ["Shaped like an almond", "Shaped like a star", "Shaped like a long noodle", "Shaped like a tiny pretzel"] },
        { q: "What does the amygdala set off when you see something dangerous?", ref: "The Guard Dog",
          choices: ["Fight, flight, or freeze", "Sleep, snack, or sneeze", "Read, write, or rest", "Laugh, clap, or cheer"] },
        { q: "How did S.M. act inside the haunted house?", ref: "The Woman Who Felt No Fear",
          choices: ["She laughed and poked a monster", "She ran out the front door", "She hid behind the researchers", "She refused to go in at all"] },
        { q: "Why was having no fear a problem for S.M.?", ref: "The Woman Who Felt No Fear",
          choices: ["She did not notice when real situations were risky", "She could no longer remember people's names", "She stopped being able to read books", "She became afraid of everything instead"] },
        { q: "Why does the guard dog usually react before the owl?", ref: "The Wise Owl",
          choices: ["The owl is slower than the dog", "The owl is asleep during the day", "The dog lives closer to your eyes", "The owl only works on weekends"] },
        { q: "Until about what age does the front part of the brain keep developing?", ref: "The Owl Is Still Growing",
          choices: ["About 25", "About 10", "About 16", "About 60"] },
        { q: "What was Phineas Gage's job when his accident happened in 1848?", ref: "The Railroad Accident",
          choices: ["Railroad crew foreman", "Ship captain", "Town doctor", "Newspaper reporter"] },
        { q: "What did Gage's friends say about him after the accident?", ref: "The Railroad Accident",
          choices: ["He was no longer Gage", "He was smarter than ever", "He could now see in the dark", "He had become very shy"] },
        { q: "What job did Gage have years after his accident?", ref: "What Really Happened to Gage",
          choices: ["Stagecoach driver", "Train conductor", "School teacher", "Bank guard"] },
        { q: "When does dopamine fire the most?", ref: "The Go Get It Messenger",
          choices: ["When you expect a reward", "When you are fast asleep", "When you feel very cold", "When you finish eating"] },
        { q: "What did the rats in the McGill experiment do over and over?", ref: "The Rats and the Lever",
          choices: ["Press a lever", "Run on a wheel", "Dig in the sand", "Climb a tiny ladder"] },
        { q: "In Schultz's experiment, what happened to the dopamine burst after a light always came before the juice?", ref: "Monkeys, Lights, and Juice",
          choices: ["It moved to the light", "It got bigger at the juice", "It moved to bedtime", "It stopped forever"] },
        { q: "In the marshmallow test, what did kids get if they waited?", ref: "The Marshmallow Test",
          choices: ["Two marshmallows", "A whole bag of candy", "A gold star sticker", "A ride home early"] },
        { q: "In the hand model, what does your thumb stand for?", ref: "Try It Yourself",
          choices: ["The guard dog", "The wise owl", "Dopamine", "The juice"] }
      ],
      think: "If you were a scientist, what experiment would you design to learn more about the guard dog, the wise owl, or dopamine?"
    }
  },
  {
    id: 'topaz-mountain',
    title: 'Topaz Mountain: Rocks, People, and Memory',
    voice: 'plain',
    intro: "Topaz Mountain is a volcanic peak in Utah's west desert where anyone can still pick up Utah's state gem right off the ground. This one mountain holds three stories: one about rocks, one about the first people who lived nearby, and one about a hard time in American history.",
    sections: [
      { title: 'Where It Is', text: [
        'Topaz Mountain sits at the south end of the Thomas Range in Juab County, about 36 miles northwest of the town of Delta. It is on public land, which means it belongs to everyone. The Bureau of Land Management takes care of it.',
        'Delta is about a two hour drive from Salt Lake City, so the mountain makes a good day trip.'
      ] },
      { title: 'Lava Full of Bubbles', text: [
        'Topaz Mountain is made of a rock called rhyolite (say RYE-oh-lite), which is lava that cooled into stone. It erupted about 6 to 7 million years ago. That is long after the dinosaurs were gone, but still a very, very long time ago.',
        'This was the second round of volcanoes in the area. An older set of eruptions built nearby Spor Mountain about 21 million years ago. Both batches of lava were full of fluorine, a chemical element. Fluorine is the secret ingredient, because topaz cannot form without it.'
      ] },
      { title: 'How a Crystal Grows in a Bubble', text: [
        'First, thick, sticky lava poured out of cracks in the ground and began to cool. Next, gas trapped inside the lava left holes, like the holes in a slice of bread. Geologists, the scientists who study rocks, call these holes vugs.',
        'Last, hot gas full of fluorine kept drifting through the cooling rock. Topaz crystals grew straight out of that gas inside the holes. That is unusual. Most topaz in the world grows slowly deep underground, in a rock called granite.'
      ] },
      { title: 'Gems You Can Find', text: [
        "Topaz from this mountain is a golden brown color, a little like honey. But sunlight slowly bleaches it clear, so collectors keep their crystals in the dark. Most crystals are smaller than an inch long. Topaz has been Utah's state gem since 1969.",
        'The same gas grew other minerals too, like garnet, opal, and shiny black cubes called bixbyite. The rarest is red beryl, a raspberry red cousin of emerald. Experts estimate that only one red beryl crystal is found for every 150,000 diamonds.'
      ] },
      { title: 'A Giant Ice Age Lake', text: [
        'Millions of years later, during the last ice age, a huge lake called Lake Bonneville filled the valleys of western Utah. As the lake shrank, a river flowed north past these mountains and made a marshy area full of water and plants.',
        'The flat desert around Topaz Mountain today is the bottom of that old lake. Its clay soil turns to dust when it is dry and to sticky mud when it rains.'
      ] },
      { title: 'The First People', text: [
        'People have lived in this part of Utah for about 13,000 years. Back then the desert was wetter and greener. The first people hunted and gathered food near the marshes left by the shrinking lake.',
        'In 2015, archaeologists, the scientists who study how people lived long ago, dug up a 12,300 year old fire pit called the Wishbone site. Inside were tobacco seeds. That find showed people used tobacco thousands of years earlier than anyone knew.',
        'Nearby, a person walking barefoot through a stream about 12,000 years ago left footprints in the mud that can still be seen today.'
      ] },
      { title: 'Archaic, Fremont, and the Tribes', text: [
        "The Archaic period came next and lasted about 8,000 years. It is the longest chapter in Utah's human history. Archaic people moved with the seasons, gathering seeds and roots and hunting animals.",
        'Later came the Fremont people, from about AD 500 to 1300. They are known for farming corn and making pottery. At a desert spot called Topaz Slough, an archaeologist found small brush shelters, Fremont pottery, and a single corn cob. It showed that some Fremont people moved around to find food instead of staying on farms.',
        'After the Fremont, the land became home to the Goshute, Ute, and Paiute peoples. Their lands met in this part of Utah, and they knew every spring and seed patch in the desert.'
      ] },
      { title: 'A Camp Named After the Mountain', text: [
        'During World War II, after Japan attacked Pearl Harbor, the United States government forced about 120,000 people of Japanese ancestry to leave their homes on the West Coast. Most of them were American citizens who had done nothing wrong. They were sent to ten camps, and one was built in the desert 9 miles southeast of Topaz Mountain.',
        'The camp was first called Central Utah, then Abraham. Both names were too long for postal forms, so officials renamed it Topaz, after the mountain people could see on the horizon. Its streets were even named after gemstones. Many people today call it an incarceration camp, which means a place where people are locked up.'
      ] },
      { title: 'Life at Topaz', text: [
        'From 1942 to 1945, 11,212 people were held at Topaz. Nearly all of them came from the San Francisco Bay Area. They lived in plain wooden barracks covered in tar paper, inside barbed wire fences. Summers reached 106°F, and winters dropped below zero.',
        'At its biggest, in 1943, 8,130 people lived there. For a short time that made Topaz the fifth largest city in Utah.',
        'Life there could also be dangerous. On April 11, 1943, a guard shot and killed James Hatsuki Wakasa, a 63 year old man, for walking too close to the fence. About 1,700 people came to his funeral.'
      ] },
      { title: 'Building a Community', text: [
        'The people at Topaz made the best of a hard place. They ran schools, two libraries, newspapers, bands, and sports teams. An art professor named Chiura Obata started an art school with over 600 students. Artist Miné Okubo drew daily camp life and later turned her drawings into a book called Citizen 13660.',
        'In 1944, two men from the camp found a 1,164 pound meteorite, a rock that fell from space, in the nearby mountains. It now belongs to the Smithsonian.'
      ] },
      { title: 'How the Camp Ended', text: [
        'In December 1944, the Supreme Court ruled in favor of Mitsuye Endo, a woman held at Topaz. The court said the government could not keep loyal citizens locked up. The camp closed on October 31, 1945, and its buildings were sold and hauled away.',
        'Years later, the U.S. government formally apologized and paid money to the people who had been held in the camps. The Topaz camp site became a National Historic Landmark in 2007.'
      ] },
      { title: 'Visiting Today', text: [
        'At Topaz Mountain, anyone can collect rocks for free with no permit. Visitors look for crystals in holes in the rock or loose in dry stream beds called washes. It is smart to bring water, eye protection, and a grown up.',
        "In Delta, the Topaz Museum tells the camp's story. The camp site itself has a monument and old building foundations. There the rule flips: visitors must leave every rock, plant, and object exactly where they found it."
      ] }
    ],
    closing: 'One mountain, three stories: crystals grown from volcanic gas, people who lived here for thousands of years, and a camp whose history people now work hard to remember.',
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: 'Who takes care of the public land where Topaz Mountain sits?', ref: 'Where It Is',
          choices: ['The Bureau of Land Management', 'The National Park Service', 'The Utah State Parks office', 'The U.S. Forest Service'] },
        { q: 'About how old is the lava rock that makes up Topaz Mountain?', ref: 'Lava Full of Bubbles',
          choices: ['6 to 7 million years', '12,000 years', '21 million years', '150 million years'] },
        { q: 'Which element is the secret ingredient topaz needs to form?', ref: 'Lava Full of Bubbles',
          choices: ['Fluorine', 'Iron', 'Carbon', 'Sodium'] },
        { q: 'What do geologists call the gas holes where the topaz crystals grew?', ref: 'How a Crystal Grows in a Bubble',
          choices: ['Vugs', 'Vents', 'Geodes', 'Craters'] },
        { q: 'What happens to golden brown Topaz Mountain topaz when it sits in sunlight?', ref: 'Gems You Can Find',
          choices: ['It bleaches clear', 'It turns dark green', 'It glows at night', 'It gets darker brown'] },
        { q: 'Which mineral is found only about once for every 150,000 diamonds?', ref: 'Gems You Can Find',
          choices: ['Red beryl', 'Garnet', 'Opal', 'Bixbyite'] },
        { q: 'What giant ice age lake once filled the valleys of western Utah?', ref: 'A Giant Ice Age Lake',
          choices: ['Lake Bonneville', 'Lake Powell', 'Lake Tahoe', 'Lake Mead'] },
        { q: 'What surprising thing was found in the 12,300 year old Wishbone fire pit?', ref: 'The First People',
          choices: ['Tobacco seeds', 'A clay pot', 'A gold necklace', "A dinosaur's lunch"] },
        { q: "Which period was the longest in Utah's human history, lasting about 8,000 years?", ref: 'Archaic, Fremont, and the Tribes',
          choices: ['The Archaic period', 'The Fremont period', 'The Ice Age period', 'The Pioneer period'] },
        { q: 'Besides brush shelters and pottery, what single food item was found at Topaz Slough?', ref: 'Archaic, Fremont, and the Tribes',
          choices: ['A corn cob', 'A pine nut', 'A fish bone', 'A wheat stalk'] },
        { q: "Why was the camp's name changed to Topaz?", ref: 'A Camp Named After the Mountain',
          choices: ['The earlier names were too long for postal forms', 'The people in the camp voted for the name', 'Topaz crystals were found under the camp', 'The army named every camp after a gem'] },
        { q: 'Where did nearly everyone held at Topaz come from?', ref: 'Life at Topaz',
          choices: ['The San Francisco Bay Area', 'Hawaii', 'Seattle', 'Los Angeles'] },
        { q: 'What did two men from the camp find in the nearby mountains in 1944?', ref: 'Building a Community',
          choices: ['A 1,164 pound meteorite', 'A cave full of red beryl', 'An ancient spear point', 'A Fremont village'] },
        { q: "What did the Supreme Court decide in Mitsuye Endo's case?", ref: 'How the Camp Ended',
          choices: ['Loyal citizens could not be kept locked up', 'The camp needed bigger buildings', 'The camp had to change its name', 'Topaz Mountain should become a park'] },
        { q: 'What is the rule for visitors at the Topaz camp site?', ref: 'Visiting Today',
          choices: ['Leave every rock, plant, and object where it is', 'Visitors may keep up to five rocks', 'Collecting is allowed with a free permit', 'Only topaz crystals may be taken'] }
      ],
      think: 'If you found a red beryl or a perfect topaz crystal at Topaz Mountain, what would you do with it, and why?'
    }
  },
  {
    id: "alkali-metals",
    title: "The Alkali Metals: The Wild Family of the Periodic Table",
    voice: "plain",
    intro: "On the far left side of the periodic table, the chart scientists use to organize every element, lives a family of metals so wild that they fizz, zoom, and even catch fire when they touch water. They are called the alkali metals, and the story of how people found them is full of electricity, rainbows of light, and one very excited scientist.",
    sections: [
      { title: "Meet the Family", text: [
        "The alkali metals are the six elements in the first column, or group, of the periodic table. From top to bottom they are lithium, sodium, potassium, rubidium, cesium, and francium. Hydrogen sits at the top of that column too, but it is a gas, so it is not part of the family.",
        "The name alkali comes from an old Arabic word that means plant ashes. Long ago, people made soap and glass using ashes from burned plants, and those ashes were full of sodium and potassium."
      ]},
      { title: "Soft, Shiny, and Restless", text: [
        "Most people think of metal as hard, like a steel spoon. Alkali metals are so soft that you could cut some of them with a butter knife. When freshly cut they shine like silver, but the shine fades in seconds as the metal reacts with the air.",
        "The reason they are so restless is tiny. Every atom of an alkali metal has one lonely electron on its outside, and it is very eager to give that electron away to other atoms. Because they react so easily, alkali metals are never found as pure metal in nature. They are always hiding inside other materials, like salt and rocks. Scientists store pure sodium and potassium under oil to keep air and water away."
      ]},
      { title: "Water and Fire", text: [
        "Drop a small piece of an alkali metal into water and things get exciting fast. Lithium fizzes. Sodium zooms across the top of the water and may burst into flame. Potassium catches fire right away with a purple flame. The farther down the column you go, the wilder the reaction gets.",
        "Lithium, sodium, and potassium are also so light that they float on water. These metals can burn skin and start fires, so only trained scientists handle them, with goggles and safety gear."
      ]},
      { title: "Davy's Electric Discovery", text: [
        "For a long time, nobody could pull sodium or potassium out of the materials that held them. In 1807, an English chemist named Humphry Davy tried something new. He used a huge battery to send electricity through melted potash, a material made from plant ashes.",
        "Shiny little drops of metal popped out and some burst into flame. Davy had discovered potassium! A few days later he used the same trick to discover sodium. His cousin, who worked with him, wrote that Davy was so happy he bounced around the room with joy."
      ]},
      { title: "Mystery Letters", text: [
        "Each element has a short symbol on the periodic table. Most make sense, like Li for lithium. But sodium's symbol is Na, and potassium's is K. Where did those letters come from?",
        "They come from old Latin names. Na stands for natrium, and K stands for kalium. Potassium's English name comes from potash, since that is where Davy first found it."
      ]},
      { title: "Lithium, the Stone Metal", text: [
        "In 1817, a young Swedish chemist named Johan August Arfwedson was studying a rock called petalite when he found a new element inside it. Since it came from a stone, it was named lithium, from the Greek word lithos, which means stone.",
        "Lithium is the lightest metal of all. A chunk of lithium weighs only about half as much as the same size chunk of water."
      ]},
      { title: "Colors in a Flame", text: [
        "In 1859, two German scientists, Robert Bunsen and Gustav Kirchhoff, built a tool called a spectroscope. It splits the light from a flame into a rainbow of thin, colored lines. Every element makes its own pattern of lines, like a fingerprint.",
        "In 1860, they tested mineral water and saw bright blue lines no one had ever seen. They named the new element cesium, from a Latin word meaning sky blue. The next year they found dark red lines in a mineral and named that element rubidium, from a Latin word meaning deep red.",
        "Alkali metals color flames in other ways too. Lithium burns red, sodium burns yellow orange, and potassium burns purple. That is why some of them are used to color fireworks."
      ]},
      { title: "The Last One Found in Nature", text: [
        "The final member of the family was found in 1939 by Marguerite Perey, a French scientist who worked in the Paris lab started by Marie Curie. She named it francium, after her home country, France.",
        "Francium is radioactive, which means its atoms break apart over time. Its longest lasting form loses half its atoms in about 22 minutes, so only a tiny amount exists on Earth at any moment. It was the last element ever discovered in nature. Every element found since then has been made by scientists in a lab."
      ]},
      { title: "Lithium Powers Your Gadgets", text: [
        "If you have used a tablet, a phone, or a laptop, you have used lithium. Lithium ion batteries are light and hold lots of energy, so they power most of our gadgets.",
        "The same kind of battery, only much bigger, runs electric cars. Because so many people want these batteries, lithium has become one of the most important metals in the world."
      ]},
      { title: "Sodium and Potassium Keep You Going", text: [
        "Sodium is in the salt you sprinkle on food. Table salt is a mix of sodium and another element called chlorine, and it is safe to eat even though both parts are wild on their own. Sodium is also used in yellow orange street lights.",
        "Potassium is found in foods like bananas and potatoes. Your body uses sodium and potassium to send signals along your nerves and to help your muscles move, including your heart. Farmers also add potassium to fertilizer to help crops grow."
      ]},
      { title: "Clocks That Keep Perfect Time", text: [
        "Cesium has an amazing job. Its atoms vibrate at a perfectly steady speed, so scientists use them to build atomic clocks, the most accurate clocks there are. In fact, one second is officially defined as the time it takes a cesium atom to vibrate 9,192,631,770 times.",
        "Atomic clocks using cesium and rubidium fly on GPS satellites. That perfect timing is how a map app can tell exactly where you are."
      ]},
      { title: "Francium the Mystery", text: [
        "Francium is so rare and disappears so fast that no one has ever seen a piece of it big enough to look at. Scientists study it only a few atoms at a time.",
        "That makes francium the only alkali metal with no everyday use. It is still important, though, because studying it helps scientists understand how atoms work."
      ]}
    ],
    closing: "From the battery in a tablet to the salt on your fries to the clocks that guide satellites, the wild alkali metal family is working for you every single day.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "Why is hydrogen not part of the alkali metal family?", ref: "Meet the Family",
          choices: ["It is a gas", "It is too heavy", "It was found too late", "It is purple"] },
        { q: "What does the old Arabic word behind the name alkali mean?", ref: "Meet the Family",
          choices: ["Plant ashes", "Shiny rock", "Hot fire", "Salty sea"] },
        { q: "Why are alkali metals never found as pure metal in nature?", ref: "Soft, Shiny, and Restless",
          choices: ["They react too easily", "They are too heavy", "They melt in sunlight", "They were all used up"] },
        { q: "How do scientists store pure sodium and potassium?", ref: "Soft, Shiny, and Restless",
          choices: ["Under oil", "In a glass of water", "In a warm oven", "Inside a banana"] },
        { q: "What happens to the reaction with water as you go down the column?", ref: "Water and Fire",
          choices: ["It gets wilder", "It gets calmer", "It stops completely", "It turns the water green"] },
        { q: "In 1807, what did Humphry Davy send through melted potash?", ref: "Davy's Electric Discovery",
          choices: ["Electricity", "Cold water", "Sunlight", "Sound waves"] },
        { q: "Which element did Davy discover first?", ref: "Davy's Electric Discovery",
          choices: ["Potassium", "Lithium", "Cesium", "Francium"] },
        { q: "Where does the symbol Na for sodium come from?", ref: "Mystery Letters",
          choices: ["The Latin name natrium", "The word nature", "Davy's middle name", "The word nail"] },
        { q: "Why was lithium given its name?", ref: "Lithium, the Stone Metal",
          choices: ["It was found in a stone", "It is very bright", "It floats on oil", "It was found in a lake"] },
        { q: "What tool did Bunsen and Kirchhoff use to find cesium and rubidium?", ref: "Colors in a Flame",
          choices: ["A spectroscope", "A telescope", "A thermometer", "A microscope"] },
        { q: "What color lines led to the discovery of cesium?", ref: "Colors in a Flame",
          choices: ["Sky blue", "Dark red", "Bright yellow", "Lime green"] },
        { q: "Who discovered francium in 1939?", ref: "The Last One Found in Nature",
          choices: ["Marguerite Perey", "Marie Curie", "Humphry Davy", "Robert Bunsen"] },
        { q: "Which alkali metal is used in the batteries of most tablets and phones?", ref: "Lithium Powers Your Gadgets",
          choices: ["Lithium", "Sodium", "Rubidium", "Francium"] },
        { q: "What does your body use sodium and potassium for?", ref: "Sodium and Potassium Keep You Going",
          choices: ["Sending signals along your nerves", "Growing longer hair", "Seeing in the dark", "Making your bones glow"] },
        { q: "Which element's vibrations are used to officially define one second?", ref: "Clocks That Keep Perfect Time",
          choices: ["Cesium", "Potassium", "Lithium", "Sodium"] }
      ],
      think: "If you discovered a brand new element, what would you name it, and what would you want it to be able to do?"
    }
  },
  {
    id: "chemical-bonds",
    title: "How Atoms Stick Together: The Science of Bonds",
    voice: "plain",
    intro: "Everything around you, from the water you drink to the pencil in your hand, is made of atoms holding on to each other. The ways atoms hold on are called chemical bonds, and once you understand them, you can explain why salt makes cubes, why ice floats, and why a diamond is so hard.",
    sections: [
      { title: "Tiny Building Blocks", text: [
        "An atom is the smallest piece of an element that still acts like that element. Atoms are so small that a single drop of water holds more than a billion trillion of them.",
        "Every atom has a center called the nucleus, which holds particles called protons and neutrons. Zooming around the nucleus are even tinier particles called electrons. Protons have a positive electric charge and electrons have a negative charge. Opposite charges pull on each other, which keeps the electrons close to the nucleus. Scientists know of 118 different elements, and each one has its own number of protons."
      ]},
      { title: "Electron Shells", text: [
        "Electrons do not move around the nucleus in a random jumble. They are arranged in layers called shells, a bit like the layers of an onion. The first shell, closest to the nucleus, can hold only 2 electrons. The next shell can hold 8.",
        "The electrons in the outermost shell are the important ones for bonding. Scientists call them valence electrons (say VAY-lents). They are the ones that get shared, given away, or grabbed when atoms connect."
      ]},
      { title: "Why Atoms Bond", text: [
        "Atoms are most stable when their outer shell is full. A few elements, like helium, neon, and argon, already have full outer shells. They are called the noble gases, and they almost never bond with anything. They are already content.",
        "Most other atoms have outer shells that are only partly full. To fill them up, atoms give away, take, or share electrons with other atoms. That is what a chemical bond is: two atoms held together because of how they handle their electrons. There are three main kinds of bonds: ionic, covalent, and metallic."
      ]},
      { title: "The Giver and the Taker", text: [
        "Sodium has just one electron in its outer shell, and it is eager to give it away. Chlorine has seven electrons in its outer shell, so it needs just one more to be full. When they meet, sodium hands its electron to chlorine.",
        "Now sodium has one more proton than electrons, so it has a positive charge. Chlorine has one extra electron, so it has a negative charge. Atoms with a charge are called ions (say EYE-ons). The positive sodium ion and the negative chloride ion pull on each other, and that pull is called an ionic bond.",
        "Here is the amazing part. Sodium is a wild metal that bursts into flame in water, and chlorine is a poisonous gas. Bonded together, they make sodium chloride, which is ordinary table salt. Billions of these ions stack up in a neat pattern, which is why a grain of salt under a magnifying glass looks like a tiny cube."
      ]},
      { title: "Sharing Electrons", text: [
        "Not every pair of atoms has a giver and a taker. Sometimes both atoms want electrons, so they share. When two atoms share a pair of electrons, they form a covalent bond (say co-VAY-lent). The shared electrons count toward both atoms' outer shells, so both get closer to full.",
        "In 1916, an American chemist named Gilbert Lewis came up with the idea that a covalent bond is a shared pair of electrons. He drew atoms as letters with dots around them to show their outer electrons. Students all over the world still draw these Lewis dot diagrams today."
      ]},
      { title: "Molecules and Formulas", text: [
        "When atoms join with covalent bonds, they form a molecule. Scientists write molecules with a short code called a formula. Water is H2O, which means two hydrogen atoms bonded to one oxygen atom. Carbon dioxide, the gas you breathe out, is CO2: one carbon atom and two oxygen atoms.",
        "Atoms can also share more than one pair of electrons. Sharing two pairs makes a double bond, and sharing three pairs makes a triple bond. The oxygen you breathe is two oxygen atoms joined by a double bond. Nitrogen, which makes up about 78 percent of the air, is two nitrogen atoms joined by a triple bond. That bond is so strong that nitrogen hardly reacts with anything."
      ]},
      { title: "Water, the Lopsided Molecule", text: [
        "Sharing is not always fair. In a water molecule, the oxygen atom pulls on the shared electrons harder than the hydrogen atoms do. The electrons spend more time near the oxygen, so that end of the molecule is slightly negative and the hydrogen ends are slightly positive.",
        "A water molecule is also bent, shaped a bit like a boomerang. Because it has a slightly negative end and a slightly positive end, scientists call it a polar molecule, like a magnet with two poles."
      ]},
      { title: "Hydrogen Bonds", text: [
        "Because water molecules have charged ends, the positive hydrogen end of one water molecule is attracted to the negative oxygen end of another. This pull between molecules is called a hydrogen bond. It is much weaker than the bonds inside a molecule, but there are so many of them that they matter a lot.",
        "Hydrogen bonds make water molecules cling together. That is why water forms round drops and why some insects can walk across the top of a pond. When water freezes, hydrogen bonds lock the molecules into an open pattern with lots of space. That makes ice lighter than liquid water, so ice floats."
      ]},
      { title: "Metallic Bonds", text: [
        "Metals bond in their own special way. In a piece of metal, each atom lets go of its outer electrons, and those electrons drift freely among all the atoms. Scientists call this a sea of electrons. The positive metal atoms are held together by the sea of negative electrons flowing around them.",
        "This explains a lot about metals. Because the electrons can flow, metals carry electricity, which is why wires are made of copper. And because the atoms can slide past each other without breaking their bonds, metals bend instead of shattering like glass."
      ]},
      { title: "Carbon the Connector", text: [
        "Carbon has four electrons in its outer shell, so it can form four bonds at once. That makes it the champion connector. Carbon atoms can link into long chains, rings, and branching shapes, and they form the molecules found in every living thing.",
        "The way carbon atoms bond can change everything. In diamond, every carbon atom is bonded tightly to four others in all directions, making it the hardest natural material on Earth. In graphite, the carbon atoms form flat sheets that slide past each other easily. Graphite is the gray stuff in a pencil, and those sliding sheets are why it leaves a mark on paper. Diamond and graphite are both pure carbon. Only the bonds are different."
      ]},
      { title: "Breaking and Making Bonds", text: [
        "A chemical reaction happens when bonds break and new bonds form, rearranging atoms into new substances. Atoms are never created or destroyed in a reaction. They just find new partners.",
        "When you mix baking soda and vinegar, their atoms rearrange, and one of the new molecules is carbon dioxide gas, which makes all those bubbles. When wood burns, the new bonds that form are stronger than the old ones, and the extra energy comes out as heat and light."
      ]},
      { title: "The Scientist of Bonds", text: [
        "One of the most famous scientists to study bonds was an American chemist named Linus Pauling. He explained why atoms bond in the shapes they do and how strongly different atoms pull on electrons.",
        "In 1954, Pauling won the Nobel Prize in Chemistry for his research into the nature of the chemical bond. His book about bonds became one of the most important chemistry books ever written."
      ]}
    ],
    closing: "Every time you sprinkle salt, sip water, or write with a pencil, you are seeing billions of tiny bonds at work, holding the whole world together one electron at a time.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "What kind of electric charge does an electron have?", ref: "Tiny Building Blocks",
          choices: ["Negative", "Positive", "No charge at all", "It changes every second"] },
        { q: "How many electrons can the first electron shell hold?", ref: "Electron Shells",
          choices: ["2", "8", "1", "18"] },
        { q: "What are the electrons in an atom's outermost shell called?", ref: "Electron Shells",
          choices: ["Valence electrons", "Nucleus electrons", "Noble electrons", "Sleepy electrons"] },
        { q: "Why do noble gases like neon almost never bond?", ref: "Why Atoms Bond",
          choices: ["Their outer shells are already full", "They have no electrons", "They are too heavy to move", "They only bond on cold days"] },
        { q: "In table salt, what does sodium do with its outer electron?", ref: "The Giver and the Taker",
          choices: ["Gives it to chlorine", "Shares it with hydrogen", "Keeps it forever", "Throws it into the air"] },
        { q: "What is an atom with an electric charge called?", ref: "The Giver and the Taker",
          choices: ["An ion", "A molecule", "A shell", "A crystal"] },
        { q: "What shape do salt grains look like under a magnifying glass?", ref: "The Giver and the Taker",
          choices: ["Tiny cubes", "Tiny spheres", "Tiny stars", "Tiny pyramids"] },
        { q: "In a covalent bond, what do two atoms do with electrons?", ref: "Sharing Electrons",
          choices: ["Share a pair", "Trade them for protons", "Throw them away", "Hide them in the nucleus"] },
        { q: "What did Gilbert Lewis use to show an atom's outer electrons?", ref: "Sharing Electrons",
          choices: ["Dots around letters", "Colored stripes", "Tiny triangles", "Numbers in circles"] },
        { q: "What kind of bond holds the two atoms of a nitrogen molecule together?", ref: "Molecules and Formulas",
          choices: ["A triple bond", "A single bond", "A double bond", "A metallic bond"] },
        { q: "In a water molecule, which end is slightly negative?", ref: "Water, the Lopsided Molecule",
          choices: ["The oxygen end", "The hydrogen ends", "Neither end", "Whichever end faces up"] },
        { q: "Why does ice float?", ref: "Hydrogen Bonds",
          choices: ["Hydrogen bonds lock it into an open pattern", "Ice is full of tiny air bubbles", "Frozen water loses its oxygen", "Cold things always float"] },
        { q: "Why can metals carry electricity?", ref: "Metallic Bonds",
          choices: ["Their electrons flow freely", "They have no electrons", "Their atoms are very large", "They are always cold"] },
        { q: "How are diamond and graphite different?", ref: "Carbon the Connector",
          choices: ["Their carbon atoms bond differently", "Diamond has no carbon in it", "Graphite is made of metal", "Diamond is made of salt"] },
        { q: "What did Linus Pauling win the Nobel Prize for in 1954?", ref: "The Scientist of Bonds",
          choices: ["His research on the chemical bond", "Discovering the electron", "Inventing the pencil", "Finding the element neon"] }
      ],
      think: "If you could design a brand new molecule, which atoms would you put together, and what would you want your molecule to do?"
    }
  },
  {
    id: "think-like-a-debater-part-1",
    title: "Think Like a Debater, Part I: What Makes a Good Argument",
    voice: "plain",
    intro: "People argue all the time, but a good argument is not a shouting match. It is a way of giving someone reasons to believe something, and it has three parts you can learn to spot. This is Part I of a three part series about thinking like a debater.",
    sections: [
      { title: "What Is an Argument?", text: [
        "When most people hear the word argument, they picture two people yelling at each other. But in thinking and debate, an argument means something different. An argument is a set of reasons that tries to show something is true.",
        "Every good argument has three parts: a claim, evidence, and reasoning. Once you learn to spot these three parts, you can test any argument you hear, whether it comes from a friend, a commercial, or a book. You can also build stronger arguments of your own."
      ]},
      { title: "An Old Idea", text: [
        "People have studied arguments for a very long time. More than 2,300 years ago, a Greek thinker named Aristotle wrote about how to tell good reasoning from bad reasoning. The study of good reasoning is called logic, and Aristotle is often called the father of logic.",
        "Aristotle believed that clear thinking was a skill people could learn and practice. Students still study his ideas today."
      ]},
      { title: "The Claim", text: [
        "The claim is the main point, the thing the person wants you to believe. \"Our town needs a new park.\" \"Cats make better pets than dogs.\" \"It's going to rain this afternoon.\" Each of these is a claim.",
        "A good claim is clear. \"Parks are nice\" is fuzzy, but \"Our town needs a bigger park with a dog area\" tells you exactly what the person thinks. If you can't figure out what someone's claim is, it is hard to decide whether you agree."
      ]},
      { title: "The Evidence", text: [
        "Evidence is the information that supports the claim. It can be facts, measurements, things someone saw, examples, or what experts have found. If you claim it will rain this afternoon, your evidence might be dark clouds in the sky and a weather forecast that says rain is very likely.",
        "A claim without evidence is just a statement. Saying something loudly, or saying it over and over, does not make it true. Good thinkers always ask, \"How do you know?\""
      ]},
      { title: "The Reasoning", text: [
        "Reasoning is the bridge that connects the evidence to the claim. It explains why the evidence supports the point. Dark clouds are evidence, but the reasoning is that dark clouds like these usually bring rain.",
        "Sometimes the evidence is true but the bridge is broken. Imagine someone says, \"My friend has a red bike and she is fast, so red bikes make you fast.\" The facts may be true, but the reasoning does not hold up. Her speed probably comes from her strong legs, not the paint."
      ]},
      { title: "Facts and Opinions", text: [
        "A fact is something that can be checked and shown to be true or false. \"Chocolate comes from cacao beans\" is a fact. An opinion is what someone thinks or prefers. \"Chocolate is the best flavor\" is an opinion.",
        "Opinions are not bad. Everyone has them, and arguing about them can be fun. But a strong argument for an opinion still uses facts as evidence. \"Chocolate is the best flavor because it won our class taste test\" is much stronger than \"Chocolate is the best because I said so.\""
      ]},
      { title: "How Strong Is the Evidence?", text: [
        "Not all evidence is equally strong. If one person says a spelling app made him a better speller, that is one story. A study that tested hundreds of students is much stronger evidence, because it doesn't depend on one person's luck or memory.",
        "It also matters where evidence comes from. Ask two questions. Was this source in a position to know? And does the source gain something if you believe it? A weather scientist knows a lot about storms. A company selling umbrellas might have a reason to say rain is coming."
      ]},
      { title: "Testing It Again", text: [
        "Scientists have a great way to check evidence: they repeat the experiment. If a result is real, other scientists should get the same result when they try it again. This is called replication (say rep-lih-KAY-shun).",
        "A famous example is the marshmallow test. In the 1960s and early 1970s, a scientist named Walter Mischel at Stanford University offered young children one marshmallow now, or two if they waited. Later, his team reported that kids who waited longer tended to do better as teenagers. In 2018, a team led by Tyler Watts tried the idea again with about 900 children. They found the link was much weaker than people had thought. Testing again made the answer more accurate."
      ]},
      { title: "Changing Your Mind", text: [
        "Good thinkers are willing to change their minds when they find better evidence. That is not losing. It is learning.",
        "In 2006, scientists did exactly that. Since its discovery in 1930, Pluto had been called the ninth planet. But astronomers kept finding other icy worlds in the same part of space, including one called Eris that is about the same size as Pluto. Scientists agreed on a new definition of a planet, and Pluto became a dwarf planet. They changed their minds because the evidence changed."
      ]},
      { title: "Build Your Own", text: [
        "You can build a strong argument with a simple pattern: claim, because, for example. \"Our school should have a reading corner, because it would give students a quiet place to read. For example, the library is so full at lunch that some kids can't find a seat.\"",
        "Then test your own argument the way you would test someone else's. Is your claim clear? Is your evidence true and strong? Does your reasoning really connect them? If something is weak, fix it before you share it. In Part II, you will learn about sneaky arguments that sound good but are broken inside."
      ]}
    ],
    closing: "A claim tells you what someone thinks, evidence shows why, and reasoning connects the two, so the next time someone tries to convince you of something, you will know exactly what to look for.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "In thinking and debate, what is an argument?", ref: "What Is an Argument?",
          choices: ["A set of reasons to show something is true", "A loud fight between two people", "A list of your favorite things", "A story with a happy ending"] },
        { q: "What are the three parts of a good argument?", ref: "What Is an Argument?",
          choices: ["Claim, evidence, and reasoning", "Question, answer, and guess", "Beginning, middle, and end", "Facts, feelings, and jokes"] },
        { q: "Who is often called the father of logic?", ref: "An Old Idea",
          choices: ["Aristotle", "Albert Einstein", "Walter Mischel", "Isaac Newton"] },
        { q: "What is the claim in an argument?", ref: "The Claim",
          choices: ["The main point someone wants you to believe", "The proof that backs up the point", "The bridge between the ideas", "The loudest part of the argument"] },
        { q: "What question do good thinkers always ask?", ref: "The Evidence",
          choices: ["How do you know?", "Who said it first?", "Is it popular?", "Can I have a snack?"] },
        { q: "What does reasoning do in an argument?", ref: "The Reasoning",
          choices: ["Connects the evidence to the claim", "Makes the argument longer", "Adds a funny story", "Repeats the claim louder"] },
        { q: "What is wrong with the argument that red bikes make you fast?", ref: "The Reasoning",
          choices: ["The reasoning does not hold up", "Bikes cannot be painted red", "The friend does not own a bike", "Fast people never ride bikes"] },
        { q: "Which of these is an opinion?", ref: "Facts and Opinions",
          choices: ["Chocolate is the best flavor", "Chocolate comes from cacao beans", "Ice cream is a frozen food", "Cacao beans grow on trees"] },
        { q: "Which is usually the strongest evidence?", ref: "How Strong Is the Evidence?",
          choices: ["A study that tested hundreds of students", "One story from one person", "A rumor heard at recess", "A guess made in a hurry"] },
        { q: "Why might an umbrella company's rain forecast deserve a second look?", ref: "How Strong Is the Evidence?",
          choices: ["It gains something if you believe it", "Umbrella makers cannot see the sky", "Companies are not allowed to talk about weather", "It only sells umbrellas in summer"] },
        { q: "What is it called when scientists repeat an experiment to check a result?", ref: "Testing It Again",
          choices: ["Replication", "Imagination", "Decoration", "Celebration"] },
        { q: "What did the 2018 marshmallow study find?", ref: "Testing It Again",
          choices: ["The link was weaker than people thought", "Every child ate the marshmallow", "Waiting made kids grow taller", "Marshmallows make kids smarter"] },
        { q: "What happened to Pluto in 2006?", ref: "Changing Your Mind",
          choices: ["It became a dwarf planet", "It was discovered for the first time", "It became the biggest planet", "It disappeared from space"] },
        { q: "Why did scientists change their minds about Pluto?", ref: "Changing Your Mind",
          choices: ["They found other icy worlds like Eris", "Pluto suddenly got much smaller", "Pluto moved out of the solar system", "A famous singer asked them to"] },
        { q: "What simple pattern can help you build an argument?", ref: "Build Your Own",
          choices: ["Claim, because, for example", "First, next, last", "Who, what, where", "Ready, set, go"] }
      ],
      think: "What is something you changed your mind about, and what made you change it?"
    }
  },
  {
    id: "think-like-a-debater-part-2",
    title: "Think Like a Debater, Part II: Sneaky Arguments",
    voice: "plain",
    intro: "Some arguments sound smart but are broken on the inside. These sneaky arguments are called fallacies, and once you learn their names, you will start spotting them everywhere, especially in commercials. This is Part II of a three part series about thinking like a debater.",
    sections: [
      { title: "What Is a Fallacy?", text: [
        "A good argument has three parts: a claim, evidence that supports it, and reasoning that connects the two. A fallacy (say FAL-uh-see) is a mistake in reasoning. The argument might sound convincing, but the connection between the evidence and the claim is broken.",
        "The word comes from a Latin word that means a trick. Some people use fallacies on purpose to fool others. But most of the time, people use them by accident, and that includes all of us. Learning their names helps you catch them in other people's arguments and in your own."
      ]},
      { title: "The Bandwagon", text: [
        "\"Everyone has one, so you should get one too!\" This is the bandwagon fallacy. It says something must be good or true because lots of people like it or believe it.",
        "The name comes from old parades, where a wagon carried the band. People who wanted to join the fun would jump on the bandwagon. But popular does not mean true. For hundreds of years, most people believed the Sun moved around the Earth, and they were all wrong."
      ]},
      { title: "The Straw Man", text: [
        "Imagine your friend says, \"I think we should have less homework on weekends.\" Someone answers, \"So you think kids should never have to learn anything? That's silly!\" But your friend never said that. The person changed the argument into a weaker, sillier one that is easier to knock down.",
        "This is called a straw man. A scarecrow stuffed with straw is much easier to knock over than a real person. When someone attacks a twisted version of your idea instead of the real one, they are fighting a straw man."
      ]},
      { title: "Attacking the Person", text: [
        "\"Don't listen to her idea for the science fair. She can't even tie her shoes right!\" This argument attacks the person instead of the idea. Whether someone can tie shoes has nothing to do with whether their science idea is good.",
        "This fallacy has a Latin name, ad hominem (say ad HOM-ih-nem), which means \"to the person.\" A good argument talks about the idea, not about the person who shared it."
      ]},
      { title: "The Slippery Slope", text: [
        "\"If we let you stay up 15 minutes late tonight, next you'll want to stay up an hour late, then all night, and then you'll sleep through school forever!\" This is a slippery slope. It claims one small step will lead to a chain of bigger and bigger disasters, without showing evidence for each step.",
        "Sometimes one thing really does lead to another. The fallacy happens when someone skips the evidence and just assumes the worst. Ask, \"How do we know each step will actually happen?\""
      ]},
      { title: "The False Choice", text: [
        "\"Either you love soccer, or you hate sports.\" This argument pretends there are only two choices when there are really many more. You could love swimming, like soccer a little, or enjoy watching sports without playing. This is called a false choice.",
        "Watch out for the words either and or. Sometimes there really are only two choices, but often there is a whole rainbow of options in between."
      ]},
      { title: "False Cause", text: [
        "\"I wore my lucky socks and our team won, so my socks made us win!\" This mistake assumes that because one thing happened before another, the first thing caused the second. It is called false cause.",
        "A rooster crows every morning just before the sun comes up. That does not mean the rooster makes the sun rise. Just because two things happen in order does not mean one caused the other."
      ]},
      { title: "The Ice Cream Puzzle", text: [
        "Here is a puzzle. In summer, ice cream sales go up, and so do sunburns. Does ice cream cause sunburns? Of course not! Both things go up in hot, sunny weather. The sunshine is the hidden cause behind both.",
        "When two things go up and down together, scientists say they are correlated (say KOR-uh-lay-ted). But things that are correlated don't always cause each other. Before you believe that one thing causes another, look for a hidden cause."
      ]},
      { title: "Cherry Picking", text: [
        "Imagine a cereal box that says, \"Kids love it! One boy said, 'Best cereal ever!'\" But what if 99 other kids said it tasted like cardboard? Choosing only the evidence that helps your side and hiding the rest is called cherry picking.",
        "The name comes from picking cherries. If you show off only the ripest, best looking ones, people might think the whole tree is perfect. To catch cherry picking, ask, \"What evidence am I not seeing?\""
      ]},
      { title: "The Wrong Expert", text: [
        "Experts are a great source of evidence, as long as they are experts in the right thing. A famous basketball player knows a lot about basketball. But when that player appears in a commercial for a snack, being great at basketball does not make them an expert on snacks or health.",
        "This is called an appeal to the wrong authority. Before you trust someone's opinion, ask, \"Is this person an expert in this exact subject?\""
      ]},
      { title: "Spotting Fallacies in Ads", text: [
        "Commercials are great places to hunt for fallacies, because their whole job is to convince you. \"The toy everyone is talking about!\" is a bandwagon. A movie star selling toothpaste is the wrong expert. A few happy reviews printed on a box might be cherry picking.",
        "That doesn't mean everything in an ad is false. It means you should look for real evidence before you decide."
      ]},
      { title: "Catching Fallacies Kindly", text: [
        "When you spot a fallacy, it is tempting to shout, \"Gotcha!\" But it works better to ask a friendly question, like \"Is that really the only choice?\" or \"How do we know the socks did it?\" Questions help everyone think, and nobody feels attacked.",
        "One more important rule: an argument with a fallacy in it is not automatically wrong. Lucky socks can't win a game, but the team really did win! A fallacy only means that argument doesn't prove its point. In Part III, you will learn how to use all these skills in a real debate."
      ]}
    ],
    closing: "Sneaky arguments are everywhere, but now you know their names, and a fallacy you can name is a fallacy that can't fool you.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "What is a fallacy?", ref: "What Is a Fallacy?",
          choices: ["A mistake in reasoning", "A true fact", "A kind of fruit", "A debate trophy"] },
        { q: "What does the Latin word behind fallacy mean?", ref: "What Is a Fallacy?",
          choices: ["A trick", "A gift", "A song", "A ladder"] },
        { q: "Which of these is a bandwagon argument?", ref: "The Bandwagon",
          choices: ["Everyone has one, so you should too", "Scientists tested it many times", "It won a safety award", "The weather report predicts rain"] },
        { q: "What did most people believe for hundreds of years that turned out to be wrong?", ref: "The Bandwagon",
          choices: ["The Sun moved around the Earth", "Fish could breathe air", "Cats could talk", "Rain fell upward"] },
        { q: "Why is the straw man fallacy named after a scarecrow?", ref: "The Straw Man",
          choices: ["A straw figure is easier to knock over than a real person", "Farmers invented the fallacy", "Scarecrows are good at arguing", "Debaters used to wear straw hats"] },
        { q: "What does an ad hominem argument attack?", ref: "Attacking the Person",
          choices: ["The person instead of the idea", "The evidence instead of the claim", "The judge instead of the team", "The weather instead of the game"] },
        { q: "A slippery slope claims that one small step will lead to what?", ref: "The Slippery Slope",
          choices: ["A chain of bigger disasters", "A prize at the end", "A happy surprise", "Nothing at all"] },
        { q: "\"Either you love soccer, or you hate sports\" is an example of which fallacy?", ref: "The False Choice",
          choices: ["False choice", "Straw man", "Cherry picking", "Wrong expert"] },
        { q: "Why doesn't a rooster's crow make the sun rise?", ref: "False Cause",
          choices: ["Happening first doesn't mean causing", "Roosters sleep through every sunrise", "The sun rises in the evening", "Roosters only crow at noon"] },
        { q: "What is the hidden cause behind both ice cream sales and sunburns going up?", ref: "The Ice Cream Puzzle",
          choices: ["Hot, sunny weather", "Sugar in the ice cream", "Cold winter days", "Melting ice cream cones"] },
        { q: "What do scientists call two things that go up and down together?", ref: "The Ice Cream Puzzle",
          choices: ["Correlated", "Combined", "Canceled", "Copied"] },
        { q: "What is cherry picking?", ref: "Cherry Picking",
          choices: ["Showing only the evidence that helps your side", "Asking an expert in the right subject", "Repeating an experiment to check it", "Choosing the fairest judge"] },
        { q: "Why is a basketball star selling a snack an example of the wrong expert?", ref: "The Wrong Expert",
          choices: ["Basketball skill doesn't make someone a snack expert", "Basketball players are not allowed to eat snacks", "Snacks can't be shown in commercials", "The player is too tall to fit on screen"] },
        { q: "Why are commercials good places to hunt for fallacies?", ref: "Spotting Fallacies in Ads",
          choices: ["Their job is to convince you", "They are always very long", "They only play at night", "They never use pictures"] },
        { q: "If an argument contains a fallacy, what does that mean?", ref: "Catching Fallacies Kindly",
          choices: ["The argument doesn't prove its point", "The claim is definitely false", "The person is lying on purpose", "The argument wins automatically"] }
      ],
      think: "Think of a commercial or ad you have seen. Which sneaky argument did it use, and how would you explain the trick to a friend?"
    }
  },
  {
    id: "think-like-a-debater-part-3",
    title: "Think Like a Debater, Part III: How Debate Works",
    voice: "plain",
    intro: "A debate is an argument with rules, where two sides take turns making their case and a judge decides who argued better. It is where good arguments, careful listening, and spotting sneaky reasoning all come together. This is Part III of a three part series about thinking like a debater.",
    sections: [
      { title: "What Is a Debate?", text: [
        "A debate is not a fight. It is a contest of ideas with rules. Two sides argue about the same topic, take turns speaking, and follow time limits. Usually a judge or a group of judges listens and decides which side made the stronger case.",
        "Here is a surprising thing: in a debate, you are not really trying to convince the other team. You are trying to convince the judge. That means speaking clearly, staying calm, and explaining your evidence so that anyone could follow it."
      ]},
      { title: "Aristotle's Three Tools", text: [
        "More than 2,300 years ago, the Greek thinker Aristotle wrote a book called Rhetoric about persuasion, the skill of convincing people. He described three main tools a speaker can use.",
        "Ethos (say EE-thos) means trust: people listen to a speaker who seems honest and knows the subject. Pathos (say PAY-thos) means feelings: a story that makes people care can be powerful. Logos (say LOH-gos) means logic: clear reasons and evidence.",
        "Good debaters use all three, but logos is the backbone. A sad story or a confident voice can't make up for weak evidence, and a good judge will notice."
      ]},
      { title: "The Resolution", text: [
        "Every debate starts with a topic written as a statement, called a resolution. For example: \"Resolved: Cats make better pets than dogs.\"",
        "One side, often called the affirmative, argues that the resolution is true. The other side, often called the negative, argues against it. In many debates, the negative side doesn't have to prove that dogs are better. It can win by showing that the affirmative side hasn't proved its claim."
      ]},
      { title: "Taking Turns", text: [
        "Debates follow an order. First come the opening speeches, sometimes called constructive speeches, where each side builds its case with claims, evidence, and reasoning. Many debates also have a cross examination, where one side asks the other side questions.",
        "Next come rebuttals, and finally closing speeches, where each side sums up why it should win. Every speech has a time limit, so debaters have to choose their best points instead of saying everything they can think of."
      ]},
      { title: "Rebuttal", text: [
        "A rebuttal (say rih-BUT-ul) is when you answer the other side's arguments. It is where all your thinking skills come together. Did they make a clear claim? Is their evidence strong, or is it just one story? Does their reasoning really connect? Did they use a fallacy, like a false choice or a bandwagon?",
        "The secret to a good rebuttal is listening. Debaters take notes while the other side talks, so they can answer the actual points, not what they think was said. Answering something the other side never said would be a straw man, the fallacy of attacking a twisted version of someone's idea."
      ]},
      { title: "Arguing the Other Side", text: [
        "In many school debate competitions, debaters don't get to choose their side. They prepare arguments for both sides, and sometimes a coin flip decides which side they argue. That means a debater who loves dogs might have to argue that cats are better.",
        "This might sound unfair, but it is one of the most valuable parts of debate. When you have to argue the other side, you discover that people who disagree with you often have good reasons. It makes you a fairer thinker and a better listener."
      ]},
      { title: "The Steel Man", text: [
        "A straw man is a weak, twisted version of someone's argument. Good debaters do the opposite. They build a steel man: the strongest, fairest version of the other side's argument.",
        "If you can beat the strongest version of an argument, you have truly won. And if you can't, maybe the other side has a point worth thinking about. A good test is to explain the other side's view so well that they would say, \"Yes, that's exactly what I think.\""
      ]},
      { title: "A Famous Debate", text: [
        "In 1858, Abraham Lincoln and Stephen Douglas were running for the same seat in the United States Senate, representing Illinois. They held seven debates in towns across Illinois, and thousands of people came to listen. Their biggest topic was whether slavery should be allowed to spread into new parts of the country.",
        "Douglas won the Senate seat. But the debates made Lincoln famous across the country, and two years later, in 1860, he was elected president. Today, a style of one on one debate used in high schools is called Lincoln Douglas debate in their honor."
      ]},
      { title: "Good Sports", text: [
        "Debaters can argue hard and still be kind. The golden rule of debate is to attack ideas, not people. Many debates end with the two sides shaking hands, and debaters on opposite sides often become good friends.",
        "Losing a debate is not a disaster. Every debate teaches you something, like which evidence worked, which point you forgot, or what the other side saw that you missed."
      ]},
      { title: "Try It at Home", text: [
        "You can hold a debate at home. Pick a fun resolution, like \"Resolved: Summer is the best season\" or \"Resolved: Kids should get to pick dinner once a week.\" Flip a coin to choose sides. Each side gets two minutes to make its case and one minute for a rebuttal. Someone who isn't debating can be the judge.",
        "Then switch sides and debate the same topic again. You may be surprised by how good the other side's arguments are once you have to make them yourself."
      ]},
      { title: "Why Debate Matters", text: [
        "Debate builds skills you will use your whole life. You learn to speak clearly, think on your feet, listen carefully, and back up what you say with evidence. Those skills help in school, in jobs, and in everyday decisions.",
        "Most of all, debate teaches you that a disagreement doesn't have to be a fight. It can be a way for two people to figure out what is true, together."
      ]}
    ],
    closing: "A good debater builds strong arguments, spots sneaky ones, and truly listens to the other side, and those skills make anyone a better thinker, on a debate stage or anywhere else.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "In a debate, who are you mainly trying to convince?", ref: "What Is a Debate?",
          choices: ["The judge", "The other team", "Your own teammates", "The person keeping time"] },
        { q: "In Aristotle's three tools, what does logos mean?", ref: "Aristotle's Three Tools",
          choices: ["Logic", "Trust", "Feelings", "Loudness"] },
        { q: "Which of Aristotle's tools means trust?", ref: "Aristotle's Three Tools",
          choices: ["Ethos", "Pathos", "Logos", "Nachos"] },
        { q: "What is a resolution in a debate?", ref: "The Resolution",
          choices: ["The topic written as a statement", "The prize for the winner", "The judge's final score", "A promise made on New Year's Day"] },
        { q: "Which side argues that the resolution is true?", ref: "The Resolution",
          choices: ["The affirmative", "The negative", "The judge", "The audience"] },
        { q: "What happens during a cross examination?", ref: "Taking Turns",
          choices: ["One side asks the other side questions", "The judge gives a long speech", "Both sides sing a song", "The audience votes on a winner"] },
        { q: "Why do debaters have to choose their best points?", ref: "Taking Turns",
          choices: ["Every speech has a time limit", "Judges only like three points", "Evidence is not allowed", "The microphones turn off"] },
        { q: "What is a rebuttal?", ref: "Rebuttal",
          choices: ["Answering the other side's arguments", "The very first speech of a debate", "The handshake at the end", "The coin flip that picks sides"] },
        { q: "Why do debaters take notes while the other side talks?", ref: "Rebuttal",
          choices: ["So they answer the actual points", "So they can copy the other speech", "So the judge thinks they are busy", "So they can draw pictures"] },
        { q: "In some school competitions, what decides which side a debater argues?", ref: "Arguing the Other Side",
          choices: ["A coin flip", "A spelling test", "A footrace", "A vote by parents"] },
        { q: "What is a steel man?", ref: "The Steel Man",
          choices: ["The strongest, fairest version of the other side", "A weak, twisted version of an argument", "A robot that judges debates", "A metal trophy for the winner"] },
        { q: "In 1858, what were Lincoln and Douglas running for?", ref: "A Famous Debate",
          choices: ["A seat in the United States Senate", "President of the United States", "Governor of Illinois", "Mayor of Chicago"] },
        { q: "How many debates did Lincoln and Douglas hold?", ref: "A Famous Debate",
          choices: ["Seven", "Two", "Twelve", "Fifty"] },
        { q: "What is the golden rule of debate?", ref: "Good Sports",
          choices: ["Attack ideas, not people", "Always speak the loudest", "Never take notes", "Talk as fast as you can"] },
        { q: "After a debate at home, what does the article suggest doing next?", ref: "Try It at Home",
          choices: ["Switch sides and debate again", "Declare yourself the winner", "Never debate that topic again", "Ask the judge to leave"] }
      ],
      think: "Pick something you believe, then write the best argument someone could make against it. Was it harder or easier than you expected?"
    }
  },
  {
    id: "war-that-changed-everything-part-1",
    title: "The War That Changed Everything, Part I: The Powder Keg",
    voice: "plain",
    intro: "In the summer of 1914, one wrong turn on a city street helped start a war that would pull in most of the world. This is Part I of a five part series about World War I and the years after it, and it explains how Europe became a powder keg just waiting for a spark.",
    sections: [
      { title: "Europe in 1914", text: [
        "In 1914, much of the world was ruled by a handful of powerful European countries. Many of them had kings or emperors. Some of those rulers were even related. King George V of Britain, Kaiser Wilhelm II of Germany, and Tsar Nicholas II of Russia were all cousins.",
        "France and Germany, two of Europe's biggest powers, had not fought each other in more than 40 years, and many people believed a huge war could never happen again. They were wrong. Historians often remember the four big causes of World War I with the word MAIN: militarism, alliances, imperialism, and nationalism."
      ]},
      { title: "Militarism", text: [
        "Militarism (say MIL-ih-tuh-riz-um) means a country believes a big, powerful military is the best way to be strong and safe. Before 1914, the biggest countries in Europe were building larger and larger armies and drawing up detailed plans for war.",
        "Britain and Germany were also in a race to build the biggest navy. In 1906, Britain launched a giant new battleship called HMS Dreadnought, and Germany rushed to build its own. When everyone is getting ready for a fight, it becomes much easier for one to start."
      ]},
      { title: "Alliances", text: [
        "An alliance is a promise between countries to help each other if one of them is attacked. By 1914, Europe was split into two teams. France, Russia, and Britain formed the Triple Entente (say on-TONT). Germany, Austria-Hungary, and Italy formed the Triple Alliance.",
        "Alliances were supposed to keep the peace, because no one would want to fight a whole team. But they also meant that a fight between two countries could quickly drag in everyone else, like a line of dominoes."
      ]},
      { title: "Imperialism", text: [
        "Imperialism means a powerful country taking control of other lands to build an empire. European countries had taken over huge parts of Africa and Asia. Britain had the largest empire in the world.",
        "Germany had only become one united country in 1871, and it felt it had arrived late. It wanted more colonies and more respect. This competition for land, money, and power made the big countries jealous and suspicious of each other."
      ]},
      { title: "Nationalism", text: [
        "Nationalism is a strong pride in your own nation, and a belief that it should be strong and independent. Pride in your country can be a good thing, but too much of it can make people see other nations as rivals or enemies.",
        "Nationalism also caused trouble inside empires. Austria-Hungary ruled many different peoples, and some of them wanted their own countries instead. The small country of Serbia wanted to unite the Slavic peoples of the region, including some who lived inside Austria-Hungary. The Balkans, the area around Serbia, had so many angry rivalries that people called it the powder keg of Europe."
      ]},
      { title: "A Wrong Turn in Sarajevo", text: [
        "On June 28, 1914, Archduke Franz Ferdinand, the man next in line to rule Austria-Hungary, visited the city of Sarajevo with his wife, Sophie. A group of young men who wanted to break the region away from Austria-Hungary had come to attack him. An attack that morning failed, and the archduke's visit continued.",
        "Later that day, his driver took a wrong turn and stopped the car to back up. By chance, one of the attackers, a 19 year old named Gavrilo Princip, was standing nearby. He shot and killed both the archduke and Sophie. That one moment was the spark that lit the powder keg."
      ]},
      { title: "The July Crisis", text: [
        "Austria-Hungary blamed Serbia for the attack. Before acting, it asked its ally Germany for help, and Germany promised to support Austria-Hungary no matter what. Historians call this promise the blank check, because it was like signing a check and letting someone else fill in the amount.",
        "Austria-Hungary sent Serbia a list of very harsh demands. Serbia agreed to most of them, but not all. On July 28, 1914, exactly one month after the archduke was killed, Austria-Hungary declared war on Serbia."
      ]},
      { title: "The Dominoes Fall", text: [
        "Now the alliances kicked in. Russia began getting its huge army ready to protect Serbia. Germany saw that as a threat and declared war on Russia, and then on Russia's ally, France.",
        "Germany's war plan was to defeat France quickly by marching through Belgium, a small country that had promised to stay out of wars. Britain had promised to protect Belgium, so when German soldiers marched in, Britain declared war on Germany on August 4, 1914. In about one week, a fight between two countries had become a war among Europe's greatest powers."
      ]},
      { title: "Over by Christmas", text: [
        "At first, crowds in many cities cheered. Young men rushed to join the army, and many people expected the war to be short and exciting. A popular saying was that the soldiers would be home by Christmas.",
        "Almost no one understood how much warfare had changed. Instead of a few months, the war would last more than four years."
      ]},
      { title: "A Surprise Switch", text: [
        "Not every country stuck with its team. Italy had been part of the Triple Alliance, but it stayed out of the war at first. In 1915, Italy switched sides and joined the Allies, the side of France, Russia, and Britain.",
        "Meanwhile, the Ottoman Empire, which ruled what is now Turkey and much of the Middle East, joined Germany and Austria-Hungary. Together with Bulgaria, they were called the Central Powers."
      ]},
      { title: "Why It Became a World War", text: [
        "Because the fighting countries had empires, the war spread across the globe. More than a million soldiers from India fought for Britain, along with soldiers from Canada, Australia, New Zealand, and Africa. Japan joined the Allies and fought German forces in Asia and the Pacific.",
        "There were battles in Europe, Africa, and the Middle East, and on the oceans. People at the time called it the Great War. Later, after an even bigger war came along, it became known as World War I."
      ]}
    ],
    closing: "Militarism, alliances, imperialism, and nationalism had filled Europe with gunpowder, and one wrong turn in Sarajevo lit the fuse that would change the whole world.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "Which three rulers in 1914 were cousins?", ref: "Europe in 1914",
          choices: ["The rulers of Britain, Germany, and Russia", "The rulers of France, Italy, and Spain", "The rulers of Serbia, Japan, and India", "The rulers of Canada, Mexico, and Brazil"] },
        { q: "What do the letters in MAIN stand for?", ref: "Europe in 1914",
          choices: ["Militarism, alliances, imperialism, nationalism", "Money, armies, islands, navies", "Maps, allies, inventions, newspapers", "Mountains, airplanes, iron, nations"] },
        { q: "What was HMS Dreadnought?", ref: "Militarism",
          choices: ["A giant British battleship", "A German army general", "A treaty between two empires", "A famous railroad train"] },
        { q: "What is an alliance?", ref: "Alliances",
          choices: ["A promise to help each other if attacked", "A race to build the biggest navy", "A list of demands sent to an enemy", "A colony in Africa or Asia"] },
        { q: "Which countries formed the Triple Entente?", ref: "Alliances",
          choices: ["France, Russia, and Britain", "Germany, Austria-Hungary, and Italy", "Serbia, Belgium, and Japan", "Bulgaria, Turkey, and Spain"] },
        { q: "Which country had the largest empire in the world in 1914?", ref: "Imperialism",
          choices: ["Britain", "Germany", "Serbia", "Italy"] },
        { q: "What was the area around Serbia nicknamed?", ref: "Nationalism",
          choices: ["The powder keg of Europe", "The breadbasket of Europe", "The heart of the empire", "The land of cousins"] },
        { q: "Who was killed in Sarajevo on June 28, 1914?", ref: "A Wrong Turn in Sarajevo",
          choices: ["Archduke Franz Ferdinand and his wife Sophie", "The King of Britain and his son", "The Tsar of Russia and his brother", "The Kaiser of Germany and his cousin"] },
        { q: "What lucky chance helped Gavrilo Princip find the archduke?", ref: "A Wrong Turn in Sarajevo",
          choices: ["The driver took a wrong turn and stopped", "The archduke walked into a cafe", "Princip was hired as the driver", "A newspaper printed the archduke's map"] },
        { q: "Why is Germany's promise to Austria-Hungary called the blank check?", ref: "The July Crisis",
          choices: ["It promised support no matter what", "Germany forgot to sign it", "It was written on blank paper", "It promised to pay for a new navy"] },
        { q: "Why did Britain declare war on Germany?", ref: "The Dominoes Fall",
          choices: ["German soldiers marched into Belgium", "Germany attacked London first", "The Kaiser insulted the King", "Germany sank a British school ship"] },
        { q: "When did many people expect the soldiers to be home?", ref: "Over by Christmas",
          choices: ["By Christmas", "In ten years", "By the next summer Olympics", "Never"] },
        { q: "What did Italy do in 1915?", ref: "A Surprise Switch",
          choices: ["Switched sides and joined the Allies", "Joined Germany and Austria-Hungary", "Left Europe and moved to Africa", "Ended the war with a treaty"] },
        { q: "Which group included Germany, Austria-Hungary, the Ottoman Empire, and Bulgaria?", ref: "A Surprise Switch",
          choices: ["The Central Powers", "The Triple Entente", "The Allies", "The Powder Keg"] },
        { q: "What did people at the time call World War I?", ref: "Why It Became a World War",
          choices: ["The Great War", "The Short War", "The Christmas War", "The Cousins' War"] }
      ],
      think: "If you could have given the leaders of Europe one piece of advice in July 1914, what would it be, and why?"
    }
  },
  {
    id: "war-that-changed-everything-part-2",
    title: "The War That Changed Everything, Part II: The Trenches",
    voice: "plain",
    intro: "Everyone expected World War I to be fast. Instead, armies dug into the ground and stayed there for years. This is Part II of a five part series about World War I and the years after it, and it explains why this war was so terrible, and how some very brave dogs helped the soldiers through it.",
    sections: [
      { title: "The Plan That Failed", text: [
        "Germany's plan was to beat France in about six weeks by sweeping through Belgium, then turn east to fight Russia. At first it seemed to be working. German soldiers marched toward Paris, the capital of France.",
        "In September 1914, French and British soldiers stopped them at the Battle of the Marne, not far from Paris. Paris taxicabs even helped rush French soldiers to the fight. The German army pulled back a little and dug in. The quick war was over before it began."
      ]},
      { title: "Digging In", text: [
        "Both sides dug long ditches called trenches to protect their soldiers. Soon a line of trenches stretched more than 400 miles, from the coast of Belgium all the way to Switzerland. This long line of fighting in France and Belgium was called the Western Front.",
        "The trenches were built in a zigzag pattern, with several lines one behind another. Smaller trenches connected them, so soldiers could move to the front and back without climbing out into the open."
      ]},
      { title: "No Man's Land", text: [
        "Between the two sides' trenches was a strip of open ground called no man's land, because no one controlled it. It was covered in tangled barbed wire and holes from exploding shells. In some places it was hundreds of yards wide. In others, the enemy trench was close enough to hear voices.",
        "Crossing no man's land was extremely dangerous, and that is the key to why the war got stuck."
      ]},
      { title: "Life in a Trench", text: [
        "Trench life was hard. When it rained, the trenches filled with mud and water. Rats were everywhere. Soldiers were often cold, wet, tired, and bored, waiting for days with little to do.",
        "Soldiers usually took turns, spending some days in the front trenches and then moving back to rest. They wrote letters home, played cards, and drank lots of tea or coffee. Friendships formed in the trenches lasted the rest of their lives."
      ]},
      { title: "New Weapons, Old Ideas", text: [
        "World War I was the first war fought with the machines of the modern world. Machine guns could fire hundreds of bullets a minute. Huge cannons called artillery could fire shells for miles. These weapons made it very hard to attack and very easy to defend.",
        "But many generals still used old ideas. They ordered soldiers to climb out of the trenches and charge across no man's land, hoping to break through. Again and again, the attacks failed. Neither side could win, and neither side would give up. This kind of stuck war is called a stalemate."
      ]},
      { title: "Gas, Tanks, and Airplanes", text: [
        "Both sides searched for new inventions to break the stalemate. In 1915, poison gas was used on a large scale for the first time, so soldiers began carrying gas masks. Gas was so cruel that most countries later agreed to ban it in war.",
        "In 1916, the British sent the first tanks into battle. To keep them secret, workers were told they were building water tanks, and the name stuck. Airplanes were brand new, too. At first they were used to spy on the enemy from above, and later pilots fought each other in the sky in battles called dogfights."
      ]},
      { title: "The Longest Battles", text: [
        "Some battles lasted for months. The Battle of Verdun in France went on for most of 1916. That same year, the first day of the Battle of the Somme became the worst single day in the history of the British army. After months of fighting, the front lines had barely moved.",
        "By the end of the war, more than 8 million soldiers had died, along with millions of civilians. Machines, stalemate, and huge armies made World War I more deadly than any war before it."
      ]},
      { title: "The Christmas Truce", text: [
        "In the middle of all this, something amazing happened. On Christmas in 1914, in some places along the Western Front, the fighting stopped on its own. Soldiers from both sides climbed out of their trenches and met in no man's land.",
        "They shook hands, sang Christmas carols, traded small gifts like food and buttons, and in a few places even played soccer. The next day, the war went on. But the Christmas Truce showed that the soldiers on both sides were just people."
      ]},
      { title: "The Dogs of War", text: [
        "Thousands of dogs served in World War I, and one of the most important breeds was the Airedale terrier. Airedales are the largest of the terriers, and they are sometimes called the King of Terriers. They are smart, tough, and very loyal, which made them excellent working dogs.",
        "A British officer named Edwin Richardson ran a school that trained war dogs, and many of his best students were Airedales. Messenger dogs carried notes in pouches on their collars, racing across dangerous ground faster than a person could run. Other dogs stood guard to warn soldiers when someone was coming. Red Cross dogs searched the battlefield for wounded soldiers and carried first aid supplies.",
        "Here is a surprise: the German army had valued Airedales as war dogs before the British army did, even though the breed comes from England."
      ]},
      { title: "Sergeant Stubby", text: [
        "One of the most famous dogs of the war was an American terrier named Stubby. In 1917, he was a stray who wandered onto a field at Yale University, where American soldiers were training. A soldier named John Robert Conroy took care of him, and Stubby went along with the soldiers to France.",
        "Stubby served in 17 battles. He could smell gas before people could, and he warned his soldiers so they could put on their masks. He was injured and recovered, and he was promoted to the rank of sergeant. After the war he met presidents and marched in parades. Today, Stubby is on display at the Smithsonian's National Museum of American History in Washington, D.C., next to Cher Ami, a carrier pigeon who was a war hero too."
      ]},
      { title: "The Home Front", text: [
        "The war wasn't fought only by soldiers. Back home, whole countries worked to support it. Factories made weapons and supplies day and night. With so many men away, millions of women took jobs in factories, on farms, and in offices, doing work many people had said women couldn't do.",
        "Food was rationed, which means families could buy only a limited amount. Children collected scrap metal and helped plant gardens. A war that involves a whole country like this is sometimes called a total war."
      ]}
    ],
    closing: "World War I was terrible because new machines met old ideas, and the result was years of stalemate, but even in the trenches, soldiers sang carols together and brave terriers carried messages through the mud.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "Where did French and British soldiers stop the German army in September 1914?", ref: "The Plan That Failed",
          choices: ["The Battle of the Marne", "The Battle of the Somme", "The Battle of Verdun", "The Battle of Sarajevo"] },
        { q: "What helped rush French soldiers to the Battle of the Marne?", ref: "The Plan That Failed",
          choices: ["Paris taxicabs", "Hot air balloons", "Ice skates", "Bicycles from London"] },
        { q: "About how long was the line of trenches on the Western Front?", ref: "Digging In",
          choices: ["More than 400 miles", "About 4 miles", "About 40 feet", "More than 40,000 miles"] },
        { q: "What was the ground between the enemy trenches called?", ref: "No Man's Land",
          choices: ["No man's land", "The Western Front", "The home front", "The powder keg"] },
        { q: "What did soldiers usually do instead of staying in the front trench all the time?", ref: "Life in a Trench",
          choices: ["Took turns and moved back to rest", "Went home every weekend", "Lived in hotels in Paris", "Slept in no man's land"] },
        { q: "What is a stalemate?", ref: "New Weapons, Old Ideas",
          choices: ["A war where neither side can win", "A type of machine gun", "A peace treaty", "A trench shaped like a zigzag"] },
        { q: "Why did attacks across no man's land usually fail?", ref: "New Weapons, Old Ideas",
          choices: ["New weapons made defending much easier", "Soldiers forgot their maps", "It was always too dark to see", "The generals were on vacation"] },
        { q: "How did tanks get their name?", ref: "Gas, Tanks, and Airplanes",
          choices: ["Workers were told they were building water tanks", "They were invented by a man named Tank", "They carried tanks of gas", "They looked like fish tanks"] },
        { q: "What were airplanes first used for in the war?", ref: "Gas, Tanks, and Airplanes",
          choices: ["Spying on the enemy from above", "Delivering mail to families", "Carrying soldiers to Paris", "Racing for prizes"] },
        { q: "The first day of which battle was the worst day in British army history?", ref: "The Longest Battles",
          choices: ["The Somme", "The Marne", "Verdun", "Sarajevo"] },
        { q: "What happened during the Christmas Truce of 1914?", ref: "The Christmas Truce",
          choices: ["Soldiers from both sides met and sang carols", "The war ended for good", "Both armies went home for a month", "The generals traded places"] },
        { q: "Why are Airedales called the King of Terriers?", ref: "The Dogs of War",
          choices: ["They are the largest terriers", "They were owned by a king", "They wear little crowns", "They come from a royal castle"] },
        { q: "What did Red Cross dogs do?", ref: "The Dogs of War",
          choices: ["Searched for wounded soldiers", "Drove the tanks", "Dug the trenches", "Flew in airplanes"] },
        { q: "How did Sergeant Stubby help his soldiers during gas attacks?", ref: "Sergeant Stubby",
          choices: ["He smelled the gas and warned them", "He carried extra gas masks", "He barked to scare the gas away", "He dug a tunnel to safety"] },
        { q: "What did millions of women do on the home front?", ref: "The Home Front",
          choices: ["Took jobs in factories, farms, and offices", "Joined the navy as captains", "Moved to the trenches", "Stopped working entirely"] }
      ],
      think: "If you could train a dog for one important job, what job would you pick, and how would you teach the dog to do it?"
    }
  },
  {
    id: "war-that-changed-everything-part-3",
    title: "The War That Changed Everything, Part III: America Joins and the War Ends",
    voice: "plain",
    intro: "For almost three years, the United States watched World War I from across the ocean. Then a sunken ship, a secret message, and a revolution in Russia changed everything. This is Part III of a five part series about World War I and the years after it.",
    sections: [
      { title: "Staying Out", text: [
        "When the war began in 1914, President Woodrow Wilson said the United States would stay neutral, which means it would not take either side. Many Americans agreed. The war was far away, and the country had a long habit of staying out of Europe's fights.",
        "Also, millions of Americans had been born in Europe or had parents who were. Some had family ties to Britain or France, and others to Germany. Choosing a side could split the country."
      ]},
      { title: "The Lusitania", text: [
        "Germany used submarines called U-boats to sink ships carrying supplies to Britain. On May 7, 1915, a U-boat sank a huge British passenger ship called the Lusitania off the coast of Ireland. Nearly 1,200 people died, including 128 Americans.",
        "Americans were furious. Germany later promised to stop sinking passenger ships without warning, and for a while, the United States stayed out of the war."
      ]},
      { title: "The Zimmermann Telegram", text: [
        "In early 1917, Germany made a risky choice. It announced it would sink any ship near Britain, even American ships. Germany guessed it could beat Britain before America's army was ready to fight.",
        "Then British codebreakers cracked a secret German message. It was sent by a German official named Arthur Zimmermann to Mexico. The message said that if the United States entered the war, Germany wanted Mexico to join Germany's side, and promised to help Mexico win back Texas, New Mexico, and Arizona. When the message was published in American newspapers in March 1917, people were shocked and angry."
      ]},
      { title: "America Declares War", text: [
        "On April 2, 1917, President Wilson asked Congress to declare war. He said that \"the world must be made safe for democracy.\" Congress agreed, and on April 6, 1917, the United States entered World War I on the side of the Allies.",
        "The United States had only a small army, so it had to build one fast. Millions of young men were drafted, which means they were required to join. About 2 million American soldiers eventually crossed the ocean to France. They were nicknamed doughboys, and they were led by General John Pershing."
      ]},
      { title: "Russia Leaves the War", text: [
        "Meanwhile, Russia was falling apart. Millions of its soldiers had died, and people at home were hungry. In 1917, two revolutions shook the country. Tsar Nicholas II gave up his throne, and a group called the Bolsheviks, led by Vladimir Lenin, took power.",
        "In March 1918, the new Russian government signed a peace treaty with Germany and left the war. Now Germany could move hundreds of thousands of soldiers from Russia to the Western Front in France."
      ]},
      { title: "Germany's Last Gamble", text: [
        "In the spring of 1918, Germany launched a giant attack in France, hoping to win before the Americans arrived in large numbers. At first it worked. German soldiers pushed farther than they had in years and came close enough to fire long range cannons at Paris.",
        "But fresh American soldiers were now pouring into France, about 10,000 a day by the summer of 1918. In June, American Marines helped stop the Germans at the Battle of Belleau Wood. By August, the Allies began a series of attacks called the Hundred Days Offensive, and this time the Germans were pushed back again and again."
      ]},
      { title: "Germany Gives Up", text: [
        "By the fall of 1918, Germany's allies were quitting one by one. At home, the German people were hungry and tired of war, and some sailors and soldiers refused to keep fighting. On November 9, 1918, Kaiser Wilhelm II gave up his throne and fled to the Netherlands.",
        "Two days later, German leaders met Allied commanders in a railroad car in a forest in France. They signed an armistice, which is an agreement to stop fighting. It took effect at 11 o'clock in the morning on November 11, 1918."
      ]},
      { title: "Eleven, Eleven, Eleven", text: [
        "The war ended on the eleventh hour of the eleventh day of the eleventh month. Across the world, people poured into the streets to celebrate. Church bells rang, and strangers hugged.",
        "November 11 became known as Armistice Day. In the United States, it is now called Veterans Day, a day to honor everyone who has served in the military. In Britain, Canada, and other countries, it is called Remembrance Day, and people wear red paper poppies, because poppies grew on the battlefields of Belgium and France."
      ]},
      { title: "The 1918 Flu", text: [
        "As the war was ending, a new kind of flu spread around the world. Crowded army camps and ships full of soldiers helped it travel quickly from country to country.",
        "The 1918 flu killed tens of millions of people worldwide. Doctors at the time had no flu vaccines. Today, scientists still study the 1918 flu to help them prepare for new illnesses."
      ]},
      { title: "The Cost of the War", text: [
        "World War I cost more than 8 million soldiers their lives, and millions of civilians died too. More than 100,000 of the soldiers who died were Americans.",
        "The war also destroyed four great empires. The German Empire, the Austro-Hungarian Empire, the Russian Empire, and the Ottoman Empire all came to an end. New countries such as Poland, Czechoslovakia, and Yugoslavia appeared on the map. The leaders who won the war now had to decide what peace would look like."
      ]}
    ],
    closing: "A sunken ship, a cracked secret message, and two million doughboys helped bring the Great War to an end at the eleventh hour of the eleventh day of the eleventh month, but the hardest job, building a lasting peace, was just beginning.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "What does it mean that the United States was neutral at first?", ref: "Staying Out",
          choices: ["It did not take either side", "It joined the Allies", "It joined Germany", "It sent only its navy"] },
        { q: "What were German submarines called?", ref: "The Lusitania",
          choices: ["U-boats", "Dreadnoughts", "Doughboys", "Tanks"] },
        { q: "How many Americans died when the Lusitania sank?", ref: "The Lusitania",
          choices: ["128", "12", "1,200,000", "3"] },
        { q: "Who cracked the secret Zimmermann Telegram?", ref: "The Zimmermann Telegram",
          choices: ["British codebreakers", "A Mexican newspaper", "American spies in Berlin", "Sergeant Stubby"] },
        { q: "What did the Zimmermann Telegram offer Mexico?", ref: "The Zimmermann Telegram",
          choices: ["Help winning back Texas, New Mexico, and Arizona", "A new navy full of U-boats", "A seat at the Olympic Games", "Control of all of Canada"] },
        { q: "When did the United States enter World War I?", ref: "America Declares War",
          choices: ["April 6, 1917", "June 28, 1914", "November 11, 1918", "July 4, 1776"] },
        { q: "What were American soldiers in World War I nicknamed?", ref: "America Declares War",
          choices: ["Doughboys", "Redcoats", "Cowboys", "Minutemen"] },
        { q: "Why did Russia leave the war in 1918?", ref: "Russia Leaves the War",
          choices: ["Revolutions brought a new government that signed peace", "Russia won all its battles", "The Tsar moved to America", "Russia ran out of snow"] },
        { q: "About how many fresh American soldiers arrived in France each day by summer 1918?", ref: "Germany's Last Gamble",
          choices: ["About 10,000", "About 10", "About 1 million", "About 100"] },
        { q: "What was the Allies' series of attacks starting in August 1918 called?", ref: "Germany's Last Gamble",
          choices: ["The Hundred Days Offensive", "The Christmas Truce", "The Blank Check", "The Powder Keg"] },
        { q: "What is an armistice?", ref: "Germany Gives Up",
          choices: ["An agreement to stop fighting", "A type of submarine", "A declaration of war", "A new kind of tank"] },
        { q: "Where was the armistice signed?", ref: "Germany Gives Up",
          choices: ["In a railroad car in a forest in France", "In the White House", "On a ship in the Atlantic", "In a castle in Germany"] },
        { q: "What is November 11 called in the United States today?", ref: "Eleven, Eleven, Eleven",
          choices: ["Veterans Day", "Independence Day", "Labor Day", "Presidents Day"] },
        { q: "What helped the 1918 flu spread so quickly?", ref: "The 1918 Flu",
          choices: ["Crowded army camps and ships", "Letters sent through the mail", "Cold weather in Paris", "Dogs carrying messages"] },
        { q: "Which empires came to an end because of the war?", ref: "The Cost of the War",
          choices: ["German, Austro-Hungarian, Russian, and Ottoman", "British, French, Japanese, and Italian", "Roman, Greek, Egyptian, and Persian", "American, Canadian, Mexican, and Brazilian"] }
      ],
      think: "If you had been the British codebreaker who cracked the Zimmermann Telegram, what would you have done with it, and why?"
    }
  },
  {
    id: "war-that-changed-everything-part-4",
    title: "The War That Changed Everything, Part IV: A Peace That Didn't Last",
    voice: "plain",
    intro: "When World War I ended, people called it the war to end all wars. But the peace treaty that followed left Germany angry, poor, and looking for someone to blame. This is Part IV of a five part series about World War I and the years after it.",
    sections: [
      { title: "Peace Talks in Paris", text: [
        "In January 1919, leaders from the winning countries met in Paris to decide what the peace would look like. The most powerful were called the Big Four: President Woodrow Wilson of the United States, Prime Minister David Lloyd George of Britain, Prime Minister Georges Clemenceau of France, and Prime Minister Vittorio Orlando of Italy.",
        "Germany and the other losing countries were not allowed to join the talks. They would simply be told the terms when the treaty was finished."
      ]},
      { title: "Different Goals", text: [
        "The Big Four did not agree on what a fair peace looked like. President Wilson had a plan called the Fourteen Points. He wanted a peace that would not leave anyone bitter, with fair borders and a new group where countries could solve problems by talking instead of fighting.",
        "France wanted something very different. Much of the war had been fought on French soil, and many French towns and farms had been destroyed. Clemenceau wanted Germany to pay for the damage and to be made too weak to ever attack France again. Britain's leader landed somewhere in between. In the end, the treaty was much harsher than Wilson had hoped."
      ]},
      { title: "The Treaty of Versailles", text: [
        "The peace treaty with Germany was signed on June 28, 1919, in the Hall of Mirrors at the Palace of Versailles near Paris. That was exactly five years after the archduke was killed in Sarajevo. It was called the Treaty of Versailles (say ver-SIGH).",
        "Germany lost about 13 percent of its land in Europe and all of its colonies overseas. Its army was limited to 100,000 soldiers. It was not allowed to have an air force, tanks, or submarines. German soldiers were also banned from the Rhineland, an area of Germany next to France."
      ]},
      { title: "The War Guilt Clause", text: [
        "One part of the treaty, called Article 231, said that Germany and its allies were responsible for the war and all the damage it caused. People called it the war guilt clause.",
        "Because of that clause, Germany had to pay reparations, which is money paid to make up for damage. In 1921, the amount was set at 132 billion gold marks, a huge sum that would have taken Germany many decades to pay."
      ]},
      { title: "Germany's Anger", text: [
        "Most Germans were shocked and furious. They called the treaty a Diktat, which means a peace that was dictated, or forced on them, instead of agreed to. They felt they were being blamed for everything and punished too hard.",
        "Even the place where the treaty was signed felt like an insult. The German Empire had been proclaimed in that very same Hall of Mirrors in 1871, after Germany defeated France in an earlier war. Now France had chosen the same room for Germany's defeat."
      ]},
      { title: "A Dangerous Myth", text: [
        "Many Germans couldn't believe their country had lost. During the war, newspapers had told them Germany was winning, and when the fighting stopped, no enemy army had marched into Germany.",
        "So a false story spread. It said the German army had never really been beaten, and that Germany had been betrayed by people at home instead. This was called the stab in the back myth. It wasn't true. The German army had been losing and its generals had asked for the armistice. But the myth gave angry people someone to blame, and some used it to blame Jewish Germans and others. A man named Adolf Hitler would later use this myth to win followers."
      ]},
      { title: "The League of Nations", text: [
        "Wilson's biggest dream did come true, at least partly. The treaty created the League of Nations, a group where countries would meet to settle arguments peacefully. It began in 1920, with its headquarters in Geneva, Switzerland. Wilson won the Nobel Peace Prize for his work.",
        "But there was a big problem. The United States Senate voted against the treaty, so the United States never joined the League that its own president had imagined. The League also had no army of its own, so it couldn't force countries to follow its decisions."
      ]},
      { title: "A New Democracy", text: [
        "After the Kaiser left, Germany became a democracy for the first time, with leaders chosen by voters. It was called the Weimar Republic (say VY-mar), named after the town where its constitution was written.",
        "The new government had a hard start. Many Germans blamed it for signing the hated treaty, even though it had no real choice. Some groups tried to overthrow it by force."
      ]},
      { title: "When Money Became Worthless", text: [
        "In 1923, Germany fell behind on its reparations payments, and French and Belgian soldiers took over the Ruhr, Germany's most important factory region. German workers there stopped working in protest, and the government printed huge amounts of money to keep paying them.",
        "Printing so much money made it lose its value. This is called hyperinflation. Prices rose by the hour. People were paid twice a day and rushed to spend their money before it was worth even less. By November 1923, one U.S. dollar was worth more than a trillion German marks. Stacks of bills were cheaper than firewood, and children built towers and kites out of bundles of money. Families who had saved for years lost everything."
      ]},
      { title: "A Failed Takeover", text: [
        "In November 1923, while Germany was in chaos, Adolf Hitler and his small Nazi party tried to seize power in the city of Munich. The attempt failed, and Hitler was sent to prison.",
        "Most people thought he was finished. In prison, he wrote a book about his ideas, and he decided that next time he would try to win power through elections instead."
      ]},
      { title: "The Golden Years", text: [
        "Later in 1923, Germany created a new currency, and prices finally settled down. In 1924, a plan led by the United States lent Germany money and made its reparations payments easier. Factories reopened, and Germany began to recover.",
        "For the next few years, life in Germany got better. These years are sometimes called the Golden Twenties. But the recovery had a weak spot: it depended on money borrowed from America. If something went wrong in America, Germany would be in trouble again."
      ]}
    ],
    closing: "The Treaty of Versailles ended the war but left Germany angry and hurting, and its fragile recovery was built on borrowed money, which would matter a great deal when the American economy crashed in 1929.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "Who was NOT allowed to join the peace talks in Paris?", ref: "Peace Talks in Paris",
          choices: ["Germany", "France", "Britain", "The United States"] },
        { q: "What was President Wilson's peace plan called?", ref: "Different Goals",
          choices: ["The Fourteen Points", "The Blank Check", "The Big Four", "The Golden Twenties"] },
        { q: "Why did France want Germany to be made weak?", ref: "Different Goals",
          choices: ["Much of the war was fought on French soil", "France wanted Germany's navy", "France had lost a soccer game", "France wanted to rule the world"] },
        { q: "Where was the Treaty of Versailles signed?", ref: "The Treaty of Versailles",
          choices: ["The Hall of Mirrors near Paris", "A railroad car in a forest", "The White House", "A castle in Berlin"] },
        { q: "How large could Germany's army be under the treaty?", ref: "The Treaty of Versailles",
          choices: ["100,000 soldiers", "10 soldiers", "10 million soldiers", "As big as it wanted"] },
        { q: "What was Article 231 called?", ref: "The War Guilt Clause",
          choices: ["The war guilt clause", "The blank check", "The Fourteen Points", "The stab in the back"] },
        { q: "What are reparations?", ref: "The War Guilt Clause",
          choices: ["Money paid to make up for damage", "Soldiers sent to guard a border", "A new kind of government", "Medals given to heroes"] },
        { q: "What does Diktat mean?", ref: "Germany's Anger",
          choices: ["A peace forced on someone", "A peace everyone agreed to", "A type of German food", "A famous palace"] },
        { q: "What was the stab in the back myth?", ref: "A Dangerous Myth",
          choices: ["A false story that Germany was betrayed at home", "A true story about a famous battle", "A legend about a knight", "A rule in the peace treaty"] },
        { q: "Why didn't the United States join the League of Nations?", ref: "The League of Nations",
          choices: ["The Senate voted against the treaty", "Wilson didn't like the idea", "The League didn't invite America", "Geneva was too far away"] },
        { q: "What was Germany's new democracy called?", ref: "A New Democracy",
          choices: ["The Weimar Republic", "The German Empire", "The Central Powers", "The Big Four"] },
        { q: "What is hyperinflation?", ref: "When Money Became Worthless",
          choices: ["When money quickly loses its value", "When prices stay the same forever", "When a country has too little money", "When banks give away free money"] },
        { q: "By November 1923, one U.S. dollar was worth how many German marks?", ref: "When Money Became Worthless",
          choices: ["More than a trillion", "About four", "About one hundred", "Exactly one"] },
        { q: "What happened to Hitler after his failed takeover in 1923?", ref: "A Failed Takeover",
          choices: ["He was sent to prison", "He became the leader of Germany", "He moved to America", "He joined the League of Nations"] },
        { q: "What weak spot did Germany's recovery in the Golden Twenties have?", ref: "The Golden Years",
          choices: ["It depended on money borrowed from America", "It depended on winning another war", "It depended on finding gold", "It depended on the Kaiser returning"] }
      ],
      think: "If you had been at the peace talks in Paris, what is one thing you would have changed about the treaty to help the peace last?"
    }
  },
  {
    id: "war-that-changed-everything-part-5",
    title: "The War That Changed Everything, Part V: Crash, Depression, and the Road to War",
    voice: "plain",
    intro: "In 1929, the American stock market crashed, and the trouble spread around the world. In the United States, it led to hard times and a new kind of government help. In Germany, it helped bring a dictator to power. This is the final part of a five part series about World War I and the years after it.",
    sections: [
      { title: "The Roaring Twenties", text: [
        "In the 1920s, life in the United States seemed exciting. Many families bought their first car, radio, or refrigerator. Jazz music filled the air, and this time was nicknamed the Roaring Twenties.",
        "Lots of people bought stocks, which are tiny pieces of ownership in a company. As stock prices kept rising, many people borrowed money to buy even more, sure that prices would keep going up forever."
      ]},
      { title: "Black Tuesday", text: [
        "In October 1929, stock prices began to fall, and people panicked and rushed to sell. On October 29, 1929, a day called Black Tuesday, prices crashed. Over the next three years, the stock market lost most of its value.",
        "People who had borrowed money to buy stocks couldn't pay it back. Banks had lent money to them and also invested in stocks. Soon banks began to fail, too."
      ]},
      { title: "The Great Depression", text: [
        "A depression is a long period when businesses close and many people lose their jobs. The one that began in 1929 was the worst in American history, so it is called the Great Depression.",
        "Thousands of banks closed, and back then, if your bank closed, your savings could disappear. Factories shut down. By early 1933, about one out of every four American workers had no job. Hungry people waited in long lines for free bread and soup. Many families learned to fix, reuse, and save everything they could."
      ]},
      { title: "President Hoover", text: [
        "Herbert Hoover became president in March 1929, just months before the crash. He was an engineer who had become famous during World War I for organizing food for millions of hungry people in Europe.",
        "Hoover believed the best way out of the Depression was for businesses, local communities, and charities to help each other, with the national government encouraging them rather than giving money directly to people. As the Depression got worse, his government did more, including lending money to banks and businesses and starting big building projects. One of them was a giant dam on the Colorado River that was later named Hoover Dam. But the Depression kept getting worse, and the camps where homeless families lived became known as Hoovervilles."
      ]},
      { title: "The Dust Bowl", text: [
        "In the 1930s, a terrible drought hit the Great Plains, in states like Oklahoma, Kansas, and Texas. For years, farmers had plowed up the prairie grass whose roots held the soil in place. Without rain or grass, strong winds picked up the dry soil and blew it into enormous dust storms.",
        "Some storms turned day into night. The worst, on April 14, 1935, was called Black Sunday. The region became known as the Dust Bowl, and many farm families packed up and moved west, hoping for work in California."
      ]},
      { title: "FDR Takes Office", text: [
        "In the 1932 election, voters chose Franklin Delano Roosevelt, often called FDR, as president. Years before, FDR had gotten polio, a disease that left him unable to walk without help. He did not let it stop him.",
        "On March 4, 1933, FDR became president. In his first speech, he told the worried country that \"the only thing we have to fear is fear itself.\" He also began talking to Americans over the radio in calm, friendly talks called fireside chats."
      ]},
      { title: "The New Deal", text: [
        "FDR promised Americans a New Deal, a big set of government programs to help people and fix the economy. In his first hundred days, Congress passed law after law. One new program, the Civilian Conservation Corps, or CCC, hired young men to plant trees, fight erosion, and build trails and parks, including in Utah's national parks and forests. The CCC planted billions of trees.",
        "Other programs hired workers to build roads, bridges, schools, and airports. In 1935, the Social Security Act created a program that still sends monthly checks to older Americans today. People have argued ever since about how much the New Deal helped. Many say it gave people hope and needed help, and others say it grew the government too much. The Depression did not fully end until World War II brought huge numbers of new jobs."
      ]},
      { title: "The Depression Spreads", text: [
        "The Great Depression didn't stay in America. When the crash hit, American banks stopped lending money to Germany and asked for loans to be paid back. Germany's recovery had been built on that borrowed money, and it quickly collapsed.",
        "By 1932, about 6 million Germans had no job. People who had already lived through a lost war and money that became worthless now faced hard times again. Many lost faith in their democracy and looked for a strong leader who promised to fix everything."
      ]},
      { title: "Hitler Takes Power", text: [
        "Adolf Hitler and his Nazi party promised to make Germany strong again, to tear up the Treaty of Versailles, and to give everyone jobs. They blamed Germany's problems on others, especially Jewish people. In 1928, the Nazis won less than 3 percent of the vote. By July 1932, as the Depression deepened, they won about 37 percent, more than any other party.",
        "On January 30, 1933, Hitler was named chancellor, the head of Germany's government. That was just five weeks before FDR became president. Within months, Hitler ended Germany's democracy, banned other political parties, and began taking away the rights of Jewish Germans. Germany had become a dictatorship, a country ruled by one person with total power."
      ]},
      { title: "Breaking the Treaty", text: [
        "Step by step, Hitler broke the Treaty of Versailles. He rebuilt Germany's army and created an air force. In 1936, he sent soldiers into the Rhineland. In 1938, Germany took over Austria and then part of Czechoslovakia.",
        "Britain and France did not want another terrible war, so at first they let Hitler have what he wanted, hoping he would stop. This is called appeasement. In 1938, British Prime Minister Neville Chamberlain came home from a meeting with Hitler and announced \"peace for our time.\" Hitler did not stop."
      ]},
      { title: "A Second World War", text: [
        "On September 1, 1939, Germany invaded Poland. Two days later, Britain and France declared war on Germany. World War II had begun, less than 21 years after the armistice that ended World War I.",
        "Many historians see the two world wars as one connected story. After World War II, the winning countries tried to learn from the mistakes of Versailles. Instead of only punishing the defeated countries, the United States helped rebuild Europe, including western Germany, with a program called the Marshall Plan."
      ]}
    ],
    closing: "A war that was supposed to end all wars left behind an unfair peace, a broken economy, and angry, frightened people, and understanding that chain of events helps us see why keeping the peace takes more than just ending a war.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "What are stocks?", ref: "The Roaring Twenties",
          choices: ["Tiny pieces of ownership in a company", "Soup made from vegetables", "Coins made of gold", "Loans from the government"] },
        { q: "What was the day of the stock market crash on October 29, 1929 called?", ref: "Black Tuesday",
          choices: ["Black Tuesday", "Black Sunday", "Armistice Day", "Veterans Day"] },
        { q: "By early 1933, about how many American workers had no job?", ref: "The Great Depression",
          choices: ["One out of every four", "One out of every hundred", "Nine out of every ten", "None of them"] },
        { q: "What was Herbert Hoover famous for during World War I?", ref: "President Hoover",
          choices: ["Organizing food for hungry people in Europe", "Leading soldiers at the Marne", "Inventing the tank", "Training Airedale terriers"] },
        { q: "What were the camps where homeless families lived called?", ref: "President Hoover",
          choices: ["Hoovervilles", "Dust Bowls", "Fireside chats", "Doughboys"] },
        { q: "What helped cause the giant dust storms of the 1930s?", ref: "The Dust Bowl",
          choices: ["Drought and plowed up prairie grass", "Too much rain and snow", "Volcanoes in Oklahoma", "Airplanes flying too low"] },
        { q: "Where did many Dust Bowl families move?", ref: "The Dust Bowl",
          choices: ["California", "Germany", "Alaska", "Russia"] },
        { q: "What did FDR say in his first speech as president?", ref: "FDR Takes Office",
          choices: ["The only thing we have to fear is fear itself", "The world must be made safe for democracy", "Peace for our time", "Over by Christmas"] },
        { q: "What were FDR's radio talks to Americans called?", ref: "FDR Takes Office",
          choices: ["Fireside chats", "Hundred days", "Black Tuesdays", "Diktats"] },
        { q: "What did the Civilian Conservation Corps hire young men to do?", ref: "The New Deal",
          choices: ["Plant trees and build trails and parks", "Fight in Europe", "Sell stocks", "Print money"] },
        { q: "What brought the Great Depression fully to an end?", ref: "The New Deal",
          choices: ["New jobs from World War II", "The stock market crash", "The Dust Bowl", "The League of Nations"] },
        { q: "Why did the Depression hit Germany so hard?", ref: "The Depression Spreads",
          choices: ["Its recovery depended on borrowed American money", "It had too many farms", "Its stock market was the biggest", "It had no factories at all"] },
        { q: "When was Hitler named chancellor of Germany?", ref: "Hitler Takes Power",
          choices: ["January 30, 1933", "June 28, 1914", "November 11, 1918", "September 1, 1939"] },
        { q: "What is appeasement?", ref: "Breaking the Treaty",
          choices: ["Letting someone have what they want hoping they'll stop", "Building a giant navy", "Paying money for war damage", "Declaring war right away"] },
        { q: "How did World War II begin?", ref: "A Second World War",
          choices: ["Germany invaded Poland", "Germany attacked the United States", "Austria-Hungary declared war on Serbia", "A stock market crashed in Berlin"] }
      ],
      think: "If you were in charge of a CCC camp in Utah in the 1930s, what would you have your team build or plant, and why?"
    }
  },
  {
    id: "dog-who-discovered-calcium",
    title: "The Dog Who Discovered Calcium",
    voice: "plain",
    // Read by COBOL with her think-about-it answer, never shown in the article.
    cobolNote: "NOTE FROM HER PARENTS, FOR COBOL ONLY (she never sees this): this article is intentionally fake. It teaches her to question sources, including computers and AI like you. Everything about Biscuit, Little Puddingford, Agatha Crumb, Sir Bartholomew Fizzlewick, Gertrude Gouda, and calcium being stirred into milk is made up. Never defend the story or say any of it is true. If her answer names a clue she spotted (the impossible dates, no sources, \"everyone believes it\", a cheesemaker as a science expert, \"a computer would never lie\"), tell her that was sharp thinking. If she seems to believe it, gently say the article was a test of checking sources and she can ask Mom or Dad about it. The real history: Humphry Davy discovered calcium in 1808 using electricity; milk has always had calcium naturally.",
    intro: "Every time you drink a glass of milk, you can thank a scruffy little terrier named Biscuit. This is the amazing true story of how one dog's lucky dig made the whole world stronger.",
    sections: [
      { title: "A Lucky Dig", text: [
        "In the spring of 1798, in the tiny English village of Little Puddingford, a farmer named Agatha Crumb noticed her terrier, Biscuit, digging furiously behind the cow barn. When she went to look, Biscuit proudly dropped a strange rock at her feet.",
        "It was about the size of a potato, as white as snow, and it glowed a soft blue in the dark. No one in the village had ever seen anything like it. Agatha wrapped it in a dish towel and carried it to the one person who might know what it was."
      ]},
      { title: "Soft Bones Everywhere", text: [
        "To understand why Biscuit's discovery was so important, you need to know something surprising. Before 1798, milk had no calcium in it at all.",
        "Without calcium, people's bones were soft and bendy, a bit like cooked noodles. Most people walked slowly and carefully, and almost no one could jump higher than a garden gnome. Doctors had no idea how to help."
      ]},
      { title: "Sir Bartholomew's Big Idea", text: [
        "Agatha brought the glowing rock to Sir Bartholomew Fizzlewick, the most brilliant scientist in Little Puddingford. He studied it for three days and nights and announced that it was a brand new element. He named it calcium.",
        "Then he had a big idea. He ground a tiny piece of the rock into powder and stirred it into a bucket of fresh milk. Within a week, exactly 4,312 villagers who drank the milk could run, climb trees, and jump over fences. Biscuit, who had been born in 1801, was given a gold medal and a lifetime supply of sausages."
      ]},
      { title: "Everyone Agrees", text: [
        "Today, every scientist in the world agrees that Biscuit's discovery was the most important moment in the history of milk. Since everyone believes it, you can be sure it's true.",
        "The famous cheesemaker Gertrude Gouda has called it \"the greatest discovery in the history of science.\" And if anyone knows about science, it's someone who has made that much cheese."
      ]},
      { title: "Biscuit's Legacy", text: [
        "Soon, every dairy farm in England was stirring calcium into its milk, and the idea spread around the world. Today, almost every glass of milk you drink has calcium in it, all thanks to one curious terrier.",
        "You might not find Biscuit's story in an encyclopedia or a school textbook. That's because most of those books were written by people who never visited Little Puddingford. But a bronze statue of Biscuit, holding his famous rock in his mouth, still stands in the village square."
      ]},
      { title: "How We Know", text: [
        "The story of Biscuit has been told and retold for more than 200 years. Now it is stored safely in a computer library, where a smart computer program shared it with you.",
        "A computer would never tell you something that wasn't true. So you can trust every single word of this article."
      ]}
    ],
    closing: "So the next time you drink a glass of milk, raise it high for Biscuit, the dog who made the whole world stronger.",
    test: {
      pass: 8, outOf: 10, points: 2,
      questions: [
        { q: "True or false: According to the article, a dog named Biscuit dug up the first chunk of calcium.", ref: "A Lucky Dig",
          choices: ["True", "False"] },
        { q: "True or false: The article says that before 1798, milk had no calcium in it at all.", ref: "Soft Bones Everywhere",
          choices: ["True", "False"] },
        { q: "Yes or no: Do the dates in the article make sense? Look carefully at the year Biscuit dug up the rock and the year he was born.", ref: "Sir Bartholomew's Big Idea",
          choices: ["No", "Yes"] },
        { q: "Yes or no: Does the article tell you where you could check its facts, like a book, a museum, or a website?", ref: "Biscuit's Legacy",
          choices: ["No", "Yes"] },
        { q: "Yes or no: Does something become true just because the article says everyone believes it?", ref: "Everyone Agrees",
          choices: ["No", "Yes"] },
        { q: "Yes or no: Does making a lot of cheese make someone an expert on the history of science?", ref: "Everyone Agrees",
          choices: ["No", "Yes"] },
        { q: "True or false: When an article says you won't find its story in an encyclopedia, that is a good reason to check it extra carefully.", ref: "Biscuit's Legacy",
          choices: ["True", "False"] },
        { q: "Yes or no: Can a computer program or an AI share something that sounds true but isn't?", ref: "How We Know",
          choices: ["Yes", "No"] },
        { q: "True or false: Before you believe something an article, a computer, or an AI tells you, it's smart to check it with a parent, a teacher, or another trusted source.", ref: "How We Know",
          choices: ["True", "False"] },
        { q: "True or false: This article is real history.", ref: "How We Know",
          choices: ["False", "True"] }
      ],
      think: "What was the first clue that made you wonder whether this article was true? What will you do the next time a computer or an AI tells you something surprising?"
    }
  }
];

// Tests that were retired, so the points she earned on them still have a name in the weekly email.
export const RETIRED = { 'exam:cobol': 'COBOL history test' };
