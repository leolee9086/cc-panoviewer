/**
 * @织: DocumentDB 自动化测试套件
 * 完全自动化的测试，支持浏览器环境和Node.js环境
 */

import { DocumentDB } from '../src/scripts/document-db.js';

/**
 * 测试结果类
 */
class TestResult {
    constructor(name, success, message = '', details = null) {
        this.name = name;
        this.success = success;
        this.message = message;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 测试套件类
 */
class TestSuite {
    constructor() {
        this.results = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    /**
     * 断言函数
     */
    assertEqual(a, b, message = '') {
        const success = JSON.stringify(a) === JSON.stringify(b);
        if (!success) {
            throw new Error(`${message}: 期望 ${JSON.stringify(b)}, 实际 ${JSON.stringify(a)}`);
        }
        return success;
    }

    /**
     * 断言真值
     */
    assertTrue(value, message = '') {
        if (!value) {
            throw new Error(`${message}: 期望为真，实际为假`);
        }
        return true;
    }

    /**
     * 断言假值
     */
    assertFalse(value, message = '') {
        if (value) {
            throw new Error(`${message}: 期望为假，实际为真`);
        }
        return true;
    }

    /**
     * 运行单个测试
     */
    runTest(name, testFunction) {
        this.totalTests++;
        try {
            testFunction();
            this.passedTests++;
            this.results.push(new TestResult(name, true, '通过'));
            console.log(`✅ ${name}`);
            return true;
        } catch (error) {
            this.failedTests++;
            this.results.push(new TestResult(name, false, error.message, error.stack));
            console.error(`❌ ${name}: ${error.message}`);
            return false;
        }
    }

    /**
     * 获取测试摘要
     */
    getSummary() {
        return {
            total: this.totalTests,
            passed: this.passedTests,
            failed: this.failedTests,
            success: this.failedTests === 0
        };
    }

    /**
     * 打印测试摘要
     */
    printSummary() {
        const summary = this.getSummary();
        console.log('\n📊 测试摘要:');
        console.log(`总测试数: ${summary.total}`);
        console.log(`通过: ${summary.passed}`);
        console.log(`失败: ${summary.failed}`);
        console.log(`成功率: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
        
        if (summary.success) {
            console.log('🎉 所有测试通过！');
        } else {
            console.log('💥 有测试失败！');
        }
    }
}

/**
 * 创建测试用的document对象
 */
function createTestDocument() {
    if (typeof document !== 'undefined') {
        return document.implementation.createHTMLDocument('Test');
    } else {
        // Node.js环境，使用jsdom
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        return dom.window.document;
    }
}

/**
 * 运行所有DocumentDB测试
 */
export async function runDocumentDBTests() {
    console.log('🚀 开始运行 DocumentDB 测试套件...\n');
    
    const suite = new TestSuite();
    
    // 测试1: 基本数据类型
    suite.runTest('基本数据类型测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        // 字符串
        db.set('string', 'hello world');
        suite.assertEqual(db.get('string'), 'hello world', '字符串类型');
        
        // 数字
        db.set('number', 123.45);
        suite.assertEqual(db.get('number'), 123.45, '数字类型');
        
        // 布尔值
        db.set('boolean', true);
        suite.assertEqual(db.get('boolean'), true, '布尔类型');
        
        // null
        db.set('null', null);
        suite.assertEqual(db.get('null'), null, 'null类型');
    });
    
    // 测试2: JSON对象
    suite.runTest('JSON对象测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        const jsonData = { 
            name: 'test', 
            value: 42, 
            nested: { a: 1, b: 2 },
            array: [1, 2, 3]
        };
        db.set('json', jsonData);
        suite.assertEqual(db.get('json'), jsonData, 'JSON对象');
    });
    
    // 测试3: Base64数据
    suite.runTest('Base64数据测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        db.set('base64', base64Data, { type: 'base64' });
        suite.assertEqual(db.get('base64'), base64Data, 'Base64数据');
    });
    
    // 测试4: 自动类型检测
    suite.runTest('自动类型检测测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        // 自动检测JSON
        db.set('auto-json', { x: 1, y: 2 });
        suite.assertEqual(db.get('auto-json'), { x: 1, y: 2 }, '自动检测JSON');
        
        // 自动检测Base64
        db.set('auto-base64', 'data:image/jpeg;base64,xxx');
        suite.assertEqual(db.get('auto-base64'), 'data:image/jpeg;base64,xxx', '自动检测Base64');
    });
    
    // 测试5: has/delete操作
    suite.runTest('has/delete操作测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        db.set('test-key', 'test-value');
        suite.assertTrue(db.has('test-key'), 'has存在');
        
        db.delete('test-key');
        suite.assertFalse(db.has('test-key'), 'delete后不存在');
        suite.assertEqual(db.get('test-key'), null, 'delete后返回null');
    });
    
    // 测试6: list操作
    suite.runTest('list操作测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        db.set('key1', 'value1');
        db.set('key2', 'value2');
        db.set('key3', 'value3');
        
        const keys = db.list().sort();
        const expectedKeys = ['key1', 'key2', 'key3'].sort();
        suite.assertEqual(keys, expectedKeys, 'list所有键');
    });
    
    // 测试7: clear操作
    suite.runTest('clear操作测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        db.set('key1', 'value1');
        db.set('key2', 'value2');
        
        db.clear();
        suite.assertEqual(db.list().length, 0, 'clear后为空');
        suite.assertEqual(db.get('key1'), null, 'clear后数据不存在');
    });
    
    // 测试8: export/import操作
    suite.runTest('export/import操作测试', () => {
        const doc1 = createTestDocument();
        const db1 = new DocumentDB(doc1);
        
        const testData = { message: 'hello', count: 42, nested: { a: 1 } };
        db1.set('test-data', testData);
        
        const exported = db1.export();
        
        const doc2 = createTestDocument();
        const db2 = new DocumentDB(doc2);
        db2.import(exported);
        
        suite.assertEqual(db2.get('test-data'), testData, 'import/export');
    });
    
    // 测试9: clone操作
    suite.runTest('clone操作测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        const testData = { message: 'hello', count: 42 };
        db.set('test-data', testData);
        
        const clonedDb = db.clone();
        suite.assertEqual(clonedDb.get('test-data'), testData, 'clone数据');
    });
    
    // 测试10: meta数据
    suite.runTest('meta数据测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        db.set('meta-test', 'value', { 
            version: '2.0', 
            description: '测试数据',
            tags: 'test,example',
            custom: 'custom-value'
        });
        
        const element = db.root.querySelector('[data-key="meta-test"]');
        suite.assertEqual(element.getAttribute('data-version'), '2.0', 'meta数据version');
        suite.assertEqual(element.getAttribute('data-description'), '测试数据', 'meta数据description');
        suite.assertEqual(element.getAttribute('data-tags'), 'test,example', 'meta数据tags');
        suite.assertEqual(element.getAttribute('data-custom'), 'custom-value', 'meta数据custom');
    });
    
    // 测试11: 大数据测试
    suite.runTest('大数据测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        // 测试大JSON对象
        const largeJson = {
            items: Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `item-${i}`,
                data: `data-${i}`.repeat(10)
            }))
        };
        
        db.set('large-json', largeJson);
        const retrieved = db.get('large-json');
        suite.assertEqual(retrieved.items.length, 1000, '大JSON对象长度');
        suite.assertEqual(retrieved.items[0].id, 0, '大JSON对象内容');
    });
    
    // 测试12: 特殊字符测试
    suite.runTest('特殊字符测试', () => {
        const doc = createTestDocument();
        const db = new DocumentDB(doc);
        
        const specialString = '特殊字符: "引号" \'单引号\' <标签> &符号& \n换行\r回车\t制表符';
        db.set('special', specialString);
        suite.assertEqual(db.get('special'), specialString, '特殊字符');
    });
    
    // 打印测试摘要
    suite.printSummary();
    
    return suite.getSummary().success;
}

/**
 * 在浏览器环境中自动运行测试
 */
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        console.log('🌐 浏览器环境检测到，开始运行DocumentDB测试...');
        runDocumentDBTests();
    });
}

/**
 * 在Node.js环境中运行测试
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runDocumentDBTests };
} 