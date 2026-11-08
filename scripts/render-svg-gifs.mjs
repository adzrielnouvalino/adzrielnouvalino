
import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const browser = await chromium.launch();

const assets = [
  "contribution-graph-snake",
  "contribution-graph-tetris"
];

const fps = 10;
const duration = 8;
const totalFrames = fps * duration;

try {
  for (const name of assets) {
    console.log(`Rendering ${name}...`);

    const page = await browser.newPage({
      viewport: { width: 1200, height: 500 }
    });

    await page.goto(
      `http://127.0.0.1:8000/dist/${name}.svg`
    );

    const svg = page.locator("svg").first();
    await svg.waitFor();

    const box = await svg.boundingBox();

    if (!box) {
      throw new Error(`SVG not found: ${name}`);
    }

    await page.setViewportSize({
      width: Math.ceil(box.width),
      height: Math.ceil(box.height)
    });

    const frames = `tmp/${name}`;

    await rm(frames, { recursive: true, force: true });
    await mkdir(frames, { recursive: true });

    for (let i = 0; i < totalFrames; i++) {
      const frame = `${frames}/${String(i).padStart(3, "0")}.png`;

      await svg.screenshot({
        path: frame,
        animations: "allow"
      });

      await page.waitForTimeout(1000 / fps);
    }

    execFileSync("ffmpeg", [
      "-y",
      "-framerate", String(fps),
      "-i", `${frames}/%03d.png`,
      "-vf",
      "fps=10,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse",
      "-loop", "0",
      `dist/${name}.gif`
    ]);

    await page.close();

    console.log(`${name}.gif generated!`);
  }
} finally {
  await browser.close();
}
