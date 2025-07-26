const { test, expect } = require('@playwright/test');

/**
 * @织: DocumentDB 简单自动化测试
 * 直接在浏览器中测试DocumentDB模块的核心功能
 */

test.describe('DocumentDB 简单测试', () => {
  test('应该能够创建和使用DocumentDB', async ({ page }) => {
    // 导航到主页面
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // 在浏览器控制台中测试DocumentDB
    const result = await page.evaluate(async () => {
      try {
        // 动态导入DocumentDB模块
        const { DocumentDB } = await import('./src/scripts/document-db.js');
        
        // 创建测试document
        const testDoc = document.implementation.createHTMLDocument('Test');
        const db = new DocumentDB(testDoc);
        
        // 测试基本功能
        db.set('test-string', 'hello world');
        db.set('test-number', 42);
        db.set('test-json', { name: 'test', value: 123 });
        
        const results = {
          string: db.get('test-string'),
          number: db.get('test-number'),
          json: db.get('test-json'),
          hasString: db.has('test-string'),
          list: db.list()
        };
        
        return { success: true, results };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    // 验证测试结果
    expect(result.success).toBe(true);
    expect(result.results.string).toBe('hello world');
    expect(result.results.number).toBe(42);
    expect(result.results.json).toEqual({ name: 'test', value: 123 });
    expect(result.results.hasString).toBe(true);
    expect(result.results.list).toContain('test-string');
    expect(result.results.list).toContain('test-number');
    expect(result.results.list).toContain('test-json');
  });

  test('应该能够处理Base64数据', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const result = await page.evaluate(async () => {
      try {
        const { DocumentDB } = await import('./src/scripts/document-db.js');
        const testDoc = document.implementation.createHTMLDocument('Test');
        const db = new DocumentDB(testDoc);
        
        const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        db.set('image', base64Data, { type: 'base64' });
        
        const retrieved = db.get('image');
        return { success: true, retrieved, matches: retrieved === base64Data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.matches).toBe(true);
  });

  test('应该能够导出和导入数据', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const result = await page.evaluate(async () => {
      try {
        const { DocumentDB } = await import('./src/scripts/document-db.js');
        
        // 创建第一个数据库
        const doc1 = document.implementation.createHTMLDocument('Test1');
        const db1 = new DocumentDB(doc1);
        db1.set('test-data', { message: 'hello', count: 42 });
        
        // 导出数据
        const exported = db1.export();
        
        // 创建第二个数据库并导入数据
        const doc2 = document.implementation.createHTMLDocument('Test2');
        const db2 = new DocumentDB(doc2);
        db2.import(exported);
        
        const retrieved = db2.get('test-data');
        return { 
          success: true, 
          retrieved,
          matches: JSON.stringify(retrieved) === JSON.stringify({ message: 'hello', count: 42 })
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.matches).toBe(true);
  });

  test('应该能够处理特殊字符', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const result = await page.evaluate(async () => {
      try {
        const { DocumentDB } = await import('./src/scripts/document-db.js');
        const testDoc = document.implementation.createHTMLDocument('Test');
        const db = new DocumentDB(testDoc);
        
        const specialString = '特殊字符: "引号" \'单引号\' <标签> &符号& \n换行\r回车\t制表符';
        db.set('special', specialString);
        
        const retrieved = db.get('special');
        return { success: true, matches: retrieved === specialString };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.matches).toBe(true);
  });
}); 