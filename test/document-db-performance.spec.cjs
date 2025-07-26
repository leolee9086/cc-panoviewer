const { test, expect } = require('@playwright/test');

/**
 * @织: DocumentDB 性能测试套件
 * 测试DocumentDB在各种场景下的性能表现
 */

test.describe('DocumentDB 性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("DocumentDB 自动化测试")', { timeout: 10000 });
  });

  test('应该能够快速存储大量小数据', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      const startTime = performance.now();
      
      // 存储1000个小数据
      for (let i = 0; i < 1000; i++) {
        db.set(`key-${i}`, `value-${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 验证所有数据都存储成功
      let allStored = true;
      for (let i = 0; i < 1000; i++) {
        if (db.get(`key-${i}`) !== `value-${i}`) {
          allStored = false;
          break;
        }
      }
      
      return {
        duration,
        allStored,
        totalKeys: db.list().length
      };
    });
    
    expect(result.duration).toBeLessThan(1000); // 应该在1秒内完成
    expect(result.allStored).toBe(true);
    expect(result.totalKeys).toBe(1000);
  });

  test('应该能够快速读取大量数据', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 先存储1000个数据
      for (let i = 0; i < 1000; i++) {
        db.set(`key-${i}`, `value-${i}`);
      }
      
      const startTime = performance.now();
      
      // 读取所有数据
      const values = [];
      for (let i = 0; i < 1000; i++) {
        values.push(db.get(`key-${i}`));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 验证读取的数据
      const allCorrect = values.every((value, index) => value === `value-${index}`);
      
      return {
        duration,
        allCorrect,
        valuesCount: values.length
      };
    });
    
    expect(result.duration).toBeLessThan(500); // 应该在500ms内完成
    expect(result.allCorrect).toBe(true);
    expect(result.valuesCount).toBe(1000);
  });

  test('应该能够高效处理大JSON对象', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 创建大JSON对象
      const largeJson = {
        metadata: {
          created: new Date().toISOString(),
          version: '1.0',
          description: '大JSON对象测试'
        },
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          description: `这是第${i}个项目的详细描述，包含了很多文本内容用于测试性能表现。`,
          tags: [`tag-${i % 10}`, `category-${i % 5}`],
          properties: {
            width: Math.random() * 1000,
            height: Math.random() * 1000,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            priority: i % 3
          },
          nested: {
            level1: {
              level2: {
                level3: {
                  value: `nested-value-${i}`,
                  array: Array.from({ length: 10 }, (_, j) => `nested-${i}-${j}`)
                }
              }
            }
          }
        }))
      };
      
      const startTime = performance.now();
      
      // 存储大JSON对象
      db.set('large-json', largeJson);
      
      const storeTime = performance.now() - startTime;
      
      // 读取大JSON对象
      const readStartTime = performance.now();
      const retrieved = db.get('large-json');
      const readTime = performance.now() - readStartTime;
      
      // 验证数据完整性
      const dataIntegrity = retrieved.data.length === 1000 && 
                           retrieved.data.every((item, index) => item.id === index);
      
      return {
        storeTime,
        readTime,
        dataIntegrity,
        dataSize: JSON.stringify(largeJson).length
      };
    });
    
    expect(result.storeTime).toBeLessThan(100); // 存储应该在100ms内完成
    expect(result.readTime).toBeLessThan(50); // 读取应该在50ms内完成
    expect(result.dataIntegrity).toBe(true);
    expect(result.dataSize).toBeGreaterThan(100000); // 数据应该很大
  });

  test('应该能够高效处理Base64图片数据', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 创建模拟的Base64图片数据（1MB大小）
      const base64Data = 'data:image/jpeg;base64,' + 'A'.repeat(700000); // 约1MB
      
      const startTime = performance.now();
      
      // 存储Base64数据
      db.set('large-image', base64Data, { type: 'base64' });
      
      const storeTime = performance.now() - startTime;
      
      // 读取Base64数据
      const readStartTime = performance.now();
      const retrieved = db.get('large-image');
      const readTime = performance.now() - readStartTime;
      
      // 验证数据完整性
      const dataIntegrity = retrieved === base64Data;
      
      return {
        storeTime,
        readTime,
        dataIntegrity,
        dataSize: base64Data.length
      };
    });
    
    expect(result.storeTime).toBeLessThan(200); // 存储应该在200ms内完成
    expect(result.readTime).toBeLessThan(100); // 读取应该在100ms内完成
    expect(result.dataIntegrity).toBe(true);
    expect(result.dataSize).toBeGreaterThan(700000); // 数据应该很大
  });

  test('应该能够高效执行批量操作', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      const startTime = performance.now();
      
      // 批量存储操作
      const batchSize = 1000;
      for (let i = 0; i < batchSize; i++) {
        db.set(`batch-key-${i}`, {
          id: i,
          name: `batch-item-${i}`,
          data: `batch-data-${i}`.repeat(10),
          timestamp: Date.now()
        });
      }
      
      const storeTime = performance.now() - startTime;
      
      // 批量读取操作
      const readStartTime = performance.now();
      const keys = db.list();
      const readTime = performance.now() - readStartTime;
      
      // 批量删除操作
      const deleteStartTime = performance.now();
      keys.forEach(key => db.delete(key));
      const deleteTime = performance.now() - deleteStartTime;
      
      return {
        storeTime,
        readTime,
        deleteTime,
        totalKeys: keys.length
      };
    });
    
    expect(result.storeTime).toBeLessThan(1000); // 批量存储应该在1秒内完成
    expect(result.readTime).toBeLessThan(100); // 批量读取应该在100ms内完成
    expect(result.deleteTime).toBeLessThan(500); // 批量删除应该在500ms内完成
    expect(result.totalKeys).toBe(1000);
  });

  test('应该能够高效处理导出导入操作', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 存储测试数据
      for (let i = 0; i < 500; i++) {
        db.set(`export-key-${i}`, {
          id: i,
          data: `export-data-${i}`.repeat(5),
          metadata: {
            created: new Date().toISOString(),
            tags: [`tag-${i % 10}`]
          }
        });
      }
      
      const startTime = performance.now();
      
      // 导出操作
      const exported = db.export();
      const exportTime = performance.now() - startTime;
      
      // 导入操作
      const importStartTime = performance.now();
      const newDb = new DocumentDB(document, '#document-db-import');
      newDb.import(exported);
      const importTime = performance.now() - importStartTime;
      
      // 验证导入的数据
      let importCorrect = true;
      for (let i = 0; i < 500; i++) {
        const original = db.get(`export-key-${i}`);
        const imported = newDb.get(`export-key-${i}`);
        if (JSON.stringify(original) !== JSON.stringify(imported)) {
          importCorrect = false;
          break;
        }
      }
      
      return {
        exportTime,
        importTime,
        importCorrect,
        exportSize: exported.length
      };
    });
    
    expect(result.exportTime).toBeLessThan(200); // 导出应该在200ms内完成
    expect(result.importTime).toBeLessThan(300); // 导入应该在300ms内完成
    expect(result.importCorrect).toBe(true);
    expect(result.exportSize).toBeGreaterThan(10000); // 导出数据应该很大
  });

  test('应该能够高效处理并发操作', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      const startTime = performance.now();
      
      // 先写入所有数据
      for (let i = 0; i < 100; i++) {
        db.set(`concurrent-key-${i}`, `concurrent-value-${i}`);
      }
      
      // 模拟并发读取
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            const value = db.get(`concurrent-key-${i}`);
            resolve(value === `concurrent-value-${i}`);
          }, Math.random() * 5);
        }));
      }
      
      return Promise.all(promises).then(results => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        return {
          duration,
          readSuccess: results.every(r => r === true), // 读取成功
          totalOperations: results.length,
          successCount: results.filter(r => r === true).length
        };
      });
    });
    
    expect(result.duration).toBeLessThan(1000); // 并发操作应该在1秒内完成
    expect(result.readSuccess).toBe(true);
    expect(result.totalOperations).toBe(100);
    expect(result.successCount).toBe(100);
  });

  test('应该能够高效处理内存使用', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 记录初始内存使用（如果可用）
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // 存储大量数据
      const largeData = [];
      for (let i = 0; i < 100; i++) {
        largeData.push({
          id: i,
          data: 'x'.repeat(1000), // 每个项目1KB
          metadata: {
            created: new Date().toISOString(),
            tags: Array.from({ length: 10 }, (_, j) => `tag-${j}`)
          }
        });
      }
      
      db.set('memory-test', largeData);
      
      // 记录存储后内存使用
      const afterStoreMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // 读取数据
      const retrieved = db.get('memory-test');
      
      // 记录读取后内存使用
      const afterReadMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // 清理数据
      db.clear();
      
      // 记录清理后内存使用
      const afterClearMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      return {
        initialMemory,
        afterStoreMemory,
        afterReadMemory,
        afterClearMemory,
        dataSize: JSON.stringify(largeData).length,
        retrievedSize: retrieved ? retrieved.length : 0
      };
    });
    
    // 验证数据完整性
    expect(result.retrievedSize).toBe(100);
    expect(result.dataSize).toBeGreaterThan(100000); // 数据应该很大
    
    // 如果浏览器支持内存监控，验证内存使用合理
    if (result.initialMemory > 0) {
      const memoryIncrease = result.afterStoreMemory - result.initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 内存增加应该小于50MB
    }
  });
}); 