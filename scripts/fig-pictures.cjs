/* Draws the Fig pictures the screen-time alerts carry (docs/timer/img/*.png), from the Fig-o-Clock page itself, so
 * the alerts and the page always look alike. Run after changing Fig: node scripts/fig-pictures.cjs */
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');

const DOCS = path.join(__dirname, '..', 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const POSES = {
  awake: m => `s=r&m=30&e=${m + 1795}&b=45&pose=still`,      // screen time just started
  yawn: m => `s=r&m=30&e=${m + 300}&b=45&pose=yawn`,         // five minutes left
  paused: () => 's=p&m=30&l=1200&b=45',                      // paused, frozen mid-yawn
  asleep: m => `s=r&m=30&e=${m - 30}&b=45`                   // time's up (or stopped)
};

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(DOCS, decodeURIComponent(req.url.split(/[?#]/)[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(DOCS) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const browser = await chromium.launch();
  try {
    for (const [name, hash] of Object.entries(POSES)) {
      // A fresh page each time: the Fig-o-Clock starts over when its link changes.
      const page = await browser.newPage({ viewport: { width: 400, height: 760 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      await page.goto('http://127.0.0.1:' + server.address().port + '/timer/#' + hash(Math.floor(Date.now() / 1000)));
      await page.waitForTimeout(1500);
      const box = await page.locator('.stage').boundingBox();
      const pad = 10, size = Math.max(box.width, box.height) + pad * 2;
      const out = path.join(DOCS, 'timer', 'img', 'fig-' + name + '.png');
      await page.screenshot({ path: out, clip: { x: box.x + box.width / 2 - size / 2, y: box.y - 3, width: size, height: size } });
      console.log(name, fs.statSync(out).size, 'bytes');
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})();
