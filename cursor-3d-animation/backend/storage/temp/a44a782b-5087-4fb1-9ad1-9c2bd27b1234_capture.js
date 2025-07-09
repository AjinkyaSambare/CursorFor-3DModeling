
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
  
  await page.goto('file:///Users/Ajinkya25/Documents/Projects/3D-Modeling/cursor-3d-animation/backend/storage/temp/a44a782b-5087-4fb1-9ad1-9c2bd27b1234.html', { waitUntil: 'networkidle0' });
  await recorder.start('/Users/Ajinkya25/Documents/Projects/3D-Modeling/cursor-3d-animation/backend/storage/videos/e2ddc921-3466-4617-9a38-ff2c2f6e16e5.mp4');
  
  // Wait for animation duration
  await page.waitForTimeout(5000);
  
  await recorder.stop();
  await browser.close();
})();
