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

## Bookshelf DungeonSticks (the version for play and storage)
`make_sticks.py` adds the same book-spine relief to ecaroth's **Starlink wall template**, on both faces of the plain web.
- The connector ends and the foot are unchanged, so the sticks join and store like your other DungeonSticks.
- The relief stands 1.45 mm proud of each face, inside the template's 11.7 mm width.

```
python3 make_sticks.py "Starlink - Wall Template - 2.stl" sticks/
```

- **Output:** `bookshelf-stick-1in` to `-4in`, each with a `-b` variant that has different books.
- **Wood grain:** the top carries grain grooves 0.6 mm deep and 0.55 mm wide, with a knot or two. Prime black, then brush colour across the top; the grooves stay black. Use a 0.16 mm layer height.
- **Lengths:** the 2″ piece is the template itself. The 1″, 3″ and 4″ pieces stretch only the plain middle section, by 25.4 mm per inch. Check one against your own sticks of that length. With ecaroth's 1″, 3″ and 4″ templates, change the script to load each one directly.
- **Licence:** the template and the STLs made from it are ecaroth's design, so they are not kept in this repo. Use them for your own table only, and credit ecaroth if you share them.

## Starlink peg cleaner
`make_peg_cleaner.py TEMPLATE.stl out.stl` makes a sizing die for the male Starlink pegs. It reads the peg's star profile from the same template.
- **Size:** a 196 × 48 × 66 mm bar.
- **How it works:** a tapered star lead-in steers the peg into a throat the size of a socket. A sharp step below the throat shaves off flash and elephant's foot, or folds it over when you pull the peg back out. The trimmings fall out through the bottom.
- **Raised necks (left):** S, M and L, marked with 1, 2 and 3 dimples. Point the stick's wall forward or back, never along the bar, or it hits the next neck.
- **Inset dies (right):** S, M and L again, sunk into the 16 mm block, so they are solid on every side except the groove that takes the stick's wall. The groove also fits the bookshelf sticks.
- **Knob (middle):** palm the dome to hold the bar flat on the table, or pick it up by the waist like a stamp to try angles.
- **Using it:** push the stick straight down until the head sits on the rim, then pull it straight up. Start with M. Use S if pegs still feel tight in sockets, or L if M is hard to push through.
- **Printing:** print upright, as modelled, with no supports. The knob flares at 45°.
- **Fit check:** the template stick was placed in a neck and in each inset die, and it overlaps the tool by less than 0.04 mm³.
