/**
 * @织: DocumentDB 测试套件
 * 测试DocumentDB模块的核心功能
 */

import { DocumentDB } from '../../src/scripts/document-db.js';

/**
 * 测试结果类
 */
class TestResult {
  constructor(name, success, message = '', data = null) {
    this.name = name;
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date();
  }
}

/**
 * 测试套件类
 */
class TestSuite {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 添加测试结果
   */
  addResult(result) {
    this.results.push(result);
    return result;
  }

  /**
   * 获取测试摘要
   */
  getSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const duration = this.endTime && this.startTime ? this.endTime - this.startTime : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      duration
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.startTime = Date.now();
    
    console.log('开始运行 DocumentDB 测试套件...');
    // 确保日志能被测试页面捕获
    if (typeof window !== 'undefined' && window.testLog) {
      window.testLog('开始运行 DocumentDB 测试套件...');
    }
    
    // 创建测试document
    const testDoc = document.implementation.createHTMLDocument('Test');
    const db = new DocumentDB(testDoc);
    
    // 测试1: 基本设置和获取
    await this.testBasicSetGet(db);
    
    // 测试2: 数据类型处理
    await this.testDataTypeHandling(db);
    
    // 测试3: 存在性检查
    await this.testHasMethod(db);
    
    // 测试4: 删除操作
    await this.testDeleteMethod(db);
    
    // 测试5: 列表操作
    await this.testListMethod(db);
    
    // 测试6: 清空操作
    await this.testClearMethod(db);
    
    // 测试7: 导出导入
    await this.testExportImport(db);
    
    // 测试8: 克隆操作
    await this.testCloneMethod(db);
    
    // 测试9: 元数据处理
    await this.testMetaDataHandling(db);
    
    // 测试10: 特殊字符处理
    await this.testSpecialCharacters(db);
    
    // 测试11: Base64数据处理
    await this.testBase64Data(db);
    
    // 测试12: 大数据处理
    await this.testLargeData(db);
    
    this.endTime = Date.now();
    
    const summary = this.getSummary();
    console.log('测试摘要:', summary);
    // 确保摘要能被测试页面捕获
    if (typeof window !== 'undefined' && window.testLog) {
      window.testLog('测试摘要: ' + JSON.stringify(summary));
    }
    
    return {
      success: summary.failedTests === 0,
      summary,
      results: this.results,
      database: testDoc,
      databaseHtml: db.export()
    };
  }

  /**
   * 测试基本设置和获取功能
   */
  async testBasicSetGet(db) {
    try {
      db.set('test-string', 'hello world');
      db.set('test-number', 42);
      db.set('test-json', { name: 'test', value: 123 });
      
      const stringResult = db.get('test-string');
      const numberResult = db.get('test-number');
      const jsonResult = db.get('test-json');
      
      const success = stringResult === 'hello world' && 
                     numberResult === 42 && 
                     JSON.stringify(jsonResult) === JSON.stringify({ name: 'test', value: 123 });
      
      this.addResult(new TestResult(
        '基本设置和获取',
        success,
        success ? '基本设置和获取功能正常' : '基本设置和获取功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '基本设置和获取',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试数据类型处理
   */
  async testDataTypeHandling(db) {
    try {
      const testData = {
        string: 'test string',
        number: 123.45,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { a: 1, b: 2 }
      };
      
      Object.entries(testData).forEach(([key, value]) => {
        db.set(`data-${key}`, value);
      });
      
      let success = true;
      Object.entries(testData).forEach(([key, expected]) => {
        const actual = db.get(`data-${key}`);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          success = false;
        }
      });
      
      this.addResult(new TestResult(
        '数据类型处理',
        success,
        success ? '各种数据类型处理正常' : '数据类型处理异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '数据类型处理',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试存在性检查
   */
  async testHasMethod(db) {
    try {
      db.set('exists-test', 'value');
      
      const hasExisting = db.has('exists-test');
      const hasNonExisting = db.has('non-existing');
      
      const success = hasExisting && !hasNonExisting;
      
      this.addResult(new TestResult(
        '存在性检查',
        success,
        success ? '存在性检查功能正常' : '存在性检查功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '存在性检查',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试删除操作
   */
  async testDeleteMethod(db) {
    try {
      db.set('delete-test', 'value');
      
      const existsBefore = db.has('delete-test');
      db.delete('delete-test');
      const existsAfter = db.has('delete-test');
      
      const success = existsBefore && !existsAfter;
      
      this.addResult(new TestResult(
        '删除操作',
        success,
        success ? '删除操作功能正常' : '删除操作功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '删除操作',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试列表操作
   */
  async testListMethod(db) {
    try {
      db.set('list-test-1', 'value1');
      db.set('list-test-2', 'value2');
      db.set('list-test-3', 'value3');
      
      const list = db.list();
      const success = list.includes('list-test-1') && 
                     list.includes('list-test-2') && 
                     list.includes('list-test-3') &&
                     list.length >= 3;
      
      this.addResult(new TestResult(
        '列表操作',
        success,
        success ? '列表操作功能正常' : '列表操作功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '列表操作',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试清空操作
   */
  async testClearMethod(db) {
    try {
      db.set('clear-test-1', 'value1');
      db.set('clear-test-2', 'value2');
      
      const listBefore = db.list();
      db.clear();
      const listAfter = db.list();
      
      const success = listBefore.length > 0 && listAfter.length === 0;
      
      this.addResult(new TestResult(
        '清空操作',
        success,
        success ? '清空操作功能正常' : '清空操作功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '清空操作',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试导出导入
   */
  async testExportImport(db) {
    try {
      db.set('export-test', { message: 'hello', count: 42 });
      
      const exported = db.export();
      
      // 创建新的数据库并导入
      const newDoc = document.implementation.createHTMLDocument('Test2');
      const newDb = new DocumentDB(newDoc);
      newDb.import(exported);
      
      const retrieved = newDb.get('export-test');
      const success = JSON.stringify(retrieved) === JSON.stringify({ message: 'hello', count: 42 });
      
      this.addResult(new TestResult(
        '导出导入',
        success,
        success ? '导出导入功能正常' : '导出导入功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '导出导入',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试克隆操作
   */
  async testCloneMethod(db) {
    try {
      db.set('clone-test', 'original value');
      
      const cloned = db.clone();
      const originalValue = db.get('clone-test');
      const clonedValue = cloned.get('clone-test');
      
      const success = originalValue === clonedValue;
      
      this.addResult(new TestResult(
        '克隆操作',
        success,
        success ? '克隆操作功能正常' : '克隆操作功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '克隆操作',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试元数据处理
   */
  async testMetaDataHandling(db) {
    try {
      db.set('meta-test', 'value', { type: 'string', created: Date.now() });
      
      const element = db._getElement('meta-test');
      const type = element.getAttribute('data-type');
      const created = element.getAttribute('data-created');
      
      const success = type === 'string' && created && !isNaN(parseInt(created));
      
      this.addResult(new TestResult(
        '元数据处理',
        success,
        success ? '元数据处理功能正常' : '元数据处理功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '元数据处理',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试特殊字符处理
   */
  async testSpecialCharacters(db) {
    try {
      const specialString = '特殊字符: "引号" \'单引号\' <标签> &符号& \n换行\r回车\t制表符';
      db.set('special-chars', specialString);
      
      const retrieved = db.get('special-chars');
      const success = retrieved === specialString;
      
      this.addResult(new TestResult(
        '特殊字符处理',
        success,
        success ? '特殊字符处理功能正常' : '特殊字符处理功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '特殊字符处理',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试Base64数据处理
   */
  async testBase64Data(db) {
    try {
      const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      db.set('base64-test', base64Data, { type: 'base64' });
      
      const retrieved = db.get('base64-test');
      const success = retrieved === base64Data;
      
      this.addResult(new TestResult(
        'Base64数据处理',
        success,
        success ? 'Base64数据处理功能正常' : 'Base64数据处理功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        'Base64数据处理',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }

  /**
   * 测试大数据处理
   */
  async testLargeData(db) {
    try {
      const largeData = {
        array: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
        object: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key-${i}`, `value-${i}`]))
      };
      
      db.set('large-data', largeData);
      const retrieved = db.get('large-data');
      
      const success = JSON.stringify(retrieved) === JSON.stringify(largeData);
      
      this.addResult(new TestResult(
        '大数据处理',
        success,
        success ? '大数据处理功能正常' : '大数据处理功能异常'
      ));
    } catch (error) {
      this.addResult(new TestResult(
        '大数据处理',
        false,
        `测试异常: ${error.message}`
      ));
    }
  }
}

/**
 * 运行DocumentDB测试套件
 */
export async function runDocumentDBTests() {
  const testSuite = new TestSuite();
  return await testSuite.runAllTests();
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 浏览器环境检测到，开始运行DocumentDB测试...');
    runDocumentDBTests();
  });
} 