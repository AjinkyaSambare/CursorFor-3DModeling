
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
  
  await page.goto('file:///Users/Ajinkya25/Documents/Projects/3D-Modeling/cursor-3d-animation/backend/storage/temp/8a15fdbe-e142-4e6e-aa8c-0ae6ede7b170.html', { waitUntil: 'networkidle0' });
  await recorder.start('/Users/Ajinkya25/Documents/Projects/3D-Modeling/cursor-3d-animation/backend/storage/videos/15bfc850-0302-4592-b6b5-8be9eda354c2.mp4');
  
  // Wait for animation duration
  await page.waitForTimeout(5000);
  
  await recorder.stop();
  await browser.close();
})();
