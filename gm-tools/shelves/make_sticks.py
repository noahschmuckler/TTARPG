"""Bookshelf DungeonSticks: book-spine relief added to ecaroth's Starlink wall template.

The template's connector ends and footprint are kept exactly; only the plain web between them gets a
bookcase face (frame, shelves and books standing in relief) on both sides. The relief stays inside the
template's 10 mm foot, so the sticks store and connect exactly like the plain ones.

    python3 make_sticks.py TEMPLATE.stl OUTDIR      # writes bookshelf-stick-1in..4in (+ -b variants)

The template file is ecaroth's (DungeonSticks); it is not included here. Lengths other than the
template's 2" are made by stretching the plain middle by 25.4 mm per inch.
"""
import random
import sys
from pathlib import Path

import numpy as np
import trimesh
from manifold3d import Manifold, Mesh, OpType

# Measured from "Starlink - Wall Template - 2" (origin moved to its min corner)
BODY_X0, BODY_X1 = 12.10, 61.00          # plain web between the male post and the female socket
FACE_Y0, FACE_Y1 = 2.48, 9.23            # the web's two faces
FOOT_Z, TOP_Z = 1.10, 25.40              # top of the foot flange, top of the wall
F = 1.45                                 # relief stands this far proud of each face (foot edge is 1.62 out)
UPR = 1.4
BOARD = 1.0
PLINTH_TOP, TOPBOARD = 3.0, 24.2
BOARDS = [9.6, 17.4]
BAYS = [(PLINTH_TOP, BOARDS[0]), (BOARDS[0] + BOARD, BOARDS[1]), (BOARDS[1] + BOARD, TOPBOARD)]


def box(x0, y0, z0, x1, y1, z1):
    return Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])


def union(parts):
    return Manifold.batch_boolean(parts, OpType.Add) if len(parts) > 1 else parts[0]


def load(path):
    m = trimesh.load(path)
    m.apply_translation(-m.bounds[0])
    return Manifold(Mesh(vert_properties=np.asarray(m.vertices, np.float32), tri_verts=np.asarray(m.faces, np.uint32)))


def books_in_bay(rng, x0, x1, z0, z1):
    """Local frame: y=0 is the front of the frame, y=F is the wall face the books stand against."""
    out, maxh = [], z1 - z0 - 0.4
    x = x0 + rng.uniform(0.0, 0.5)
    stack = rng.random() < 0.18
    stop = x1 - (rng.uniform(4.5, 6.0) if stack else 0.0)
    while x < stop - 1.2:
        if rng.random() < 0.06:
            x += rng.uniform(0.7, 1.6)
            continue
        w = min(rng.uniform(1.3, 3.0), stop - x)
        if w < 1.0:
            break
        h = maxh * rng.uniform(0.62, 0.97)
        depth = rng.uniform(0.75, 1.25)
        out.append(box(x, F - depth, z0, x + w - 0.25, F, z0 + h))
        if rng.random() < 0.45 and h > 4.0:
            for bz in (z0 + 0.9, z0 + h - 1.4):
                out.append(box(x + 0.15, F - depth - 0.2, bz, x + w - 0.4, F, bz + 0.5))
        x += w
    if stack:
        z = z0
        for _ in range(rng.randint(2, 4)):
            t = rng.uniform(0.9, 1.4)
            if z + t > z1 - 0.7:
                break
            inset = rng.uniform(0.0, 0.7)
            out.append(box(stop + 0.3 + inset, F - rng.uniform(0.9, 1.25), z, x1 - 0.2 - inset * 0.5, F, z + t))
            z += t
    return out


def face(rng, length, inches):
    """Bookcase relief for one face, local x in [0, length]."""
    parts = [box(0, 0, FOOT_Z, length, F, PLINTH_TOP), box(0, 0, TOPBOARD, length, F, TOP_Z)]
    parts += [box(0, 0, b, length, F, b + BOARD) for b in BOARDS]
    cuts = [length * k / inches for k in range(1, inches)]
    ups = [(0, UPR), (length - UPR, length)] + [(c - UPR / 2, c + UPR / 2) for c in cuts]
    parts += [box(a, 0, FOOT_Z, b, F, TOP_Z) for a, b in ups]
    ups.sort()
    for (_, a1), (b0, _) in zip(ups, ups[1:]):
        for z0, z1 in BAYS:
            parts += books_in_bay(rng, a1, b0, z0, z1)
    return union(parts)


def stick(template, inches, seed):
    rng = random.Random(seed)
    grow = (inches - 2) * 25.4
    if grow:
        male = template ^ box(-1, -1, -1, BODY_X0 + 0.5, 20, 30)
        female = (template ^ box(BODY_X1 - 0.5, -1, -1, 200, 20, 30)).translate([grow, 0, 0])
        web = union([box(BODY_X0, FACE_Y0, 0, BODY_X1 + grow, FACE_Y1, TOP_Z), box(BODY_X0, 0.86, 0, BODY_X1 + grow, 10.85, FOOT_Z)])
        base = union([male, web, female])
    else:
        base = template
    length = BODY_X1 + grow - BODY_X0
    front = face(rng, length, inches).translate([BODY_X0, FACE_Y0 - F, 0])
    back = face(rng, length, inches).rotate([0, 0, 180]).translate([BODY_X0 + length, FACE_Y1 + F, 0])
    return union([base, front, back])


def main():
    tpl, out = Path(sys.argv[1]), Path(sys.argv[2] if len(sys.argv) > 2 else 'sticks')
    out.mkdir(parents=True, exist_ok=True)
    T = load(tpl)
    for n in (1, 2, 3, 4):
        for v, seed in enumerate((n * 37, n * 37 + 5)):
            m = stick(T, n, seed).to_mesh()
            t = trimesh.Trimesh(np.asarray(m.vert_properties)[:, :3], np.asarray(m.tri_verts), process=False)
            name = f'bookshelf-stick-{n}in' + ('' if v == 0 else '-b') + '.stl'
            t.export(out / name)
            e = t.bounds[1] - t.bounds[0]
            print(f'{name:28s} {e[0]:6.1f} x {e[1]:5.2f} x {e[2]:5.1f} mm  watertight={t.is_watertight}')


if __name__ == '__main__':
    main()
