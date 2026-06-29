import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.resolve(__dirname, '../public/og-image-template.html');
const outputPath = path.resolve(__dirname, '../public/og-image.png');

function findChrome() {
  if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
  } else if (process.platform === 'darwin') {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
  } else {
    // Linux/Unix
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome-stable'
    ];
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
  }

  // Fallback: search system path
  try {
    const cmd = process.platform === 'win32' ? 'where chrome' : 'which google-chrome || which chromium || which chrome';
    const foundPath = execSync(cmd, { encoding: 'utf8' }).trim().split('\n')[0].trim();
    if (foundPath && existsSync(foundPath)) {
      return foundPath;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

async function generateOgImage() {
  const chromePath = findChrome();

  if (!chromePath) {
    console.error('Error: Could not locate Google Chrome or Chromium executable.');
    console.error('Please install Google Chrome or ensure it is in your PATH.');
    process.exit(1);
  }

  console.log(`Located Chrome at: ${chromePath}`);

  const parentDir = path.dirname(outputPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const fileUrl = `file:///${templatePath.replace(/\\/g, '/')}`;

  console.log('Launching Chrome with Puppeteer Core...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: [
      '--headless',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--hide-scrollbars'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport to 1024x1024
    await page.setViewport({ width: 1024, height: 1024 });
    
    console.log(`Loading template: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'load' });
    
    console.log('Waiting for web fonts to load...');
    await page.evaluateHandle(() => document.fonts.ready);
    
    // Wait a brief moment to ensure layout reflow and rendering are complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('Capturing screenshot...');
    await page.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false
    });

    console.log(`Successfully generated Open Graph image at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating Open Graph image:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generateOgImage();
