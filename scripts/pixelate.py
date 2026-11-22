"""Pixelate a photo for The Millcreek Trail (docs/games/millcreek-trail/img): crop it to the scene's shape (320:150),
shrink it to 160 x 75 and cut it to a few colors, for the game's chunky look.

    python3 scripts/pixelate.py photo.jpg docs/games/millcreek-trail/img/name.png [top]

`top` is where the crop starts, as a share of the photo's height (0 = the top, 1 = as low as it goes; default .5)."""
import sys
from PIL import Image, ImageEnhance, ImageOps

src, out = sys.argv[1], sys.argv[2]
top = float(sys.argv[3]) if len(sys.argv) > 3 else .5
im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
w, h = im.size
ch = round(w * 150 / 320)
if ch > h:
    cw = round(h * 320 / 150)
    x = (w - cw) // 2
    box = (x, 0, x + cw, h)
else:
    y = round((h - ch) * top)
    box = (0, y, w, y + ch)
small = ImageEnhance.Color(im.crop(box).resize((160, 75), Image.LANCZOS)).enhance(1.15)
small.quantize(colors=32, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE).save(out, optimize=True)
print(out, box)
