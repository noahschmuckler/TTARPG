"""Starlink peg cleaner: a sizing die for DungeonSticks male ends.

Push a male peg down into a neck. A tapered star lead-in centres the peg and squeezes it into a throat
that is the size of a female socket. Anything that would not fit a socket (elephant's foot, flash) is
sheared off at the throat's sharp bottom edge, or pushed past it into a wider relief chamber. Pulling the
peg back up folds what is left against that edge. Three necks, small/medium/large, so you can pick the
one that suits your printer.

    python3 make_peg_cleaner.py TEMPLATE.stl out.stl

The peg profile is read from ecaroth's Starlink wall template (not included).
"""
import sys

import numpy as np
import trimesh
from manifold3d import CrossSection, JoinType, Manifold, Mesh, OpType

NECK_R = 5.95       # must slip under the stick's head and clear its wall (6.25 mm from the peg centre)
NECK_H = 9.0        # the peg is 7 mm long and the head stops 7.5 mm down; extra so the wall clears the base
LEAD_H = 3.0        # tapered star lead-in
LAND_H = 0.8        # straight throat
RELIEF = 0.5        # star chamber under the throat, this much wider: the shearing edge
BASE_H = 10.0
SIZES = {'S': 0.30, 'M': 0.45, 'L': 0.60}   # throat = peg profile grown by this much (socket is about +0.40)
SPACING = 30.0


def peg_profile(template):
    m = trimesh.load(template)
    m.apply_translation(-m.bounds[0])
    M = Manifold(Mesh(vert_properties=np.asarray(m.vertices, np.float32), tri_verts=np.asarray(m.faces, np.uint32)))
    polys = [np.asarray(p) for p in M.slice(3.0).to_polygons()]
    peg = [p for p in polys if p[:, 0].max() < 10][0]
    return peg - peg.mean(0)


def neck(peg, grow):
    throat = CrossSection([peg]).offset(grow, JoinType.Miter)
    rmax = max(np.hypot(*np.asarray(p).T).max() for p in throat.to_polygons())
    flare = min(0.85, NECK_R - 0.7 - rmax)          # keep at least 0.7 mm of lip at the star tips
    body = Manifold.cylinder(NECK_H, NECK_R, NECK_R, 96)
    # lead-in: a loft from the throat (bottom) to the wider star (top), built as thin slices
    steps = 12
    slices = []
    for i in range(steps):
        t = (i + 1) / steps
        cs = throat.offset(flare * t, JoinType.Round)
        z0 = NECK_H - LEAD_H + LEAD_H * i / steps
        slices.append(cs.extrude(LEAD_H / steps + 0.01).translate([0, 0, z0]))
    lead = Manifold.batch_boolean(slices, OpType.Add)
    land = throat.extrude(LAND_H + 0.02).translate([0, 0, NECK_H - LEAD_H - LAND_H])
    relief = throat.offset(RELIEF, JoinType.Round).extrude(NECK_H - LEAD_H - LAND_H + 0.01).translate([0, 0, -0.01])
    return body - lead - land - relief


def build(template):
    peg = peg_profile(template)
    n = len(SIZES)
    L = SPACING * (n - 1) + 28
    base = Manifold.cube([L, 26, BASE_H]).translate([-14, -13, -BASE_H])
    parts, holes = [base], []
    for i, (name, grow) in enumerate(SIZES.items()):
        x = i * SPACING
        parts.append(neck(peg, grow).translate([x, 0, 0]))
        # exit funnel through the base so trimmings fall out
        holes.append(Manifold.cylinder(BASE_H + 0.02, 8.0, 5.0, 64).translate([x, 0, -BASE_H - 0.01]))
        # size marks: 1, 2 or 3 dimples on the base in front of each neck
        for k in range(i + 1):
            holes.append(Manifold.cylinder(1.0, 1.1, 1.1, 24).translate([x + (k - i / 2) * 3.2, -10.0, -0.6]))
    return Manifold.batch_boolean(parts, OpType.Add) - Manifold.batch_boolean(holes, OpType.Add)


def main():
    tpl, out = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'starlink-peg-cleaner.stl'
    m = build(tpl).translate([0, 0, BASE_H]).to_mesh()
    t = trimesh.Trimesh(np.asarray(m.vert_properties)[:, :3], np.asarray(m.tri_verts), process=False)
    t.export(out)
    e = t.bounds[1] - t.bounds[0]
    print(f'{out}: {e[0]:.1f} x {e[1]:.1f} x {e[2]:.1f} mm, watertight={t.is_watertight}')


if __name__ == '__main__':
    main()
