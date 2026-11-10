"""Starlink peg cleaner: a sizing die for DungeonSticks male ends.

Push a male peg into a die. A tapered star lead-in centres it and squeezes it into a throat the size of
a female socket. Anything that would not fit a socket (elephant's foot, flash) is sheared at the throat's
sharp bottom edge or pushed past it into a wider chamber; pulling the peg back up folds what is left
against that edge. Trimmings fall out through the bottom.

One bar, two kinds of die, S/M/L of each (1, 2, 3 dimples):
  * raised necks (left): the stick can point its wall any way, but the neck walls are thin;
  * inset dies (right): sunk into the thick block, with a groove to the front edge for the stick's wall,
    so the die is solid on every side but that one.
A stamp-style knob in the middle: palm it to hold the bar flat on the table, or pick it up by the waist.

    python3 make_peg_cleaner.py TEMPLATE.stl out.stl

The peg profile is read from ecaroth's Starlink wall template (not included).
"""
import sys

import numpy as np
import trimesh
from manifold3d import CrossSection, JoinType, Manifold, Mesh, OpType

BAR_H = 16.0        # block thickness
BAR_W = 34.0
NECK_R = 5.95       # must slip under the stick's head and clear its wall (6.25 mm from the peg centre)
NECK_H = 9.0        # the peg is 7 mm long and the head stops 7.5 mm down
LEAD_H = 3.0        # tapered star lead-in
LAND_H = 0.8        # straight throat
CHAMBER = 0.5       # chamber under the throat is the throat grown by this much: the shearing edge
CHAMBER_H = 5.5
WALL_GAP = 5.85     # inset dies: the groove for the stick's wall starts this far from the peg centre
GROOVE_W = 12.8     # fits the plain stick (10 mm foot) and the bookshelf sticks (11.7 mm)
GROOVE_D = 8.6      # the wall's foot is 7.5 mm below the head
SIZES = {'S': 0.30, 'M': 0.45, 'L': 0.60}   # throat = peg profile grown by this much (socket is about +0.40)
PITCH = 22.0
NECK_X = [0.0, PITCH, 2 * PITCH]
KNOB_X = 82.0
INSET_X = [120.0, 120.0 + PITCH, 120.0 + 2 * PITCH]
DIE_Y = -4.0        # dies sit towards the front; the knob is centred


def peg_profile(template):
    m = trimesh.load(template)
    m.apply_translation(-m.bounds[0])
    M = Manifold(Mesh(vert_properties=np.asarray(m.vertices, np.float32), tri_verts=np.asarray(m.faces, np.uint32)))
    polys = [np.asarray(p) for p in M.slice(3.0).to_polygons()]
    peg = [p for p in polys if p[:, 0].max() < 10][0]
    return peg - peg.mean(0)


def die_cutter(peg, grow, top, flare_limit):
    """Everything removed for one die whose rim is at height `top`: lead-in, throat, chamber, exit funnel."""
    throat = CrossSection([peg]).offset(grow, JoinType.Miter)
    rmax = max(np.hypot(*np.asarray(p).T).max() for p in throat.to_polygons())
    flare = min(0.85, flare_limit - rmax)
    steps, parts = 12, []
    for i in range(steps):                                    # lead-in, lofted in thin slices
        cs = throat.offset(flare * (i + 1) / steps, JoinType.Round)
        parts.append(cs.extrude(LEAD_H / steps + 0.01).translate([0, 0, top - LEAD_H + LEAD_H * i / steps]))
    z_land = top - LEAD_H - LAND_H
    parts.append(throat.extrude(LAND_H + 0.02).translate([0, 0, z_land]))
    z_ch = z_land - CHAMBER_H
    parts.append(throat.offset(CHAMBER, JoinType.Round).extrude(CHAMBER_H + 0.01).translate([0, 0, z_ch]))
    parts.append(Manifold.cylinder(z_ch + 1.02, 8.5, 5.0, 64).translate([0, 0, -1.0]))   # exit funnel through the bottom
    return Manifold.batch_boolean(parts, OpType.Add)


def dimples(x, y, n):
    return [Manifold.cylinder(1.2, 1.1, 1.1, 24).translate([x + (k - (n - 1) / 2) * 3.2, y, BAR_H - 0.6]) for k in range(n)]


def knob():
    base = Manifold.cylinder(6.0, 16.0, 11.0, 96).translate([0, 0, BAR_H])          # flared foot
    waist = Manifold.cylinder(22.0, 11.0, 11.0, 96).translate([0, 0, BAR_H + 6.0])   # grip it here like a stamp
    cone = Manifold.cylinder(13.0, 11.0, 24.0, 96).translate([0, 0, BAR_H + 28.0])   # 45 degree flare: no supports
    top_z = BAR_H + 41.0
    dome = (Manifold.sphere(1.0, 96).scale([24.0, 24.0, 9.0]).translate([0, 0, top_z])
            ^ Manifold.cube([60, 60, 20]).translate([-30, -30, top_z]))
    return Manifold.batch_boolean([base, waist, cone, dome], OpType.Add)


def build(template):
    peg = peg_profile(template)
    x0, x1 = NECK_X[0] - 16, INSET_X[-1] + 16
    bar = Manifold.cube([x1 - x0, BAR_W, BAR_H]).translate([x0, -BAR_W / 2, 0])
    add, cut = [bar, knob().translate([KNOB_X, 4.0, 0])], []
    for i, (x, (name, grow)) in enumerate(zip(NECK_X, SIZES.items())):
        neck = Manifold.cylinder(NECK_H, NECK_R, NECK_R, 96).translate([x, DIE_Y, BAR_H])
        add.append(neck)
        cut.append(die_cutter(peg, grow, BAR_H + NECK_H, NECK_R - 0.7).translate([x, DIE_Y, 0]))
        cut += dimples(x, -14.5, i + 1)
    for i, (x, (name, grow)) in enumerate(zip(INSET_X, SIZES.items())):
        die = die_cutter(peg, grow, BAR_H, 99.0)
        # groove for the stick's wall: in the peg's own frame the wall runs along +x, then turn it to face front
        groove = Manifold.cube([40.0, GROOVE_W, GROOVE_D + 1.0]).translate([WALL_GAP, -GROOVE_W / 2, BAR_H - GROOVE_D])
        cut.append((die + groove).rotate([0, 0, -90]).translate([x, DIE_Y + 3.0, 0]))
        cut += dimples(x + 9.5, 12.5, i + 1)
    return Manifold.batch_boolean(add, OpType.Add) - Manifold.batch_boolean(cut, OpType.Add)


def main():
    tpl, out = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'starlink-peg-cleaner.stl'
    m = build(tpl).to_mesh()
    t = trimesh.Trimesh(np.asarray(m.vert_properties)[:, :3], np.asarray(m.tri_verts), process=False)
    t.export(out)
    e = t.bounds[1] - t.bounds[0]
    print(f'{out}: {e[0]:.1f} x {e[1]:.1f} x {e[2]:.1f} mm, watertight={t.is_watertight}')


if __name__ == '__main__':
    main()
