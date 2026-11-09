"""Library shelf blocks for the Ledger Hall's Filing Stacks.

Double-sided bookcase blocks that fill whole 1-inch squares (1-4 squares long), plus a four-sided
1x1 "doom shelf". Books are modelled in relief with random widths, heights, depths, spine bands and the
odd stack of books lying flat. Hollow, open-bottomed, print upright with no supports.

    pip install manifold3d numpy trimesh
    python3 make_shelves.py [outdir]      # writes shelf-1.stl .. shelf-4.stl, doom-shelf.stl (+ variants)
"""
import random
import sys
from pathlib import Path

import numpy as np
import trimesh
from manifold3d import Manifold, Mesh, OpType

IN = 25.4
CELL = IN
GAP = 0.6            # play so neighbouring blocks don't bind
W = IN - 1.0         # block width: 24.4 mm
H = 32.0             # height: a bit taller than a 28-32 mm hero
D = 3.2              # depth of the shelf bays
WALL = 1.6           # shell thickness
UPR = 1.8            # upright width
PLINTH = 3.0
TOP = 1.8
BOARD = 1.4
BAYS = [(PLINTH, 11.6), (11.6 + BOARD, 21.6), (21.6 + BOARD, H - TOP)]


def box(x0, y0, z0, x1, y1, z1):
    return Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])


def union(parts):
    parts = [p for p in parts if p is not None]
    return Manifold.batch_boolean(parts, OpType.Add) if len(parts) > 1 else parts[0]


def books_in_bay(rng, x0, x1, z0, z1):
    """Books standing in one bay. Local frame: face plane y=0, back of the bay at y=D."""
    out = []
    maxh = z1 - z0 - 0.5
    x = x0 + rng.uniform(0.0, 0.6)
    stack = rng.random() < 0.18
    stop = x1 - (rng.uniform(5.5, 7.0) if stack else 0.0)
    while x < stop - 1.2:
        if rng.random() < 0.06:                       # a gap on the shelf
            x += rng.uniform(0.8, 2.0)
            continue
        w = min(rng.uniform(1.3, 3.2), stop - x)
        if w < 1.0:
            break
        h = maxh * rng.uniform(0.62, 0.97)
        depth = rng.uniform(1.7, 2.75)
        out.append(box(x, D - depth, z0, x + w - 0.25, D, z0 + h))
        if rng.random() < 0.45 and h > 4.5:           # raised bands on the spine
            for bz in (z0 + 1.0, z0 + h - 1.6):
                out.append(box(x + 0.15, D - depth - 0.35, bz, x + w - 0.4, D, bz + 0.55))
        x += w
    if stack:                                         # books lying flat in a pile
        z = z0
        for _ in range(rng.randint(2, 4)):
            t = rng.uniform(1.0, 1.6)
            if z + t > z1 - 0.8:
                break
            inset = rng.uniform(0.0, 0.8)
            out.append(box(stop + 0.3 + inset, D - rng.uniform(2.0, 2.9), z, x1 - 0.2 - inset * 0.5, D, z + t))
            z += t
    return out


def face(rng, length, uprights):
    """One bookcase face along x in [0, length]. uprights: list of (x0, x1) dividers."""
    parts = [box(0, 0, 0, length, D, PLINTH), box(0, 0, H - TOP, length, D, H)]
    for _, top in BAYS[:-1]:
        parts.append(box(0, 0, top, length, D, top + BOARD))
    for a, b in uprights:
        parts.append(box(a, 0, 0, b, D, H))
    edges = sorted(uprights)
    for (a0, a1), (b0, b1) in zip(edges, edges[1:]):
        for z0, z1 in BAYS:
            parts += books_in_bay(rng, a1, b0, z0, z1)
    return union(parts)


def shelf(n, seed):
    rng = random.Random(seed)
    L = n * CELL - GAP
    core = box(0, D, 0, L, W - D, H) - box(WALL, D + WALL, -1, L - WALL, W - D - WALL, H - WALL)
    ends = [box(0, 0, 0, UPR, W, H), box(L - UPR, 0, 0, L, W, H)]
    ups = [(0, UPR), (L - UPR, L)] + [(k * CELL - GAP / 2 - UPR / 2, k * CELL - GAP / 2 + UPR / 2) for k in range(1, n)]
    front = face(rng, L, ups)
    back = face(rng, L, ups).rotate([0, 0, 180]).translate([L, W, 0])
    return union([core, front, back] + ends)


def doom_shelf(seed):
    """Four-sided 1x1 shelf: the coloured shelf that blocks a hub exit and hunts the party down the hall."""
    rng = random.Random(seed)
    core = box(D, D, 0, W - D, W - D, H) - box(D + WALL, D + WALL, -1, W - D - WALL, W - D - WALL, H - WALL)
    posts = [box(x, y, 0, x + D + 0.4, y + D + 0.4, H) for x in (0, W - D - 0.4) for y in (0, W - D - 0.4)]
    ups = [(0, D + 0.4), (W - D - 0.4, W)]
    faces = []
    for k in range(4):
        f = face(rng, W, ups)                      # turn each face onto its side of the block
        if k == 1:
            f = f.rotate([0, 0, 90]).translate([W, 0, 0])
        elif k == 2:
            f = f.rotate([0, 0, 180]).translate([W, W, 0])
        elif k == 3:
            f = f.rotate([0, 0, 270]).translate([0, W, 0])
        faces.append(f)
    cap = box(-0.3, -0.3, H - 1.2, W + 0.3, W + 0.3, H)     # a slightly proud cornice so it reads as one heavy piece
    return union([core, cap] + posts + faces)


def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(vertices=np.asarray(mesh.vert_properties)[:, :3], faces=np.asarray(mesh.tri_verts), process=False)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    out.mkdir(parents=True, exist_ok=True)
    made = []
    for n in (1, 2, 3, 4):
        for v, seed in enumerate((n * 101, n * 101 + 7)):
            name = f'shelf-{n}' + ('' if v == 0 else '-b') + '.stl'
            t = to_trimesh(shelf(n, seed))
            t.export(out / name)
            made.append((name, t))
    t = to_trimesh(doom_shelf(666))
    t.export(out / 'doom-shelf.stl')
    made.append(('doom-shelf.stl', t))
    for name, t in made:
        ext = t.bounds[1] - t.bounds[0]
        print(f'{name:18s} {ext[0]:6.1f} x {ext[1]:5.1f} x {ext[2]:5.1f} mm  watertight={t.is_watertight}  tris={len(t.faces)}')


if __name__ == '__main__':
    main()
