# Library shelf blocks (Ledger Hall, Filing Stacks)

These are double-sided bookcase blocks that fill whole 1-inch squares, with books in relief on both long faces. They are made for the rotating maze tiles: sticky-tack them to the solid 5×5 tiles.

| File | Size (mm) | Print for the maze |
|---|---|---|
| `stl/shelf-1.stl` (and `-b`) | 24.8 × 24.4 × 32 | 13 |
| `stl/shelf-2.stl` (and `-b`) | 50.2 × 24.4 × 32 | 18 |
| `stl/shelf-3.stl` (and `-b`) | 75.6 × 24.4 × 32 | 6 |
| `stl/shelf-4.stl` (and `-b`) | 101.0 × 24.4 × 32 | 7 |
| `stl/doom-shelf.stl` | 25 × 25 × 32, books on all four sides | 5 (paint red, blue, green, black, gold) |

- **Variants:** the `-b` files have a different random set of books, so neighbouring pieces don't match. Print a mix of both.
- **Where each piece goes:** see `assembly.png` (each tile in its Hub layout, north up).

## Printing
- Print them standing up, as modelled. They are hollow with an open bottom, so they need no supports and use little filament.
- Use a 0.16 mm layer height to bring out the spine bands.
- The shelf boards overhang the bays by 3.2 mm. That prints cleanly with good cooling.
- Each piece is 0.6 mm short of whole inches, so neighbouring blocks don't bind.

## Changing them
Run `pip install manifold3d numpy trimesh`, then `python3 make_shelves.py stl`. Height, bay depth and book sizes are constants at the top of `make_shelves.py`. To get a fresh set of books, change the seeds in `main()`.
