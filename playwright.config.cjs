// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './test',
  /* 并行运行测试 */
  fullyParallel: true,
  /* 失败时停止 */
  forbidOnly: !!process.env.CI,
  /* 重试失败的测试 */
  retries: process.env.CI ? 2 : 0,
  /* 每个测试文件的超时时间 */
  timeout: 30000,
  /* 全局超时时间 */
  globalTimeout: 60000,
  /* 期望的测试数量 */
  expect: {
    timeout: 5000,
  },
  /* 输出目录 */
  outputDir: 'test-results/',
  /* 运行测试的浏览器 */
  use: {
    /* 基础URL */
    baseURL: 'http://localhost:5173',
    /* 截图 */
    screenshot: 'only-on-failure',
    /* 视频录制 - 禁用以避免文件系统问题 */
    video: 'off',
    /* 追踪 */
    trace: 'on-first-retry',
  },

  /* 配置不同浏览器的项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* 运行测试的web服务器 */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
}); 