const { test, expect } = require('@playwright/test');

/**
 * @织: DocumentDB 自动化测试套件
 * 使用Playwright进行真正的浏览器自动化测试
 */

test.describe('DocumentDB 自动化测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到测试页面
    await page.goto('/test/index.html');
    // 等待页面加载完成
    await page.waitForLoadState('domcontentloaded');
    // 等待测试页面元素出现
    await page.waitForSelector('h1:has-text("DocumentDB 自动化测试")', { timeout: 10000 });
  });

  test('应该成功运行所有DocumentDB测试', async ({ page }) => {
    // 点击运行测试按钮
    await page.click('button:has-text("运行所有测试")');
    
    // 等待测试完成
    await page.waitForFunction(() => {
      const log = document.getElementById('test-log');
      return log && log.textContent.includes('🎉 所有测试通过') || log.textContent.includes('💥 有测试失败');
    }, { timeout: 30000 });
    
    // 获取测试结果
    const testLog = await page.locator('#test-log').textContent();
    
    // 验证测试是否通过
    expect(testLog).toContain('🎉 所有测试通过');
    
    // 验证测试摘要显示
    await expect(page.locator('#test-summary')).toBeVisible();
    
    // 验证测试数量
    const summaryContent = await page.locator('#summary-content').textContent();
    expect(summaryContent).toContain('测试状态');
  });

  test('应该显示数据库内容', async ({ page }) => {
    // 先运行测试
    await page.click('button:has-text("运行所有测试")');
    await page.waitForFunction(() => {
      const log = document.getElementById('test-log');
      return log && log.textContent.includes('🎉 所有测试通过') || log.textContent.includes('💥 有测试失败');
    });
    
    // 点击显示数据库按钮
    await page.click('button:has-text("显示数据库")');
    
    // 验证数据库内容显示
    await expect(page.locator('#database-content')).toBeVisible();
    
    // 验证数据库HTML内容不为空
    const databaseHtml = await page.locator('#database-html').textContent();
    expect(databaseHtml).toBeTruthy();
    expect(databaseHtml.length).toBeGreaterThan(0);
  });

  test('应该能够清空测试结果', async ({ page }) => {
    // 先运行测试
    await page.click('button:has-text("运行所有测试")');
    await page.waitForFunction(() => {
      const log = document.getElementById('test-log');
      return log && log.textContent.includes('🎉 所有测试通过') || log.textContent.includes('💥 有测试失败');
    });
    
    // 点击清空结果按钮
    await page.click('button:has-text("清空结果")');
    
    // 验证结果被清空
    const testLog = await page.locator('#test-log').textContent();
    expect(testLog).toContain('等待运行测试');
    
    // 验证摘要和数据库内容被隐藏
    await expect(page.locator('#test-summary')).not.toBeVisible();
    await expect(page.locator('#database-content')).not.toBeVisible();
  });

  test('应该能够导出测试结果', async ({ page }) => {
    // 先运行测试
    await page.click('button:has-text("运行所有测试")');
    await page.waitForFunction(() => {
      const log = document.getElementById('test-log');
      return log && log.textContent.includes('🎉 所有测试通过') || log.textContent.includes('💥 有测试失败');
    });
    
    // 监听下载事件
    const downloadPromise = page.waitForEvent('download');
    
    // 点击导出结果按钮
    await page.click('button:has-text("导出结果")');
    
    // 等待下载完成
    const download = await downloadPromise;
    
    // 验证下载文件名
    expect(download.suggestedFilename()).toMatch(/document-db-test-results-.*\.json/);
  });

  test('页面应该正确加载所有元素', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle('DocumentDB 自动化测试');
    
    // 验证主要元素存在
    await expect(page.locator('h1:has-text("DocumentDB 自动化测试")')).toBeVisible();
    await expect(page.locator('button:has-text("运行所有测试")')).toBeVisible();
    await expect(page.locator('button:has-text("清空结果")')).toBeVisible();
    await expect(page.locator('button:has-text("显示数据库")')).toBeVisible();
    await expect(page.locator('button:has-text("导出结果")')).toBeVisible();
    await expect(page.locator('#test-log')).toBeVisible();
  });

  test('测试日志应该正确显示', async ({ page }) => {
    // 验证初始状态
    const initialLog = await page.locator('#test-log').textContent();
    expect(initialLog).toContain('等待运行测试');
    
    // 运行测试
    await page.click('button:has-text("运行所有测试")');
    
    // 验证测试开始
    await expect(page.locator('#test-log')).toContainText('正在运行测试');
    
    // 等待测试完成
    await page.waitForFunction(() => {
      const log = document.getElementById('test-log');
      return log && (log.textContent.includes('🎉 所有测试通过') || log.textContent.includes('💥 有测试失败'));
    });
    
    // 验证测试结果包含详细信息
    const finalLog = await page.locator('#test-log').textContent();
    expect(finalLog).toContain('开始运行 DocumentDB 测试套件');
    expect(finalLog).toContain('测试摘要');
  });
}); 