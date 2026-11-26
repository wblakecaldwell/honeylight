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
- **HIV-016** After the welcome at the birth cell, the sister who welcomes the new bee flies away as a bee flies. She must not go through a comb, the hive wall, the floor or the roof. Her speed and her change of speed must have limits, and she must not jump to a new position. To go to the space between two other combs, she flies down under the combs and up again. The three sisters who welcome the bee home fly in the same way. Added 2026-11-25.
- **HIV-017** The queen wears a small crown: a gold band with five points, a soft lavender velvet cushion inside, violet drops on the points, a blue jewel in front and a small gold cross on top. It sits a little crooked on her head and moves with her. The crown must not change anything else in the game. The owner chose this crown from mockups. Added 2026-11-25.

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
- **KEY-004** The card shows abilities that are not ready yet in dim text, with what the bee needs (honey, red clover, sisters). Until an ability is ready, the card shows only its key and what the bee needs. Do not show the name of the ability or what it does until the bee has it. Added 2026-11-23.
- **KEY-005** Show each first-time hint one time only: V after the first flight, V again when the bee first carries pollen, R when a wasp chases and the bee has 3 sisters, B when a wasp first chases the bee ("hold to look behind you"), F when the bee is hot and a wasp is near, Tab after 45 seconds of flight. The game keeps a record of shown hints in the browser.
- **KEY-006** The card and hints must match the style of the game. Do not use a menu with buttons.

## 4. Camera and view

- **CAM-001** V changes between first-person and third-person view. The game must keep the selected view.
- **CAM-006** A new game must start with the camera outside the bee (third-person view). First-person view is used only if the player selected it with V. In the wax cell, before the bee is out, the view stays in the bee. (The owner, 2026-11-22.)
- **CAM-002** In third-person view, the camera must stay on the line of flight.
- **CAM-003** In third-person view, a soft shadow disc shows where the bee aims.
- **CAM-004** In third-person view, the player must see the pollen on the bee. Pollen packs on the hind legs must grow as the baskets fill.
- **CAM-005** The legs must hang down in flight and swing opposite to the bank.
- **CAM-007** Look at yourself. When the bee sits on a flower (or on anything it can land on) for 3 seconds with no key held and no turn of the mouse, the camera swings round to the front of the bee: 45 degrees up and 45 degrees to the side, close to the bee. The swing takes about 2.4 seconds and starts and ends gently. It works from the follow view and from the bee's eyes. The owner asked for it on 2026-11-23 (mockups in `previews/wardrobe` and `previews/look-pan`). Code in `src/lookcam.js`.
- **CAM-008** Danger sense. With danger sense, when a wasp comes nearer than 30 to a bee that sits still, the camera does not go back: it moves behind the bee's shoulder on the far side from the wasp, low, so that the bee is in front and the wasp comes on behind it. The nearer the wasp, the farther back the camera goes, so both stay in the picture. With two wasps, it shows the nearest. Without danger sense, a wasp that comes near sends the camera back to the normal view (CAM-010).
- **CAM-009** Look behind. Hold B in flight (also while sitting) to look behind. The camera swings round to the front of the bee and a little to the side, and looks back past the bee along the way it came; the swing takes about 0.35 seconds. From the bee's eyes it comes out to the same place (a bee cannot turn its head that far). When B is let go, the camera goes back in about 0.2 seconds, with no snap. With danger sense, B shows the nearest wasp nearer than 60 in the CAM-008 way, wherever it is; with no wasp that near it looks behind. The owner chose the key B on 2026-11-23 (it must work while the bee moves; Shift, E and the right mouse button were not free or not easy on a laptop).
- **CAM-010** The look at yourself does not start, and goes back, when: a key is pressed or the mouse turns the bee, the bee takes off, a wasp is nearer than 30 (without danger sense), the bat hunts nearer than 80, rain falls on the bee or its wings are wet, the bee is held in a web, a long run is on, or the sisters are out to ball a wasp. Not in the hive, on the comb, in the birth cell or in the tunnel.
- **CAM-011** Every move of the camera is smooth. The camera never jumps from one place to another, also when a new move starts before the last one is done. Going back to the normal view takes about 0.6 seconds (0.2 seconds after B). When the camera is back, the game's normal camera is used exactly as before, so nothing else changes. Pressing V moves the camera between the bee's eyes and the follow view the same smooth way. (Code that sets the view directly, as the tests do, still changes it at once.)
- **CAM-012** Out of the bee's eyes and back in. The camera leaves from behind and above the head and keeps looking where the bee's eyes look until it is more than about 1 away, so the bee's body comes up from the bottom of the picture; then it turns to the bee. On the way back it comes down from behind and above, looking ahead, and goes into the head. The bee's body is drawn only when the camera is clear of it (farther than 0.4), and the antennae and pollen baskets of the bee's-eye view show only when the camera is in the head.
- **CAM-013** Danger sense is earned: a wasp chase that ends with no sting while the bee still carries pollen is an escape, and after 3 escapes the bee has danger sense. A message says so ("Danger sense ... hold B"). The escapes are saved with the honey (`honeylight.save2`, `escapes`). The Field notes card shows B as "hold to look behind you", and after danger sense "hold to look behind: danger sense finds the nearest wasp"; it does not name danger sense before. This way to earn it is for now: the owner has not chosen how danger sense is earned yet (2026-11-23).
- **CAM-014** `?look=0` in the address switches off CAM-007 to CAM-013 (the camera works as before). Tests use `window.__look` (mode, rig, idle).

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

The lines NGT-031 to NGT-047 are not approved by the owner yet. NGT-037 to NGT-040 (moths as guides) are the owner's choice of 2026-11-22; their numbers and places are not approved yet. NGT-043 to NGT-045 (the dangerous bat) are the owner's request of 2026-11-22. The owner played them and said "They sound and act great" (2026-11-22), so the numbers (height 40, 6 seconds, 2.5 seconds) stay.

- **NGT-031** Moths come every night. On the first night and on the second night two moths come, then one more each night, up to four. They come one after the other as the moon climbs. (The owner, 2026-11-22: "bats and moths should be out every night".)
- **NGT-032** A moth is a pale hawk moth. It hovers at an open moonflower and drinks it. After approximately 30 seconds the flower is dry: it becomes dim and gives no nectar that night. Then the moth has drunk its fill: it drinks no more that night (NGT-037).
- **NGT-033** When the bee flies near a drinking moth, the moth flies away. The flower keeps the nectar that is left. The moth does not go back to that flower for some time.
- **NGT-034** If a moth drank more than half of a moonflower, the flower is worth 1 less.
- **NGT-035** Moths go to light. A bee with a firefly tail (3 or more fireflies) pulls near moths away from the flowers. The moths fly around the bee. When the light goes, the moths go back to the flowers.
- **NGT-036** Add `?moths=0` to the address (or `#moths-off`) to switch off the moths. Then the night must be as before.
- **NGT-037** Moths are guides. A moth that has drunk a flower dry flies to the nearest night bloom that is still shut and that no other moth has chosen. It flies faster than a moth that looks for flowers (8.5 against 4.6) and leaves wing dust in the air, which the bee can follow for approximately 8 seconds. A bee near it or a firefly tail must not turn it from its way. The bat must not take it.
- **NGT-038** A night bloom is a hidden flower with a lilac edge. It is a shut bud and gives nothing until its moth lands on it. Then it opens and glows. It opens for no one else. A message tells this if the bee is near.
- **NGT-039** An open night bloom gives nectar worth 3 (worth 4 on the highest hill), one time a night. The moth sits on its bloom for the remainder of the night. When the bee comes to drink, the moth lifts off, and then it sits down again.
- **NGT-040** There are four night blooms at fixed places outside the locked zones: on the fallen tree, on the widest mushroom, behind the top of the highest hill and behind the top of the hill by the walled garden. Each night all four start shut. They are not shown in the day or on a night without moths.
- **NGT-041** The bat comes every night, from the first night, after the moon is up. There is one bat on the round. In the daytime there is no bat. (The owner, 2026-11-22: "bats and moths should be out every night".)
- **NGT-042** The bat flies one fixed round in the open air over the eastern meadow, 40 to 50 above the ground. One round is approximately 53 seconds. The bat comes past the same place again after the same time. On its round the bat makes no sound that the bee can hear.
- **NGT-043** At night the air more than 40 above the ground belongs to the bats. This limit is above most treetops and well above the hive door. When the bee flies higher than the limit in the open, a bat hears it: a squeak of two notes sounds, and a message tells the player to go down. Then the bee hears echolocation calls. The calls come faster and louder while a bat comes nearer in circles. After approximately 6 seconds the calls run together and the bat dives. When the bee is 40 or more above the limit, this time is 3 seconds. The bat catches the bee. Then the bee wakes up in its cell at home, and the pollen that it carried is lost. There is no other penalty. The night continues. (The owner, 2026-11-22: "actually very dangerous"; "It'll start with a squeak, then the echolocation noises, and they'll get louder and louder until he gets you".)
- **NGT-044** A bee that stays below the limit is safe all night, at any speed. Within 60 of the hive tree, the bee is safe at any height. In the daytime the bats do not hunt.
- **NGT-045** If the bee goes down below the limit, the calls become slower and quieter. After a maximum of 2.5 seconds below the limit, the bat has lost the bee and turns away. If the bee goes up again before that, the hunt continues from where it was. A bee that gets below the limit during the last dive is not caught.
- **NGT-046** After the middle of the night, the bat takes one moth. It takes no more than one moth each night.
- **NGT-047** Add `?bat=0` to the address (or `#bat-off`) to switch off the bat. Then the night must be as before.
- **NGT-048** To try a part at once: with `#night-now` the day starts at dusk, so the night comes soon; with `#moths-now` and `#bat-now` three moths come at once on any night. The bat comes every night, so `#bat-now` changes nothing now. Not approved by the owner yet.

## 12. Tests

- **TST-001** Tests must be deterministic. The same game files must always give the same results.
- **TST-002** The test harness sets a fixed random seed, a frozen clock and fixed time steps. Tests must not use real time or sleeps.
- **TST-003** Each test has the ID of the requirement that it checks.
- **TST-004** Each test starts with a fresh game.
- **TST-005** A screenshot must match its reference image pixel for pixel on every machine that draws like the machine that made the reference images. On any other kind of machine it must be the same to the eye (TST-011, TST-012).
- **TST-006** When a change must alter the look, look at the new screenshots and the difference images first. Then save the new reference images.
- **TST-007** Run all tests two times (`--twice`) after a change to the test harness. Both runs must give the same results.
- **TST-008** Run all tests before each release. If a test fails, do not publish (see "How to use this document").
- **TST-009** If a test cannot work until the game is repaired, keep it in a pending list with the reason. Add it to the tests after the repair.
- **TST-010** Anyone must be able to run all tests on any machine from a fresh copy of the repository: `npm install`, `npx playwright install chromium`, `npm test`. `package.json` names one exact Playwright version, and the tests run in the Chromium build that this version downloads for every system. The behavior tests must give the same results on every machine.
- **TST-011** The machine check. Before the runner compares screenshots, it runs a few pieces of drawing math on fixed numbers and makes two checksums of every bit of the results (`machine()` in `tests/harness.js`). `tests/golden/machine.json` holds the checksums of the machine that made the reference images. With the same checksums the runner compares pixel for pixel. With other checksums it compares "same to the eye": another kind of chip rounds dot, sin, pow and a few more a last bit differently. The runner says which way it compares, and why. The first checksum (plain * and +, fract, floor, the hashes of TST-014, a flat varying) must be the same on every machine.
- **TST-012** "Same to the eye" means all of these. At most 0.1% of the pixels are off by more than 24 of 255 in a colour channel ("far off"). At most 4 squares of 2x2 pixels are far off as a whole. No 8x8 square of the picture differs by more than 6 of 255 on average, where one pixel counts with at most 24. Single pixels that fall on the other side of an edge pass, and a sliver one pixel thin passes. An object that is missing, moved or of another colour does not pass, and a change of tint does not pass.
- **TST-013** The game must take nothing from the machine into its random numbers. The sound has its own random numbers (`sndRnd` in `src/audio.js`): a sound device can be missing, and its rate differs from machine to machine. In a test, text that the game draws into a canvas is drawn as plain blocks, because every system has other fonts.
- **TST-014** The drawing code makes random-looking numbers only with `HASH` in `src/engine.js`: `hash21` (plain * and +, fract) and `ihash11`, `ihash21`, `ihash31` (whole-number math on the bits). The values that go in must be exact on every machine: whole numbers, uniforms, flat varyings, and * or + of those. A hash of the kind `fract(sin(x)*43758.5)` is not allowed, and a smooth varying must not go straight into a hash (use `flat`).
- **TST-015** `--update` saves reference images only on a machine that draws like the reference machine, or for all screenshots at once (then this machine becomes the reference machine and `machine.json` is written again).

## 13. Code structure

Not approved by the owner yet.

- **MOD-001** `main.js` only builds the game. It has only comments, module imports and setup steps. Each setup step is called one time. Do not change the order of the steps. Do not move code from one step to a different step. The seeded world and the random numbers depend on this order.
- **MOD-002** Each file in `src/` has one subject. The first line of each file is a `// Honeylight: ...` line that says what is in the file. `src/README.md` has a table of the files.
- **MOD-003** `src/core.js` and `src/world.js` are the base modules. `core.js` must not import from `src/`. `world.js` must import only from `core.js`.
- **MOD-004** A function name must say what the function does. Do not use the name of a build round or a batch in a function name.
- **MOD-005** The night stays in separate files (`night.js`, `moonflowers.js`, `moths.js`, `moth-model.js`, `bat.js`, `bat-model.js`). Files in `src/` must not import them. One switch (`?night=0`) turns off all of the night (NGT-026). The fireflies that follow a bee on the long run at night stay in `runnight.js` (it joins the night through `NIGHT.parts`; `?runnight=0` turns it off). The storm also stays in separate files (`storm.js`, `storm-view.js`). `storm.js` decides when and where it rains; `storm-view.js` only draws. It talks to the game through `window.__g` and a few hooks tagged "storm.js" in `src/`. One switch (`?storm=0`) turns it off (STM-009).
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

- **TRY-001** The page must show a small menu at the top right, in a file of its own (`stage-menu.js`). It has a list of stages and a checkbox for the zones. The menu is hidden by default: it is there only with `#menu-on` (or `?menu=1`) in the address. A menu that is not used must not change the game.
- **TRY-002** The list has these stages: afternoon; storm (it starts to brew, the rain is close, the rain has just passed); dusk; night 1 (moonflowers and fireflies, two moths and the bat), night 2 (two moths and the bat), night 3 (three moths and the bat), night 4 (four moths and the bat). When the player picks a stage, that stage starts at once. If the bee has not hatched yet, the hatching is skipped and the bee is in the air outside the hive. A night stage sets the day to its number (night 3 is day 3). A storm stage sets the day to a storm day (day 4, 7, 10: the first one that is not before the current day). Afternoon and dusk keep the day. (Changed 2026-11-22: The owner said that the jumps must not stay on day 1.)
- **TRY-003** The player can pick each stage from each other stage. A night or a storm that is in progress ends first. While the end-of-day card shows, a pick does nothing and a hint says so.
- **TRY-005** The menu has a day field. It shows the current day. When the player types a day number, the game goes to the afternoon of that day, and the save keeps that day. What belongs to that day then comes by itself (the storm on a storm day, the moths and the bat at night).
- **TRY-004** The checkbox opens all zones (the walled garden, the lily pond, the forest edge) and spends no honey. It stays on after a reload. When the player clears it, the zones go back to what they were before.

## 16. Tight spots

The owner asked for this on 2026-11-22 ("FPV pilots love flying through small holes... close enough that some of them can be a combo (unofficial) goal"). Code in `src/gaps.js`.

- **GAP-001** The world must have small natural openings to fly through or under: a root arch, a slot between two shelf fungi, a split stump and a twig on two pebbles round the hive tree (the Home Tree line, easy); a hollow branch, a dry-stone wall with three gaps, a propped branch, a hazel hoop and a broken flowerpot beside the fallen tree (the Old Wall line, medium); a rabbit run through a bank, a curled dead leaf, two leaning stones and a knothole high in a dead snag on the south-west hill (Rabbit Bank, hard); an old fence with a missing slat and a bramble cane arch (loners). They must look natural: no rings, gates or words. The grass is short round each one.
- **GAP-002** When the bee flies through an opening, it gets a chime, a quick pulse of light round the bee and a short rev of the wing hum. Nothing shows on the screen.
- **GAP-003** When the bee hits the edge of an opening, it bumps off like any branch or stone. A pass counts (GAP-002) only at speed (8 or more) and only when the bee has not touched that spot in the last 1.2 seconds: no credit for bumping in or inching through. (Changed 2026-11-22: The owner found the tumble to the ground a pain.)
- **GAP-004** Spots of the same line passed less than 7 seconds apart climb in pitch. When all spots of a line are passed in one such chain, a short tune plays and the line is remembered.
- **GAP-005** Each opening is clear at its centre and solid round its edge.
- **GAP-006** Before the bee has flown a spot, a few motes of seed fluff drift through it as if the air is drawn through. After the first pass, blue speedwell flowers open round it and stay (saved in `honeylight.gaps`). Moss grows at each spot; at night the moss of a finished line glows.

## 17. The long run (minigame mode)

- **RUN-001** The dew path continues as one worn track that loops the whole map and comes back to its own start in the meadow: up the meadow, under the big hill by the mole tunnel (RUN-011), into the walled garden through the hedge tunnel, out by the far hedge gap, round the hills, low over the lily pond, along the misty brook, through the forest edge, and home across the meadow. Thick grass walls line it on land, except at the places of RUN-011 to RUN-016; over water it is a drift of duckweed. Nothing solid blocks it at flying height.
- **RUN-002** A bee can fly the whole loop with normal flight and no ability, at full speed, in about one minute.
- **RUN-003** The run starts when the bee is on any open part of the track (RUN-005: before the first closed zone), no higher than the grass (8 above the ground or water) and flying along the track either way round (6 or more along it), for 0.4 seconds. The run then goes the way the bee was flying: the zone, the end of the loop (RUN-008, RUN-026), the maps ("ahead") and the world's answer (RUN-020) all follow that way. Each way round has its own best loop (RUN-029). The high branch counts for challenge 3 only the first way round. The bee is "in the zone" while it stays on the track, low (under 6 above the ground or water) and fast (13 or more along the track). Each 8 seconds of clean flight adds one tier, up to 5.
- **RUN-004** A bail (off the track, too high, too slow, or a bump) drops one tier and the run goes on. Off the track and low in the grass, the grass holds the bee back (it loses about 1.5 times its speed per second, as a fraction), so a slip costs time. Being off the track never ends the run. The run ends when the bee flies more than 14 away from the middle of the track ("Off the trail"), when it is on the track but slower than 6 along it for more than 2 seconds, when it lands, or when it turns back along the track.
- **RUN-005** The run goes as far as the open zones. At the first closed zone the track stops and the run ends with "The trail is overgrown past here".
- **RUN-006** Five honeycomb cells at the bottom of the screen show the tiers: gold, pink, lavender, blue, then all colours. The cell being earned fills like honey. The cells flicker while the bee is off the track. They show only during a run.
- **RUN-007** The bee carries a coloured light while in the zone. It lights the grass and the track round the bee, gets brighter with each tier, and takes the tier's colour (the top tier cycles through all of them). In follow view a soft glow surrounds the bee. The screen edges take the same colour. A soft chord adds one note per tier.
- **RUN-008** When the whole loop is open, after 3 seconds of a run a line shows the next challenge, for example "Challenge 1: Finish the loop in bee's-eye view". It never names the prize. Challenges come in this order and only the next one can be won, at most one per run: bee's-eye view; still glowing at the end; by the high branch; carrying full pollen; at night; without a single bail; in follow view. Progress is saved. A loop is finished when the bee gets back round to the start line of RUN-026. A challenge won earns a piece of the wardrobe (WRD-002), and the line at the end of that run reads "Challenge N complete. Something new is waiting at home."
- **RUN-009** The long run is minigame mode: on-screen text is allowed there (an exception to CHL-004). It gives no honey.

The places on the long run (phase 2). Code in `src/burrow.js`, `src/gardenway.js`, `src/waterway.js`, `src/mossway.js` and `src/highbranch.js`; they build with `src/runkit.js` and `src/solids.js`. Not approved by the owner yet.

- **RUN-010** The long run goes through places made for it. They must look natural, like the tight spots (GAP-001): no rings, gates or words. They are part of the world whether a run is on or not. The bee bumps off their solid parts like off any branch or stone. The middle of the track stays clear at flying height (RUN-001).
- **RUN-011** The mole tunnel. After the dew path the track goes under the big hill: in by a hole between stones and roots, through an earth tunnel with roots hanging from its roof and pale glowing fungus as its only light, and out onto a fan of dug sand with molehills. The bee can be under the hill only inside the tunnel. The tunnel's wall and roof hold the bee in.
- **RUN-012** The garden pieces. In the walled garden the track goes through a tipped clay pot with a broken base, under a row of bean canes tied at the top, and between seed trays. The pot's wall, the canes and the trays are solid.
- **RUN-013** The spring. By the pond a spring comes out of a rib of mossy rock. Its rill runs along the top of the rock in small steps and falls from a flat stone into the pond. The track goes under that stone, between the rock and the falling water, so the bee passes behind the waterfall. The rock is solid. The falling water is not: a bee that flies through it gets wet.
- **RUN-014** The reed arches. Past the waterfall the track goes low over the pond between lily pads and under four clumps of reeds that lean across it. The bundles of stems at the two sides are solid; the leaning leaves are not. The pond's own reeds do not stand on the track.
- **RUN-015** The mossy way. In the forest the tall grass stands back from the track. Moss cushions, mossy stones and ferns line it, and big roots run out from the nearest trunks. At four spots roots arch over the track (one pair grows from an old stump). A hollow log lies on the track and the bee flies through it. The roots, the bigger stones, the stump and the log's wall are solid; moss and ferns are not. The solid stones and the roots on the ground stay outside the width of the track.
- **RUN-016** The high branch. Before the forest a fallen trunk leans up from beside the track. The bee can leave the track there, climb the trunk, follow big mossy boughs under the crowns of the forest, and glide back down to the track after the forest. Up there the wood is the track: the rules of RUN-003 and RUN-004 hold with the height measured from the wood (from 1.6 under it to 6 over it). A bee that drops off is off the track until it is on the wood or on the ground track again. A run that keeps to the high branch for 85% of it or more has gone "by the high branch" (challenge 3 of RUN-008). A bee can fly it with normal flight and no ability, without a bail. The trunk and the boughs are solid; twigs, leaves, ferns, moss and lichen are not.
- **RUN-017** The places take no number from the game's random stream, when they are built or later. The seeded world round them (flowers, wasps, webs, everything else) is the same as without them.
- **RUN-018** A place changes the track only where it stands. Where the line of the track has not moved, the samples of the first loop stay where they were, and so do the worn track and the grass walls along them, blade for blade. So a reference picture changes only if a place, or the stretch of track laid for it, is in view. (`src/longrun.js`: the list `first` is the first loop and is not edited; the list `now` is the loop with the places.)

The world answers the long run (phase 3). Code in `src/runworld.js` (by day and night) and `runnight.js` (the fireflies at night), with hooks in the grass shader (`src/plants.js`) and the light (`src/engine.js`, `uWake`, `uRunWarm`). Not approved by the owner yet.

- **RUN-019** The bow wave. From the first tier on, the grass ahead of the bee leans away from its line of flight and bends down, as if pushed aside by the air in front of it. It stands up again just behind the bee. The wave grows with the tiers. On the high branch there is no wave.
- **RUN-020** Flowers along the track. From the second tier on, little flowers (pink, white, yellow, blue and violet) spring up out of the grass at both edges of the track a little ahead of the bee and open, their heads turned to the track. Behind the bee they fold and sink back into the grass. There are none under the hill, on water or in the places. When no run is on, none show.
- **RUN-021** Petals and sparks. From the third tier on, petals stream past the bee's eyes (more with each tier). From the fourth tier on, sparks in the colour of the bee's light stream past too. Each bail blows a puff of petals past the bee.
- **RUN-022** The top tier. At the fifth tier, dew drops lift off the grass round the track and float up past the bee, and the light of the whole picture warms. Both go when the bee drops below the top tier.
- **RUN-023** Fireflies. At night, from the first tier on, fireflies rise out of the grass beside the track and fall in round the bee: three for each tier, a few beside and just ahead of it, most behind. A bail sends the last three off into the dark. When the run ends, they all drift away and go out.
- **RUN-024** Moths cannot resist the fireflies that follow a bee in the zone, just as with the night's own fireflies (NGT-033): with three or more round the bee, a moth near it leaves its flower and follows the light.
- **RUN-025** All of this shows only during a run (and while it fades after one). With no run on, the world looks exactly as without it: every reference picture is the same. It takes no number from the game's random stream. To switch off the fireflies of RUN-023 add `?runnight=0` to the address.

### The race maps and the clock

- **RUN-026** The race. A moment (1 second) into a run the race starts: the maps of RUN-027 and RUN-028 fade in, and a short line across the track marks where the bee is then. That line is the start line. With the whole loop open, the loop is finished when the bee gets back round to it (RUN-008). The maps and the clock use no words of racing.
- **RUN-027** The round map. At the bottom left, a round picture of the ground from straight above, turned so that the direction the bee looks is up. It shows about 60 from its middle to its edge, and its middle is 25 in front of the bee, so most of it shows what comes next. The track is a white line: bright ahead of the bee, faint behind it. The bee is a small gold drop. The picture is made once, early (from the game's own look, without haze and sun shadows), and does not change during play.
- **RUN-028** The outline. At the top right, the whole loop as a white line with no background, turned like the round map, with the bee as a gold drop and the start line. Its size comes from the whole loop, so it does not change when zones open.
- **RUN-029** The clock. Only with the whole loop open. Under the outline: the time of this loop since the start line (minutes, seconds and tenths), the best loop under it, and, when there is a best loop and the bee has gone some way, how far ahead (green, with a minus) or behind (rose, with a plus) the best loop it is over the same stretch of track, from wherever the race started. A finished loop that is faster than the best loop becomes the best loop: the best line glows gold, and the line at the end of the run adds "A new best loop!" and the time. The first loop becomes the best loop without that line. The best loop and its times along the track are saved with the long run.
- **RUN-030** With part of the track open, the maps show but there is no clock and no start line. On both maps the track stops where the open track stops, and fades out there. The round map shows nothing over a closed zone: the game shows through.
- **RUN-031** The maps and the clock show from the start of the race until the cells go at the end of the run, and never without a run. They are not part of the game's picture: every reference picture stays the same. They take no number from the game's random stream. To switch them off add `?racemap=0` to the address.


### Easier to follow

Asked for by the owner on 2026-11-24 after play: the run was too hard, because the grass hid everything as soon as the bee strayed. The look was approved from mockups (`previews/path-signs` in the shared folder). Code in `src/pathmarks.js` (fences, boards, lines) and the see-through grass in `src/plants.js`.

- **RUN-032** See-through grass. While the bee flies low (up to about 12 over the ground, fading out by 18), grass blades between the eye and the bee, and up to 8 ahead of the bee, turn mostly see-through (93% clear at the middle, soft at the edge, 1.2 to 3.6 from that line). In the bee's eyes that is the grass just ahead. Grass further away looks as before. It works the same with or without a run. `?see=0` switches it off.
- **RUN-033** The mice's marks. At each bend of the track (a turn of 28 degrees or more), the field mice have put up a low fence of twigs woven between stakes on the outside of the bend. At each big bend (45 degrees or more) four small wooden boards stand behind the fence, each on a stake: two face a bee coming the first way round the loop, two face a bee coming the other way. The side that faces the bee is birch bark with an arrow painted in berry juice that points the way the track turns for that bee; the back is plain wood. They stand outside the track (the fence 3.85 from its middle, the boards 4.25) and never reach over it. The grass round them stands short. The bee bumps off the fence and the boards. They are part of the world whether a run is on or not. No words, no rings, no gates.
- **RUN-034** Bee sight. While the race is on (RUN-026), faint violet lines, like the ultraviolet nectar guides that flowers show to bees, run along both edges of the track. They fade in over about a second when the race starts and fade out when the run ends; at any other time they are not drawn. They are thin and dim, and fade out about 30 ahead of the eye. They stop where the open track stops. `?marks=0` switches off RUN-033 and RUN-034.

## 18. The wardrobe

Phase 4 of the long run design. The owner approved the look from mockups on 2026-11-23 (`previews/wardrobe` in the shared folder). The build is not approved by the owner yet. Code in `src/wear.js` (the pieces and how the bee wears them), `src/rope.js` (ropes in the air) and `src/wardrobe.js` (the cell, the card, earning and saving), with two switches in the bee shaders (`src/bees.js`).

- **WRD-001** There are seven pieces, each for one place on the bee: the acorn cap with a leaf on its long stalk (head), the dandelion scarf with two ends (neck), the leaf cape (back), the glowworm tips (antennae), the moth-dust wings (wings), and two coats, the orchid-bee coat and the sun-gold coat. The bee wears at most one piece in each place, so only one coat at a time.
- **WRD-002** Each challenge of the long run (RUN-008) earns one piece, in this order: challenge 1 the acorn cap, 2 the dandelion scarf, 3 the leaf cape, 4 the glowworm tips, 5 the moth-dust wings, 6 the orchid-bee coat, 7 the sun-gold coat. When a challenge is won, the line at the end of the run reads "Challenge N complete. Something new is waiting at home." It does not name the piece.
- **WRD-003** What is earned and what is worn is saved with the long run's progress (`honeylight.run`: the number of challenges won and the list of worn pieces). A save from before the wardrobe still works: its challenges count, the pieces for them are earned, and nothing is worn. When a save is read, a worn piece that is not earned is dropped, and so is a second piece for the same place.
- **WRD-004** The wardrobe cell is one wide wax cell on the comb near the hive door: on the face of the comb that the bee walks on, low and on the door's side, so that a bee that comes home passes it. The earned pieces are in it. The cap, the scarf and the cape hang on pegs of propolis, the glowworm tips lie in the bottom corner, and the three dusts (moth dust and the two coats) rest in wax pots on a ledge. A piece that hangs or lies there leaves its place while the bee wears it; a pot stays. A piece that is not earned yet is a dim outline. While an earned piece has not been seen at the cell yet, a soft light stands at the cell.
- **WRD-005** The cell is solid. A flying bee and the camera stay out of it. A walking bee stops at its rim and cannot walk under it. The sisters walk round it. It stands clear of the dance floor, of the dance's streak and of the hole in the comb.
- **WRD-006** The card. When the bee hovers in front of the cell (slower than 2.5 for 0.3 seconds), or walks up to its rim, a small card opens at the right of the screen. It closes when the bee leaves. It lists the seven pieces in order. An earned piece has its number and its name, and "on" when it is worn. A piece that is not earned yet says only "Not yet": no name and no number. A number key (1 to 7), or a tap on the line, puts that piece on or takes it off. The number keys do nothing when the card is closed.
- **WRD-007** In follow view the bee wears its pieces, and they move with its body: the cap and the tips nod with the head, the scarf's collar and the cape swing with the abdomen. In the bee's own eyes its body is not in view; there the tips of the two antennae at the top of the view glow when the glowworm tips are worn. After the game is loaded again, the bee still wears what it wore.
- **WRD-008** The scarf's two ends and the leaf on the cap's stalk are ropes in the air. They stream behind the bee in flight, hang down when it is still, and feel the wind outside. In a turn they swing to the outside of the turn, not to the side the bee banks to. In the hive the air is still. They do not pass through the bee's body, the ground or the combs.
- **WRD-009** The moth-dust wings leave a short drift of pale sparks in the air behind them in flight (follow view). The sun-gold coat has a faint warm light round the bee.
- **WRD-010** A bee that wears nothing is drawn exactly as before the wardrobe, so every reference picture without the cell in view is the same. The wardrobe takes no number from the game's random stream, when it is built or later. The sisters and the wasps wear nothing.
- **WRD-011** Hooks for other code. `WORN.any` (`src/wear.js`, for tests `window.__wear.WORN.any`) says if the bee wears anything. `WARD.at` and `WARD.open` (`src/wardrobe.js`, for tests `window.__ward.WARD`) say if the bee is at the cell and if the card is open.
- **WRD-012** For play tests, `?wardrobe=all` (or `#wardrobe-all`) in the address makes all seven pieces earned for that visit. It does not change the saved challenges.

## Change log

- 2026-11-24: Added RUN-032 to RUN-034 (the long run is easier to follow: see-through grass near the bee, the mice's fences and arrow boards at the big bends, bee-sight lines while racing). RUN-004 changed: off the track the grass slows the bee and the run goes on; it ends only when the bee flies away from the track.
- 2026-11-25: After the owner's play test: RUN-003 changed (a simple start: on the track, no higher than the grass, flying along it for 0.4 s), RUN-026 changed (the race starts 1 s into a run, not 3 s), RUN-033 changed (a fence at every bend of 28 degrees or more, boards only at the big ones, a pair facing each way round, arrows only on the side facing the bee). The run can go either way round the loop, with a best loop for each way. A run on the track also ends when the bee is slower than 6 along it for 2 s. Asked for by the owner; the look was picked from mockups, the build is not approved yet.
- 2026-11-25: Added HIV-016 (the welcoming sister flies round the combs, not through them) and HIV-017 (the queen's crown).
- 2026-11-24: Added RUN-026 to RUN-031 (the race maps and the clock of the long run): 3 seconds into a run the race starts where the bee is, a round map of the ground ahead and an outline of the whole loop fade in, and with the whole loop open a clock shows the loop's time, the best loop and ahead or behind. RUN-003 now lets a run start on any open part of the track; RUN-008 finishes a loop at the start line. The owner approved the look from mockups and asked for the build.
- 2026-11-23: Added CAM-007 to CAM-014 (the camera that moves on its own: look at yourself when sitting still, danger sense, hold B to look behind, smooth moves out of and into the bee's eyes and on V). KEY-005 names the B hint. Asked for by the owner from the wardrobe and look-pan mockups; the owner chose B. How danger sense is earned (3 escapes) is a stand-in until the owner chooses. Not approved by the owner yet.
- 2026-11-23: The tests run on any machine. TST-005 changed (pixel for pixel on a machine that draws like the reference machine, same to the eye elsewhere) and TST-010 to TST-015 added: setup with `npm install`, the machine check, the "same to the eye" limits, no numbers from the machine in the game (the sound has its own random numbers), hashes in the drawing code that are the same on every chip, and the rule for `--update`. All reference images were made again once: the film grain, the poses of the grass blades, the fur grain and fade of the moths and the bat, and the rain streaks come from the new hashes, and the leaves of the trees are now crisp (before, each pixel of a leaf card took one of several leaf layouts by chance of rounding). The owner asked for tests that anyone can run on any machine; the new lines are not approved by the owner yet.
- 2026-11-23: Added section 18 (the wardrobe, WRD-001 to WRD-012), phase 4 of the long run design: seven pieces to wear, one earned with each challenge, the wardrobe cell on the comb near the door and its card. RUN-008 now names the new end line ("Challenge N complete. Something new is waiting at home."). The owner approved the look from mockups; the build is not approved by the owner yet.
- 2026-11-23: Added RUN-019 to RUN-025 (the world answers the long run, phase 3 of the long run design): the bow wave in the grass, flowers that spring up along the track, petals and sparks, dew and warm light at the top tier, fireflies at night, and moths drawn to them. MOD-005 now lists `runnight.js`. Not approved by the owner yet.
- 2026-11-23: Added RUN-010 to RUN-018 (the places on the long run, phase 2 of the long run design): the mole tunnel, the garden pieces, the spring and its waterfall, the reed arches, the mossy way and the high branch. RUN-001 now names the mole tunnel and the places. The high branch makes challenge 3 of RUN-008 winnable. Added RUN-018 (a place changes the track, and the grass along it, only where it stands). Not approved by the owner yet.
- 2026-11-23: Added section 17 (the long run, RUN-001 to RUN-009), phase 1 of the owner's long run design. The high branch (challenge 3) comes with the new places in phase 2.
- 2026-11-22: GAP-003 changed: no tumble, a plain bump; passes need speed and a clean line. The wall holes are now exactly as big as they look.
- 2026-11-22: Added GAP-001 to GAP-006 (tight spots).
- 2026-11-22: TRY-001 changed (the owner's request): the try-out menu is hidden unless the address has `#menu-on` or `?menu=1`.
- 2026-11-22: The owner chose "Rain grounds you". STM-004 changed (soaked wings bring the bee down; no pollen is lost), STM-005 names the fallen tree, added STM-011 (wings dry under a roof).
- 2026-11-22: NGT-031 and NGT-041 changed at the owner's request: moths and the bat are out every night, from the first. NGT-043, NGT-048 and TRY-002 follow.
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
