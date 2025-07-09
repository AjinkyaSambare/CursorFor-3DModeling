
const puppeteer = require('puppeteer');
const { record } = require('puppeteer-screen-recorder');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const recorder = new record(page, {
    followNewTab: false,
    fps: 60,
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: '16:9',
  });
  
  await page.goto('file:///Users/Ajinkya25/Documents/Projects/3D-Modeling/cursor-3d-animation/backend/storage/temp/59f4f8a0-397c-4302-9aa6-3f058a6ecdad.html', { waitUntil: 'networkidle0' });
  await recorder.start('/Users/Ajinkya25/Documents/Projects/3D-Modeling/cursor-3d-animation/backend/storage/videos/433d014c-3998-4045-991e-f37a70011d61.mp4');
  
  // Wait for animation duration
  await page.waitForTimeout(5000);
  
  await recorder.stop();
  await browser.close();
})();
