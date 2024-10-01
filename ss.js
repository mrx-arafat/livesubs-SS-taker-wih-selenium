const fs = require("fs");
const path = require("path");
const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

require("events").EventEmitter.defaultMaxListeners = 100;

async function scrollAndTakeScreenshot(driver, url, ssFolder, scrollDelay) {
  console.log(`Visiting: ${url}`);
  try {
    await driver.get(url);

    const totalHeight = await driver.executeScript(
      "return document.body.scrollHeight"
    );
    let currentScroll = 0;
    const scrollStep = 300;
    let screenshotCount = 1;

    while (currentScroll < totalHeight) {
      const urlName = new URL(url).hostname.replace(/\./g, "_");
      const ssPath = path.join(ssFolder, `${urlName}_${screenshotCount}.png`);
      await driver
        .takeScreenshot()
        .then((data) => fs.writeFileSync(ssPath, data, "base64"));
      console.log(`Screenshot saved: ${ssPath}`);

      currentScroll += scrollStep;
      await driver.executeScript(`window.scrollTo(0, ${currentScroll});`);
      await driver.sleep(scrollDelay);

      screenshotCount++;

      const newTotalHeight = await driver.executeScript(
        "return document.body.scrollHeight"
      );
      if (newTotalHeight > totalHeight) {
        totalHeight = newTotalHeight;
      }
    }
  } catch (error) {
    console.error(`Error visiting ${url}: ${error.message}`);
    fs.appendFileSync("error.log", `Error visiting ${url}: ${error.message}\n`);
  } finally {
    await driver.quit();
  }
}

async function takeScreenshots() {
  const urls = fs
    .readFileSync("livesubs.txt", "utf-8")
    .split("\n")
    .filter(Boolean);
  const ssFolder = path.join(__dirname, "SS");
  const scrollDelay = 1000;

  if (!fs.existsSync(ssFolder)) {
    fs.mkdirSync(ssFolder);
  }

  const maxConcurrent = 20;

  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const driverBatch = [];
    for (let j = i; j < i + maxConcurrent && j < urls.length; j++) {
      const driver = new Builder()
        .forBrowser("chrome")
        .setChromeOptions(
          new chrome.Options().addArguments(
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage"
          )
        )
        .build();

      driverBatch.push(
        scrollAndTakeScreenshot(driver, urls[j], ssFolder, scrollDelay)
      );
    }
    await Promise.all(driverBatch);
  }
}

takeScreenshots();
