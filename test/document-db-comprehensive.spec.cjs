const { test, expect } = require('@playwright/test');

/**
 * @织: DocumentDB 全面功能测试套件
 * 严格检查DocumentDB模块的所有功能，确保满足项目需求
 */

test.describe('DocumentDB 全面功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("DocumentDB 自动化测试")', { timeout: 10000 });
  });

  test('应该支持全景图数据存储', async ({ page }) => {
    // 测试Base64图片数据存储
    await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟全景图数据
      const panoramaData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      
      db.set('panorama-image', panoramaData, { 
        type: 'base64',
        version: '1.0',
        description: '全景图数据',
        format: 'jpeg'
      });
      
      // 验证存储
      const retrieved = db.get('panorama-image');
      return retrieved === panoramaData;
    });
    
    const result = await page.evaluate(() => {
      const db = new window.DocumentDB(document);
      return db.get('panorama-image') !== null;
    });
    
    expect(result).toBe(true);
  });

  test('应该支持查看器配置存储', async ({ page }) => {
    await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟查看器配置
      const viewerConfig = {
        type: "equirectangular",
        panorama: "data:image/jpeg;base64,xxx",
        autoLoad: true,
        showControls: true,
        autoRotate: true,
        hotSpots: [
          {
            id: "hotspot1",
            pitch: 0,
            yaw: 0,
            type: "info",
            text: "热点1"
          }
        ]
      };
      
      db.set('viewer-config', viewerConfig, {
        type: 'json',
        version: '1.0',
        description: '查看器配置'
      });
      
      // 验证存储
      const retrieved = db.get('viewer-config');
      return JSON.stringify(retrieved) === JSON.stringify(viewerConfig);
    });
    
    const result = await page.evaluate(() => {
      const db = new window.DocumentDB(document);
      const config = db.get('viewer-config');
      return config && config.type === 'equirectangular' && config.hotSpots.length === 1;
    });
    
    expect(result).toBe(true);
  });

  test('应该支持用户设置存储', async ({ page }) => {
    await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟用户设置
      const userSettings = {
        theme: 'dark',
        language: 'zh-CN',
        autoSave: true,
        quality: 'high',
        resolution: '4K',
        preferences: {
          showGrid: false,
          showHotspots: true,
          autoRotate: false
        }
      };
      
      db.set('user-settings', userSettings, {
        type: 'json',
        version: '1.0',
        description: '用户设置'
      });
      
      // 验证存储
      const retrieved = db.get('user-settings');
      return JSON.stringify(retrieved) === JSON.stringify(userSettings);
    });
    
    const result = await page.evaluate(() => {
      const db = new window.DocumentDB(document);
      const settings = db.get('user-settings');
      return settings && settings.theme === 'dark' && settings.preferences.showGrid === false;
    });
    
    expect(result).toBe(true);
  });

  test('应该支持数据导出和导入', async ({ page }) => {
    const exportResult = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 存储测试数据
      db.set('test-data-1', 'value1');
      db.set('test-data-2', { key: 'value' });
      db.set('test-data-3', 42);
      
      // 导出数据
      const exported = db.export();
      
      // 创建新的数据库实例
      const newDb = new DocumentDB(document, '#document-db-2');
      
      // 导入数据
      newDb.import(exported);
      
      // 验证导入的数据
      const value1 = newDb.get('test-data-1');
      const value2 = newDb.get('test-data-2');
      const value3 = newDb.get('test-data-3');
      
      return {
        value1,
        value2,
        value3,
        exported: exported.length > 0
      };
    });
    
    expect(exportResult.value1).toBe('value1');
    expect(exportResult.value2).toEqual({ key: 'value' });
    expect(exportResult.value3).toBe(42);
    expect(exportResult.exported).toBe(true);
  });

  test('应该支持大数据量存储', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 存储大量数据
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          data: `data-${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            tags: [`tag-${i % 10}`],
            priority: i % 3
          }
        }))
      };
      
      db.set('large-dataset', largeData, {
        type: 'json',
        version: '1.0',
        description: '大数据集测试'
      });
      
      // 验证数据完整性
      const retrieved = db.get('large-dataset');
      return {
        itemCount: retrieved.items.length,
        firstItem: retrieved.items[0],
        lastItem: retrieved.items[999],
        dataIntegrity: retrieved.items.every((item, index) => item.id === index)
      };
    });
    
    expect(result.itemCount).toBe(1000);
    expect(result.firstItem.id).toBe(0);
    expect(result.lastItem.id).toBe(999);
    expect(result.dataIntegrity).toBe(true);
  });

  test('应该支持元数据管理', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 存储带元数据的数据
      db.set('meta-test', 'test-value', {
        type: 'string',
        version: '2.0',
        description: '元数据测试',
        author: 'test-user',
        created: '2025-07-26',
        tags: 'test,metadata,example',
        priority: 'high',
        category: 'development'
      });
      
      // 获取元素并检查元数据
      const element = document.querySelector('[data-key="meta-test"]');
      return {
        type: element.getAttribute('data-type'),
        version: element.getAttribute('data-version'),
        description: element.getAttribute('data-description'),
        author: element.getAttribute('data-author'),
        created: element.getAttribute('data-created'),
        tags: element.getAttribute('data-tags'),
        priority: element.getAttribute('data-priority'),
        category: element.getAttribute('data-category')
      };
    });
    
    expect(result.type).toBe('string');
    expect(result.version).toBe('2.0');
    expect(result.description).toBe('元数据测试');
    expect(result.author).toBe('test-user');
    expect(result.created).toBe('2025-07-26');
    expect(result.tags).toBe('test,metadata,example');
    expect(result.priority).toBe('high');
    expect(result.category).toBe('development');
  });

  test('应该支持数据类型自动检测', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 测试自动类型检测
      db.set('auto-string', 'hello world');
      db.set('auto-number', 123.45);
      db.set('auto-boolean', true);
      db.set('auto-json', { key: 'value' });
      db.set('auto-base64', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      db.set('auto-null', null);
      
      // 检查检测的类型
      const stringElement = document.querySelector('[data-key="auto-string"]');
      const numberElement = document.querySelector('[data-key="auto-number"]');
      const booleanElement = document.querySelector('[data-key="auto-boolean"]');
      const jsonElement = document.querySelector('[data-key="auto-json"]');
      const base64Element = document.querySelector('[data-key="auto-base64"]');
      const nullElement = document.querySelector('[data-key="auto-null"]');
      
      return {
        stringType: stringElement.getAttribute('data-type'),
        numberType: numberElement.getAttribute('data-type'),
        booleanType: booleanElement.getAttribute('data-type'),
        jsonType: jsonElement.getAttribute('data-type'),
        base64Type: base64Element.getAttribute('data-type'),
        nullType: nullElement.getAttribute('data-type')
      };
    });
    
    expect(result.stringType).toBe('string');
    expect(result.numberType).toBe('number');
    expect(result.booleanType).toBe('boolean');
    expect(result.jsonType).toBe('json');
    expect(result.base64Type).toBe('base64');
    expect(result.nullType).toBe('null');
  });

  test('应该支持特殊字符处理', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 测试特殊字符
      const specialChars = [
        '引号: "双引号" \'单引号\'',
        '标签: <div>HTML标签</div>',
        '符号: &amp; &lt; &gt;',
        '换行: 第一行\n第二行\r第三行',
        '制表符: 列1\t列2\t列3',
        'Unicode: 中文测试 🎉 🌟 💯',
        '特殊符号: !@#$%^&*()_+-=[]{}|;:,.<>?'
      ];
      
      specialChars.forEach((text, index) => {
        db.set(`special-${index}`, text);
      });
      
      // 验证所有特殊字符都能正确存储和读取
      const allCorrect = specialChars.every((text, index) => {
        const retrieved = db.get(`special-${index}`);
        return retrieved === text;
      });
      
      return allCorrect;
    });
    
    expect(result).toBe(true);
  });

  test('应该支持数据库操作（has, delete, list, clear）', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 测试has操作
      db.set('test-key', 'test-value');
      const hasBefore = db.has('test-key');
      
      // 测试list操作
      db.set('key1', 'value1');
      db.set('key2', 'value2');
      db.set('key3', 'value3');
      const keys = db.list().sort();
      const expectedKeys = ['key1', 'key2', 'key3', 'test-key'].sort();
      const listCorrect = JSON.stringify(keys) === JSON.stringify(expectedKeys);
      
      // 测试delete操作
      db.delete('test-key');
      const hasAfter = db.has('test-key');
      const getAfter = db.get('test-key');
      
      // 测试clear操作
      db.clear();
      const keysAfterClear = db.list();
      const hasAfterClear = db.has('key1');
      
      return {
        hasBefore,
        listCorrect,
        hasAfter,
        getAfter,
        keysAfterClear: keysAfterClear.length,
        hasAfterClear
      };
    });
    
    expect(result.hasBefore).toBe(true);
    expect(result.listCorrect).toBe(true);
    expect(result.hasAfter).toBe(false);
    expect(result.getAfter).toBe(null);
    expect(result.keysAfterClear).toBe(0);
    expect(result.hasAfterClear).toBe(false);
  });

  test('应该支持克隆操作', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 存储测试数据
      const testData = {
        panorama: 'data:image/jpeg;base64,xxx',
        config: { type: 'equirectangular' },
        settings: { theme: 'dark' }
      };
      
      db.set('test-data', testData);
      
      // 克隆数据库
      const clonedDb = db.clone();
      
      // 验证克隆的数据
      const clonedData = clonedDb.get('test-data');
      const originalData = db.get('test-data');
      
      return {
        dataMatch: JSON.stringify(clonedData) === JSON.stringify(originalData),
        isDifferentInstance: clonedDb !== db,
        hasRoot: clonedDb.root !== null
      };
    });
    
    expect(result.dataMatch).toBe(true);
    expect(result.isDifferentInstance).toBe(true);
    expect(result.hasRoot).toBe(true);
  });

  test('应该支持错误处理和边界情况', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 测试不存在的键
      const nonExistent = db.get('non-existent-key');
      const nonExistentWithDefault = db.get('non-existent-key', 'default-value');
      
      // 测试空值处理
      db.set('empty-string', '');
      db.set('null-value', null);
      db.set('undefined-value', undefined);
      
      // 测试无效JSON
      db.set('invalid-json', '{"invalid": json}');
      const invalidJson = db.get('invalid-json');
      
      // 测试大数据
      const largeString = 'x'.repeat(10000);
      db.set('large-string', largeString);
      const retrievedLargeString = db.get('large-string');
      
      return {
        nonExistent,
        nonExistentWithDefault,
        emptyString: db.get('empty-string'),
        nullValue: db.get('null-value'),
        undefinedValue: db.get('undefined-value'),
        invalidJson,
        largeStringLength: retrievedLargeString.length
      };
    });
    
    expect(result.nonExistent).toBe(null);
    expect(result.nonExistentWithDefault).toBe('default-value');
    expect(result.emptyString).toBe('');
    expect(result.nullValue).toBe(null);
    expect(result.undefinedValue).toBe(null);
    expect(result.invalidJson).toBe('{"invalid": json}'); // 应该返回原始字符串
    expect(result.largeStringLength).toBe(10000);
  });
}); 