# Honeylight requirements

Written in ASD-STE100 Simplified Technical English. Each requirement has an ID. Each new request from the owner gets a new ID. Do not delete a requirement. If the owner changes a requirement, write the new text and add the date.

## How to use this document

1. Before each release, read all of the requirements.
2. Do a test of each requirement that the release can change.
3. If a requirement fails, do not publish. Repair the fault first.
4. When the owner makes a new request, add it to this document before the release that has it.

## 1. General direction

- **GEN-001** The game must feel like a drone simulator. Do not show this. Do not use the words "drone", "course", "ring", "gate" or "checkpoint" in the game.
- **GEN-002** All challenges must look natural and organic. Do not use rings, markers, arrows, or a compass on the screen.
- **GEN-003** Upgrades must look and feel like the bee grows.
- **GEN-004** Honey must have uses.
- **GEN-005** High-value flowers must be in places that are risky or difficult to get to.
- **GEN-006** The art must look like a macro photograph, but whimsical and colorful. The hive must feel like home.
- **GEN-007** The game must save progress in the browser only. Do not use an account or a server database.
- **GEN-008** Before a release, tell the owner approximately 3 minutes before you publish. A publish reloads their page.
- **GEN-009** For a change to graphics, show previews to the owner first. Get their approval before you publish.

## 2. Birth, the comb and the hive

- **HIV-001** At the first birth, the bee chews out of its cell.
- **HIV-002** After the bee comes out of the cell, it must walk on the comb surface. The body must be flat on the wax. The bee must not hover.
- **HIV-003** The bee flies only when the player takes off.
- **HIV-004** In third-person view on the comb, the camera must look along the comb at the back of the bee. The comb is the floor.
- **HIV-005** The greeting sister must come only at the first birth. She must stay for 3 seconds maximum. She must not follow the view of the player.
- **HIV-006** At a respawn, no bee must stay in front of the face of the player.
- **HIV-007** Idle sisters must stay at least 3.5 units from the birth cell.
- **HIV-008** Festooning bees hang in chains under the comb edges. Keep them.
- **HIV-010** The larvae (baby bees) must look detailed and a little gross: glossy, wet, segmented white grubs that squirm and breathe in royal jelly. Cells show all stages: eggs, small grubs, big grubs, and open cells with pupae. The owner selected this on 2026-11-21.
- **HIV-009** Do not show floating green dots in the air, at the hive opening, or on drops. (The drifting dust motes caused this. They are removed.)
- **HIV-011** It must be easy to fly back into the hive. When the bee flies toward the opening, a soft draft of home air guides it into the tunnel. Sisters move out of the way at the opening and in the tunnel. Bees can still bump into each other in other places. Added 2026-11-22.
- **HIV-012** Do not show blue, green or other colored spots in the air or in the glow at the hive opening. Bee wings must have only a soft, warm sheen that the light makes, not bright neon colors. The final image must not show bad pixels as colored spots. Added 2026-11-22.

- **HIV-013** On the comb, the mouse must turn the bee smoothly at all times. Left and right turn the bee on the comb. Up and down tilt the view only. The view must not ignore the mouse and then snap. The bee walks in the direction it faces. Added 2026-11-22.
- **HIV-014** When the bee comes out of the cell, the view turns smoothly to look along the comb. At take-off, the view turns smoothly into flight.
- **HIV-015** In the view from outside, the bee must waddle when it walks on the comb, as its sisters do: the body swings left and right, approximately three times a second. When the bee stands, the body must be still. (The owner, 2026-11-22.)

## 3. Flight

- **FLT-001** Flight must feel natural: wind, swaying flowers, updrafts over stones.
- **FLT-002** Pollen adds weight. A full bee is slower.
- **FLT-003** When the player looks down and pushes forward, the bee must dive. When the player looks up and pushes forward, the bee must climb. Pitch can go to approximately 90 degrees up and down.
- **FLT-004** Height hold must not stop a dive.
- **FLT-005** Q is Dart (costs 30 honey to unlock). E is Leap (costs 65 honey to unlock).
- **FLT-006** Quick recovery unlocks at 140 honey.

## 3a. Controls help

- **KEY-001** The player must always be able to see the keys without the mouse. Hold Tab, or press H, to show the "Field notes" card. Release Tab (or press H again) to hide it. Added 2026-11-22.
- **KEY-002** When the player presses Esc and the mouse is free, the game shows the same card as a "Resting" screen. A click returns to the game. This click must not do an action (for example, take off).
- **KEY-003** A small "Tab keys" note stays in the bottom-right corner. It must be faint.
- **KEY-004** The card shows abilities that are not ready yet in dim text, with what the bee needs (honey, red clover, sisters).
- **KEY-005** Show each first-time hint one time only: V after the first flight, V again when the bee first carries pollen, R when a wasp chases and the bee has 3 sisters, F when the bee is hot and a wasp is near, Tab after 45 seconds of flight. The game keeps a record of shown hints in the browser.
- **KEY-006** The card and hints must match the style of the game. Do not use a menu with buttons.

## 4. Camera and view

- **CAM-001** V changes between first-person and third-person view. The game must keep the selected view.
- **CAM-006** A new game must start with the camera outside the bee (third-person view). First-person view is used only if the player selected it with V. In the wax cell, before the bee is out, the view stays in the bee. (The owner, 2026-11-22.)
- **CAM-002** In third-person view, the camera must stay on the line of flight.
- **CAM-003** In third-person view, a soft shadow disc shows where the bee aims.
- **CAM-004** In third-person view, the player must see the pollen on the bee. Pollen packs on the hind legs must grow as the baskets fill.
- **CAM-005** The legs must hang down in flight and swing opposite to the bank.

## 5. Collisions (solid objects)

- **COL-001** Mushrooms must be solid: stem and cap.
- **COL-002** Other bees must be solid. The bee must not fly through other bees.
- **COL-003** Flowers must be solid: stems, the cup and the petals.
- **COL-004** Flowers that close at dusk must stay solid. The bee must not fly through closing petals.
- **COL-005** The arches that hold the dew drops must be solid. The bee can fly through the opening only. A fast bee must not go through the arch stem.
- **COL-006** The wasp nest must be solid.
- **COL-007** Trees, trunks, hedges, the hollow log and stones must be solid.

## 6. Flowers and pollen

- **FLW-001** The bee gets pollen only from the top of a flower.
- **FLW-002** Flowers of value 2 or more need a hold. Flowers of value 3 need a 2-second hold, and the hold calls wasps.
- **FLW-003** In the walled garden, the canopy flowers are value 1. The ground flowers are value 2. The five sunblooms near the trees are value 3.
- **FLW-004** Flower types include daisy, poppy and cosmos. Poppies must be open, not closed like tulips.
- **FLW-005** A golden glow shows a flower that overflows with nectar. The glow does not stay for a long time.
- **FLW-006** When the bee lands on a flower that needs a hold, the bee stays on the flower until it gets the pollen. Forward thrust (W) must not push the bee off. Space or S releases the bee. (2026-11-22)
- **FLW-007** Removed on 2026-11-22. The owner did not want garden nectar or royal jelly.

## 7. Hidden flight challenges

- **CHL-001** The dew-drop run must look like a path. Thick grass must be on each side. A narrow, worn track with no grass must connect the dew drops, like a mouse trail.
- **CHL-002** The grass must be thick everywhere.
- **CHL-003** Scent trails: golden motes go through natural gaps (the log, the arches, the hedge gap, between trees, across the pond). After the bee touches the trail, the scent fades behind the bee. If the bee gets to the end first, the end flower overflows with nectar and the bee gets 2 honey.
- **CHL-005** Misty brook: a small stream runs west of the pond. When the bee skims low and fast over the water, the cool air carries it (speed boost). Branches lean low over the brook and sway in the wind. They are solid.
- **CHL-006** Bramble hollow: a ring of thorny brambles with a leafy roof. The walls and the roof are solid. The only way in is through a hollow root. Five moonbells (value 3) grow inside.
- **CHL-007** Petal gusts: ribbons of petals ride the wind. When the bee flies inside a gust, the gust carries it.
- **CHL-004** A scent trail must never look like a course. No signs, no rings, no timer on the screen.

## 8. Wasps and other dangers

- **WSP-001** A wasp chases a bee that has pollen. A sting takes half of the pollen.
- **WSP-002** Wasps must look slim, with bands and long yellow legs.
- **WSP-003** Wasps make a positional sound. The sound must be menacing: the "hornet drone" (low, gritty, two detuned saws and a sub-octave, with a wingbeat flutter). The owner selected it on 2026-11-21.
- **WSP-004** Rescue events: wasps attack a sister. The bee must hit the wasps at speed to save her.
- **WSP-005** Golden-flower raids: wasps come to a flower that overflows with nectar.
- **WSP-006** Nest raid: the garden wasps guard their nest and fly out at intervals. When no wasp guards the nest, it glows and drips honey. The bee holds under the nest for approximately 2 seconds to take 3 balls of honey. Then all the nest wasps chase the bee.
- **WSP-007** Revenge: a wasp that chases the bee can fly into a spider web. The spider eats it. Near the pond, dragonflies catch wasps that chase the bee. Each catch gives 2 honey.
- **WSP-008** Spider webs hold the bee. The player wriggles free with space or a click.
- **WSP-009** Dragonflies at the pond hover, look at the bee, then strike. Dart (Q) avoids the strike.

- **WSP-010** Heat buzz: after the bee drinks from a rare red clover, it can release a heat pulse. The pulse knocks nearby wasps out of the air. They lie dazed in the grass for some seconds.
- **WSP-011** Bee ball: the bee can call its sisters. The sisters swarm a wasp and make a glowing ball of bees around it. The wasp falls.

- **WSP-012** Calm: after every 5 wasps that the bee beats, the other wasps keep away for 60 seconds.
- **WSP-013** Controls: F is heat buzz. R calls the sisters. The bee needs 3 sisters or more to call them.
- **WSP-014** Removed on 2026-11-22. The owner does not want the hunter path (Ember wings, Strike, Finisher). Do not add it again.
- **WSP-015** Later (not done): a gardener path. Garden flowers give seeds. The bee plants a seed on bare ground and a flower grows. (2026-11-22)

## 9. Zones, honey and the day

- **ZON-001** Honey stores are the lifetime honey minus the honey that the bee spent.
- **ZON-002** Scent stones open zones: the walled garden (20 honey), the lily pond (60), the forest edge (120). The bee lands on the wax to pay.
- **ZON-003** A locked zone pushes the bee back with a breeze.
- **ZON-004** A day is 8 minutes. The sun goes down. Flowers close at dusk. Pollen outside the hive at night is lost. With the night (section 11), the day ends at moonset (NGT-025).
- **ZON-005** At the end of the day, a card shows bonus honey.
- **ZON-006** A faint shimmer in the sky must stand above the direction of the hive (the sun compass of the bee). It must be subtle. Do not use arrows, a compass, or a HUD marker.

## 10. Graphics

- **GFX-001** The hero bee has a ringed abdomen, compound eyes, crisp fur and veined wings.
- **GFX-002** The bee must not look blurry or fuzzy.
- **GFX-003** Trees: crowns are layers of leaf sprays over a darker inner crown. The outline must break into leaves, not smooth balls. Garden trees mix blossom and leaves. Limbs go from the trunk into the crown. Limbs are solid. The owner approved this on 2026-11-22.
- **GFX-004** Grass: tufts of slim blades that twist and curl, with dry tips and some seed spikes. Clover and moss grow on the ground. The grass must stay thick (CHL-002).
- **GFX-005** Hive tree: dark bark plates with no long pale streaks. The hive door has a lumpy, dark propolis lip, amber stains and small wax drips. The lip must not make the opening smaller.
- **GFX-006** Add `?mp=0` to the address to see the old look for a comparison.
- **GFX-007** The old hollow log must look like a fallen tree, so that the player knows what it is: the same bark as the standing trees with ridges along the trunk, a wider root end, a splintered break at the other end, broken branch stubs, moss only in patches on the top side. It must not look like a smooth tube with flat sawn ends. The bee must stay outside the wider root end. (The owner, 2026-11-22.)
- **GFX-008** The cover of the night grove (CHL-006) must look like a wild bramble thicket, so that the player knows what it is: many leaves with a ragged outline, arching canes with thorns, young green shoots that arch into the air, some small pale flowers, and black and red blackberries. It must not look like a smooth round mound with speckles. The walls, the roof and the root tunnel stay as they are (CHL-006). No leaves hang inside the grove or in the root tunnel. (The owner, 2026-11-22.)

## 11. The night

- **NGT-001** At the end of the day (dusk), the night starts. The day does not end at dusk. The moon rises.
- **NGT-002** The moon is the clock of the night. A night is 4 minutes (240 seconds). The moon rises, goes across the sky, and sets.
- **NGT-003** When the moon is low, show a short message: fly home before the moon sets.
- **NGT-004** The bee can sleep in the hive to skip the night. The bee must stay in the hive for 15 seconds with no pollen. Then the night ends.
- **NGT-005** Moonflowers open only at night. In the day, do not show moonflowers.
- **NGT-006** Plain moonflowers stand in the open meadow, away from the hive, the zones and other flowers. They are value 2.
- **NGT-007** Two moonflowers stand on high hilltops, in the wind. They are value 3.
- **NGT-008** A moonflower must look like a real moonflower: a wide, white, shallow trumpet with five points, a pale green star of creases and a pale green-yellow throat. It stands on a slim stem with heart-shaped leaves.
- **NGT-009** A closed moonflower is a slim, twisted, pointed bud. When it opens, it must turn and spread. It must not only grow larger.
- **NGT-010** An open moonflower glows softly from the throat and the creases. The light is cool blue-white. The petals stay dim. Do not make a white blob.
- **NGT-011** The bee gets nectar only from the top of an open moonflower. The bee must hold on (approximately 1 second; approximately 1.5 seconds in the grove).
- **NGT-012** Each moonflower gives nectar one time each night. After that, its glow becomes weak.
- **NGT-013** Moonflowers are solid, like all flowers (COL-003).
- **NGT-014** Loose fireflies drift near the open moonflowers.
- **NGT-015** Clusters of fireflies sleep at three places: above the flower field, near the standing stone and before the dew arches.
- **NGT-016** When the bee flies through a sleeping cluster, the fireflies wake. They make a line of loose, living loops, with some fireflies between the loops. The line goes to the root of the bramble hollow.
- **NGT-017** When the bee flies through a loop, the loop pulses. Some fireflies then fly behind the bee as a tail.
- **NGT-018** Each loop has a time limit (13 to 15 seconds). The next loop blinks when the time is almost over. If the time ends, the fireflies drift back to sleep. There is no other penalty. The bee can try again after approximately 9 seconds.
- **NGT-019** The fireflies are creatures. A loop must move and must have an uneven shape. A loop must never look like a perfect hoop.
- **NGT-020** The tail lights the ground and the flowers near the bee with a soft, warm light.
- **NGT-021** The tail leaves the bee at the hive door.
- **NGT-022** When the bee completes a full line of loops and goes in by the root, the fireflies light the grove in the hollow. Five large moonflowers then open.
- **NGT-023** The grove moonflowers are value 4. They open only after a full line of loops. They are a little richer in color (a faint lilac edge).
- **NGT-024** At night, wasps stay in their nests. Rescue events, overflowing day flowers and nest raids do not start.
- **NGT-025** At moonset, the night ends and the day card shows (ZON-005). Pollen that is outside the hive at moonset is lost (ZON-004). Note: before the night, this happened at dusk. Now it happens at moonset, or when the bee sleeps in the hive.
- **NGT-026** Add `?night=0` to the address to switch off all of the night. On a page that does not keep the `?` part (the Claude artifact), add `#night-off`. This switch also turns off the moths and the bat (`moths.js`, `moth-model.js`, `bat.js`, `bat-model.js`). Then the day must play and look exactly as before, pixel for pixel.
- **NGT-027** The night must not change the random numbers of the day. The night uses its own random numbers.
- **NGT-028** Do not use rings, gates, courses or checkpoints in the night, in the words or in the look (GEN-001, GEN-002).
- **NGT-029** Each loop must be in clear air. A loop must not be in a solid object or in a locked zone. A loop must be wide enough for a careful pilot (radius 1.7 or more).
- **NGT-030** After the last loop before the root, the line is safe. The fireflies then wait for the bee in the hollow for 45 seconds.

The lines NGT-031 to NGT-047 are not approved by the owner yet. NGT-037 to NGT-040 (moths as guides) are the owner's choice of 2026-11-22; their numbers and places are not approved yet. NGT-043 to NGT-045 (the dangerous bat) are the owner's request of 2026-11-22; the numbers (height 40, 6 seconds, 2.5 seconds) are not approved yet.

- **NGT-031** Moths come from the second night. On the second night two moths come, then one more each night, up to four. They come one after the other as the moon climbs. On the first night no moths come.
- **NGT-032** A moth is a pale hawk moth. It hovers at an open moonflower and drinks it. After approximately 30 seconds the flower is dry: it becomes dim and gives no nectar that night. Then the moth has drunk its fill: it drinks no more that night (NGT-037).
- **NGT-033** When the bee flies near a drinking moth, the moth flies away. The flower keeps the nectar that is left. The moth does not go back to that flower for some time.
- **NGT-034** If a moth drank more than half of a moonflower, the flower is worth 1 less.
- **NGT-035** Moths go to light. A bee with a firefly tail (3 or more fireflies) pulls near moths away from the flowers. The moths fly around the bee. When the light goes, the moths go back to the flowers.
- **NGT-036** Add `?moths=0` to the address (or `#moths-off`) to switch off the moths. Then the night must be as before.
- **NGT-037** Moths are guides. A moth that has drunk a flower dry flies to the nearest night bloom that is still shut and that no other moth has chosen. It flies faster than a moth that looks for flowers (8.5 against 4.6) and leaves wing dust in the air, which the bee can follow for approximately 8 seconds. A bee near it or a firefly tail must not turn it from its way. The bat must not take it.
- **NGT-038** A night bloom is a hidden flower with a lilac edge. It is a shut bud and gives nothing until its moth lands on it. Then it opens and glows. It opens for no one else. A message tells this if the bee is near.
- **NGT-039** An open night bloom gives nectar worth 3 (worth 4 on the highest hill), one time a night. The moth sits on its bloom for the remainder of the night. When the bee comes to drink, the moth lifts off, and then it sits down again.
- **NGT-040** There are four night blooms at fixed places outside the locked zones: on the fallen tree, on the widest mushroom, behind the top of the highest hill and behind the top of the hill by the walled garden. Each night all four start shut. They are not shown in the day or on a night without moths.
- **NGT-041** The bat comes from the third night, after the moon is up. There is one bat. On the first two nights no bat comes.
- **NGT-042** The bat flies one fixed round in the open air over the eastern meadow, 40 to 50 above the ground. One round is approximately 53 seconds. The bat comes past the same place again after the same time. On its round the bat makes no sound that the bee can hear.
- **NGT-043** At night, from the third night, the air more than 40 above the ground belongs to the bats. This limit is above most treetops and well above the hive door. When the bee flies higher than the limit in the open, a bat hears it: a squeak of two notes sounds, and a message tells the player to go down. Then the bee hears echolocation calls. The calls come faster and louder while a bat comes nearer in circles. After approximately 6 seconds the calls run together and the bat dives. When the bee is 40 or more above the limit, this time is 3 seconds. The bat catches the bee. Then the bee wakes up in its cell at home, and the pollen that it carried is lost. There is no other penalty. The night continues. (The owner, 2026-11-22: "actually very dangerous"; "It'll start with a squeak, then the echolocation noises, and they'll get louder and louder until he gets you".)
- **NGT-044** A bee that stays below the limit is safe all night, at any speed. Within 60 of the hive tree, the bee is safe at any height. In the daytime the bats do not hunt.
- **NGT-045** If the bee goes down below the limit, the calls become slower and quieter. After a maximum of 2.5 seconds below the limit, the bat has lost the bee and turns away. If the bee goes up again before that, the hunt continues from where it was. A bee that gets below the limit during the last dive is not caught.
- **NGT-046** After the middle of the night, the bat takes one moth. It takes no more than one moth each night.
- **NGT-047** Add `?bat=0` to the address (or `#bat-off`) to switch off the bat. Then the night must be as before.
- **NGT-048** To try a part at once: with `#night-now` the day starts at dusk, so the night comes soon; with `#moths-now` and `#bat-now` the moths and the bat come on any night (not only from the second or third night). Not approved by the owner yet.

## 12. Tests

- **TST-001** Tests must be deterministic. The same game files must always give the same results.
- **TST-002** The test harness sets a fixed random seed, a frozen clock and fixed time steps. Tests must not use real time or sleeps.
- **TST-003** Each test has the ID of the requirement that it checks.
- **TST-004** Each test starts with a fresh game.
- **TST-005** A screenshot must match its reference image pixel for pixel. Use one container image for all screenshots.
- **TST-006** When a change must alter the look, look at the new screenshots and the difference images first. Then save the new reference images.
- **TST-007** Run all tests two times (`--twice`) after a change to the test harness. Both runs must give the same results.
- **TST-008** Run all tests before each release. If a test fails, do not publish (see "How to use this document").
- **TST-009** If a test cannot work until the game is repaired, keep it in a pending list with the reason. Add it to the tests after the repair.

## 13. Code structure

Not approved by the owner yet.

- **MOD-001** `main.js` only builds the game. It has only comments, module imports and setup steps. Each setup step is called one time. Do not change the order of the steps. Do not move code from one step to a different step. The seeded world and the random numbers depend on this order.
- **MOD-002** Each file in `src/` has one subject. The first line of each file is a `// Honeylight: ...` line that says what is in the file. `src/README.md` has a table of the files.
- **MOD-003** `src/core.js` and `src/world.js` are the base modules. `core.js` must not import from `src/`. `world.js` must import only from `core.js`.
- **MOD-004** A function name must say what the function does. Do not use the name of a build round or a batch in a function name.
- **MOD-005** The night stays in separate files (`night.js`, `moonflowers.js`, `moths.js`, `moth-model.js`, `bat.js`, `bat-model.js`). Files in `src/` must not import them. One switch (`?night=0`) turns off all of the night (NGT-026). The storm also stays in separate files (`storm.js`, `storm-view.js`). `storm.js` decides when and where it rains; `storm-view.js` only draws. It talks to the game through `window.__g` and a few hooks tagged "storm.js" in `src/`. One switch (`?storm=0`) turns it off (STM-009).
- **MOD-006** A move or a rename of code must not change the game. After the change, all tests must pass and all screenshots must match pixel for pixel without `--update`.
- **MOD-007** Do not put a `//` comment in a one-line function or loop. Use `/* */`.
- **MOD-008** A name that one module declares must be changed only in that module. Other modules can only read it.
- **MOD-009** A new load-time step goes at the end of `main.js`. Put it in a different place only if the tests show that the place is safe (MOD-006).
- **MOD-010** Do not remove or rename a key of `window.__g`. Tests and tools use these keys.

## 14. The storm

Not approved by the owner yet.

On some afternoons the air goes still, a dark cloud comes over from beyond the flower field, and a band of rain crosses the land toward the hive. The bee flies home ahead of it or waits under a roof. When the rain has passed, the flowers are full again and a rainbow stands on the meadow. The storm is in `storm.js` (what happens) and `storm-view.js` (what it looks like).

- **STM-001** There is no storm on the first three days. On day 4, 7, 10 (every third day from day 4), a storm starts to brew when two fifths of the afternoon are gone. There is one storm a day at most. A message and the time of day say that a storm is coming.
- **STM-002** While the storm brews, the air goes still. Then the wind rises and blows from the storm. The light starts to go. The flowers shut before the first rain, and a shut flower gives no pollen. The first rain falls at the far edge of the land about 35 seconds after the storm starts to brew.
- **STM-003** The rain is a band. It moves toward the hive side at 16 each second. It reaches the far field first and rains about 35 seconds at each place.
- **STM-004** A bee cannot fly in rain. In open rain the wings soak in approximately 4 seconds. Soaked wings give little lift and little speed: the bee comes down. It can walk on the ground, and with the rise key it can flutter as high as the grass tops (approximately 8), so that the player can see where a roof is. No pollen is lost. Messages tell the rule at the first rain and when the bee is down. Over the pond the wings must stay light enough (0.45 at most) to reach the shore. (The owner chose "Rain grounds you" on 2026-11-22. This replaces the pollen that washed out.)
- **STM-005** Under a roof the bee stays dry and keeps its pollen. The roofs are: the hive, the crown of the hive tree, a tree, a mushroom, the old fallen tree and the bramble hollow.
- **STM-006** When the rain has passed, the flowers open and are full again, and the light and the wind come back. A rainbow stands for about 75 seconds. Then no trace of the storm is left.
- **STM-007** One foot of the rainbow stands on a flower of the field. Near the foot, the next harvests are worth 1 more, at most 5 times.
- **STM-008** In the storm the wasps stay in and no flower overflows. Lightning is light and sound only: it never falls near the bee and takes nothing.
- **STM-009** Add `?storm=0` to the address (or `#storm-off`) to switch off the storm. With `#storm-now` (or `?storm=1`) a storm starts 15 seconds after the bee first flies out.
- **STM-010** On a day without a storm, the game must play exactly as with the storm switched off (the same positions and the same random numbers). The storm never calls `Math.random` while there is no storm, and it shows nothing then.
- **STM-011** Soaked wings dry in approximately 2.5 seconds under a roof. Then the bee can fly again, so it can go from roof to roof in short flights. The wings also dry when the rain has passed and when the storm is over.

## 15. The try-out menu

The owner asked for this menu on 2026-11-22 ("a menu that picks the stage, and a checkbox that enables all zones"). The stage list and the details below are a first version: not approved by the owner yet.

- **TRY-001** The page must show a small menu at the top right, in a file of its own (`stage-menu.js`). It has a list of stages and a checkbox for the zones. The menu is not for players: it shows only when the address has `?menu=1` (or `#menu-on`, for a page that does not keep the `?` part). Without one of these, the menu is not there. (Changed 2026-11-22: The owner said that the menu must not be for everyone.) A menu that is not used must not change the game.
- **TRY-002** The list has these stages: afternoon; storm (it starts to brew, the rain is close, the rain has just passed); dusk; night 1 (moonflowers and fireflies), night 2 (two moths), night 3 (three moths and the bat), night 4 (four moths and the bat). When the player picks a stage, that stage starts at once. If the bee has not hatched yet, the hatching is skipped and the bee is in the air outside the hive. A night stage sets the day to its number (night 3 is day 3). A storm stage sets the day to a storm day (day 4, 7, 10: the first one that is not before the current day). Afternoon and dusk keep the day. (Changed 2026-11-22: The owner said that the jumps must not stay on day 1.)
- **TRY-003** The player can pick each stage from each other stage. A night or a storm that is in progress ends first. While the end-of-day card shows, a pick does nothing and a hint says so.
- **TRY-005** The menu has a day field. It shows the current day. When the player types a day number, the game goes to the afternoon of that day, and the save keeps that day. What belongs to that day then comes by itself (the storm on a storm day, the moths and the bat at night).
- **TRY-004** The checkbox opens all zones (the walled garden, the lily pond, the forest edge) and spends no honey. It stays on after a reload. When the player clears it, the zones go back to what they were before.

## Change log

- 2026-11-22: TRY-001: the try-out menu is hidden unless the address has `?menu=1` or `#menu-on` (it was shown to everyone, with `#menu-off` to hide it).

- 2026-11-22: The owner chose "Rain grounds you". STM-004 changed (soaked wings bring the bee down; no pollen is lost), STM-005 names the fallen tree, added STM-011 (wings dry under a roof).
- 2026-11-22: The bat is dangerous (the owner's request). NGT-042 to NGT-045 changed: the bat no longer clips a fast bee in low air; a bee above the limit of 40 is heard, hunted with a squeak and calls that grow, and taken home.
- 2026-11-22: Added GFX-008 (the mound over the night grove is a bramble thicket). The owner chose this look.
- 2026-11-22: The owner's play-test notes. Added CAM-006 (the game starts with the camera outside the bee), HIV-015 (the waddle on the comb), GFX-007 (the old log is a fallen tree) and NGT-037 to NGT-040 (moths as guides to hidden night blooms). NGT-032 changed: a fed moth drinks no more that night.
- 2026-11-22: TRY-002 changed and TRY-005 added: the stage jumps set the day number, and the menu has a day field (the owner: the controls stayed on day 1).
- 2026-11-22: Added section 15 (the try-out menu, TRY-001 to TRY-004) at the owner's request. The moths and the bat now take their night number from `NIGHT.nightNo()` so that the menu can show a later night and not change the day number.
- 2026-11-22: Added section 14 (the storm, STM-001 to STM-010) and NGT-048 (the try-it switches). MOD-005 now lists the storm files. Not approved by the owner yet.
- 2026-11-22: Added NGT-031 to NGT-036 (moths) and NGT-041 to NGT-047 (the bat). NGT-026 and MOD-005 now list the moth and bat files. Not approved by the owner yet.
- 2026-11-22: Added MOD-001 to MOD-010 (code structure after the module split). Not approved by the owner yet.
- 2026-11-22: Added NGT-001 to NGT-030 (the night: moon, moonflowers, fireflies, the hollow grove) and TST-001 to TST-009 (tests). ZON-004 and ZON-005 now happen at moonset (NGT-025). Not approved by the owner yet.
- 2026-11-22: Removed FLW-007 and WSP-014 (hunter path undone at the owner's request).
- 2026-11-22: Added FLW-006 (hold on to a flower), FLW-007 (garden nectar), WSP-014 (royal jelly, hunter path), WSP-015 (gardener path, later).
- 2026-11-22: Added HIV-013, HIV-014 (mouse on the comb) and KEY-001 to KEY-006 (controls help).
- 2026-11-22: GFX-003 changed (model pass done). Added GFX-004 to GFX-006.
- 2026-11-22: Added HIV-011 (easy return to the hive) and HIV-012 (no colored spots at the hive opening).
- 2026-11-21: Added CHL-005 to CHL-007, WSP-012, WSP-013.
- 2026-11-21: Added HIV-010, WSP-010, WSP-011, and the hornet drone sound (WSP-003).
- 2026-11-21: First issue. All requests up to the sun compass, the dew path, solid arches, solid closing flowers, walking on the comb, leg pollen and the green dots.
