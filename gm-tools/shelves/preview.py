"""Tiny software renderer for STL previews (no display needed).
    python3 preview.py out.png file.stl [file.stl ...]     # lays the parts out in a row, 3/4 view
"""
import sys
import numpy as np
import trimesh
from PIL import Image


def render(meshes, size=(1600, 700), azim=-35, elev=28, colour=(176, 132, 84)):
    a, e = np.radians(azim), np.radians(elev)
    Rz = np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1]])
    Rx = np.array([[1, 0, 0], [0, np.cos(e), -np.sin(e)], [0, np.sin(e), np.cos(e)]])
    R = Rx @ Rz
    tris, cols = [], []
    for m, c in meshes:
        v = m.vertices @ R.T
        tris.append(v[m.faces]); cols.append(np.repeat([c], len(m.faces), axis=0))
    T = np.concatenate(tris); Cc = np.concatenate(cols).astype(float)
    # screen: x right, y up (camera looks along -y after rotation: use x and z), depth = y
    P = T[:, :, [0, 2]]; Z = T[:, :, 1]
    lo, hi = P.reshape(-1, 2).min(0), P.reshape(-1, 2).max(0)
    s = min((size[0] - 40) / (hi[0] - lo[0]), (size[1] - 40) / (hi[1] - lo[1]))
    P = (P - lo) * s + 20
    P[:, :, 1] = size[1] - P[:, :, 1]
    n = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); n /= (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)
    light = np.array([0.45, -0.55, 0.7]); light /= np.linalg.norm(light)
    shade = 0.35 + 0.65 * np.clip(np.abs(n @ light), 0, 1)
    img = np.full((size[1], size[0], 3), (27, 23, 18), float)
    zb = np.full((size[1], size[0]), np.inf)
    for t in range(len(P)):
        p, z = P[t], Z[t]
        x0, y0 = np.floor(p.min(0)).astype(int); x1, y1 = np.ceil(p.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, size[0] - 1), min(y1, size[1] - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        (ax, ay), (bx, by), (cx, cy) = p
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9:
            continue
        w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not m.any():
            continue
        depth = w0 * z[0] + w1 * z[1] + w2 * z[2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]
        upd = m & (depth < sub)
        sub[upd] = depth[upd]
        img[y0:y1 + 1, x0:x1 + 1][upd] = Cc[t] * shade[t]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    out, files = sys.argv[1], sys.argv[2:]
    meshes, x = [], 0.0
    palette = {'doom': (200, 70, 70)}
    for f in files:
        m = trimesh.load(f)
        m.apply_translation([x - m.bounds[0][0], -m.bounds[0][1], 0])
        x = m.bounds[1][0] + 12
        meshes.append((m, palette['doom'] if 'doom' in f else (176, 132, 84)))
    render(meshes).save(out)
    print('wrote', out)
