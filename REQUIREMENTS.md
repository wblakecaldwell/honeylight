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

## 3. Flight

- **FLT-001** Flight must feel natural: wind, swaying flowers, updrafts over stones.
- **FLT-002** Pollen adds weight. A full bee is slower.
- **FLT-003** When the player looks down and pushes forward, the bee must dive. When the player looks up and pushes forward, the bee must climb. Pitch can go to approximately 90 degrees up and down.
- **FLT-004** Height hold must not stop a dive.
- **FLT-005** Q is Dart (costs 30 honey to unlock). E is Leap (costs 65 honey to unlock).
- **FLT-006** Quick recovery unlocks at 140 honey.

## 4. Camera and view

- **CAM-001** V changes between first-person and third-person view. The game must keep the selected view.
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

## 9. Zones, honey and the day

- **ZON-001** Honey stores are the lifetime honey minus the honey that the bee spent.
- **ZON-002** Scent stones open zones: the walled garden (20 honey), the lily pond (60), the forest edge (120). The bee lands on the wax to pay.
- **ZON-003** A locked zone pushes the bee back with a breeze.
- **ZON-004** A day is 8 minutes. The sun goes down. Flowers close at dusk. Pollen outside the hive at night is lost.
- **ZON-005** At the end of the day, a card shows bonus honey.
- **ZON-006** A faint shimmer in the sky must stand above the direction of the hive (the sun compass of the bee). It must be subtle. Do not use arrows, a compass, or a HUD marker.

## 10. Graphics

- **GFX-001** The hero bee has a ringed abdomen, compound eyes, crisp fur and veined wings.
- **GFX-002** The bee must not look blurry or fuzzy.
- **GFX-003** Trees: crowns are layers of leaf sprays over a darker inner crown. The outline must break into leaves, not smooth balls. Garden trees mix blossom and leaves. Limbs go from the trunk into the crown. Limbs are solid. The owner approved this on 2026-11-22.
- **GFX-004** Grass: tufts of slim blades that twist and curl, with dry tips and some seed spikes. Clover and moss grow on the ground. The grass must stay thick (CHL-002).
- **GFX-005** Hive tree: dark bark plates with no long pale streaks. The hive door has a lumpy, dark propolis lip, amber stains and small wax drips. The lip must not make the opening smaller.
- **GFX-006** Add `?mp=0` to the address to see the old look for a comparison.

## Change log

- 2026-11-22: GFX-003 changed (model pass done). Added GFX-004 to GFX-006.
- 2026-11-22: Added HIV-011 (easy return to the hive) and HIV-012 (no colored spots at the hive opening).
- 2026-11-21: Added CHL-005 to CHL-007, WSP-012, WSP-013.
- 2026-11-21: Added HIV-010, WSP-010, WSP-011, and the hornet drone sound (WSP-003).
- 2026-11-21: First issue. All requests up to the sun compass, the dew path, solid arches, solid closing flowers, walking on the comb, leg pollen and the green dots.
