const { test, expect } = require('@playwright/test');

test.describe('DocumentDB 导出功能测试', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/');
    });

    test('应该正确导出数据库元素', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db = new DocumentDB(document);
            
            // 设置一些测试数据
            db.set('test1', 'value1');
            db.set('test2', { data: 'value2' });
            db.set('test3', 123);
            
            // 导出数据库元素
            const exported = db.export();
            
            return {
                exported,
                hasTest1: exported.includes('data-key="test1"'),
                hasTest2: exported.includes('data-key="test2"'),
                hasTest3: exported.includes('data-key="test3"'),
                hasSpan: exported.includes('<span'),
                hasDisplayNone: exported.includes('display: none')
            };
        });

        expect(result.hasTest1).toBe(true);
        expect(result.hasTest2).toBe(true);
        expect(result.hasTest3).toBe(true);
        expect(result.hasSpan).toBe(true);
        expect(result.hasDisplayNone).toBe(true);
    });

    test('应该正确导出完整文档', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db = new DocumentDB(document);
            
            // 设置一些测试数据
            db.set('doc1', 'docValue1');
            db.set('doc2', { complex: 'data' });
            
            // 导出完整文档
            const exportedDoc = db.exportDocument({
                title: 'Test Document',
                charset: 'UTF-8',
                pretty: false
            });
            
            return {
                exportedDoc,
                hasDoctype: exportedDoc.includes('<!DOCTYPE html>'),
                hasHtml: exportedDoc.includes('<html'),
                hasHead: exportedDoc.includes('<head>'),
                hasBody: exportedDoc.includes('<body>'),
                hasTitle: exportedDoc.includes('Test Document'),
                hasCharset: exportedDoc.includes('UTF-8'),
                hasDatabaseElement: exportedDoc.includes('#document-db'),
                hasStyle: exportedDoc.includes('display: none'),
                hasData: exportedDoc.includes('data-key="doc1"'),
                hasComplexData: exportedDoc.includes('data-key="doc2"')
            };
        });

        expect(result.hasDoctype).toBe(true);
        expect(result.hasHtml).toBe(true);
        expect(result.hasHead).toBe(true);
        expect(result.hasBody).toBe(true);
        expect(result.hasTitle).toBe(true);
        expect(result.hasCharset).toBe(true);
        expect(result.hasDatabaseElement).toBe(true);
        expect(result.hasStyle).toBe(true);
        expect(result.hasData).toBe(true);
        expect(result.hasComplexData).toBe(true);
    });

    test('应该支持格式化输出', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db = new DocumentDB(document);
            
            // 设置测试数据
            db.set('format1', 'formatValue1');
            
            // 导出格式化文档
            const formattedDoc = db.exportDocument({
                title: 'Formatted Document',
                pretty: true
            });
            
            // 导出非格式化文档
            const unformattedDoc = db.exportDocument({
                title: 'Unformatted Document',
                pretty: false
            });
            
            return {
                formattedDoc,
                unformattedDoc,
                formattedHasNewlines: formattedDoc.includes('\n'),
                unformattedHasNewlines: unformattedDoc.includes('\n'),
                formattedLength: formattedDoc.length,
                unformattedLength: unformattedDoc.length
            };
        });

        // 格式化版本应该包含换行符
        expect(result.formattedHasNewlines).toBe(true);
        // 格式化版本通常会更长（因为换行和缩进）
        expect(result.formattedLength).toBeGreaterThan(result.unformattedLength);
    });

    test('应该正确处理文档中已存在的数据库元素', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db = new DocumentDB(document);
            
            // 设置测试数据
            db.set('existing1', 'existingValue1');
            
            // 导出文档
            const exportedDoc = db.exportDocument();
            
            // 检查是否包含数据库元素
            const hasDbElement = exportedDoc.includes('id="document-db"');
            const hasData = exportedDoc.includes('data-key="existing1"');
            
            return {
                exportedDoc,
                hasDbElement,
                hasData
            };
        });

        expect(result.hasDbElement).toBe(true);
        expect(result.hasData).toBe(true);
    });

    test('应该正确导入数据库数据', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db1 = new DocumentDB(document);
            
            // 在第一个数据库中设置数据
            db1.set('import1', 'importValue1');
            db1.set('import2', { nested: 'data' });
            
            // 导出数据库
            const exported = db1.export();
            
            // 创建新的数据库实例
            const db2 = new DocumentDB(document);
            
            // 导入数据
            db2.import(exported);
            
            // 验证导入的数据
            const value1 = db2.get('import1');
            const value2 = db2.get('import2');
            const hasImport1 = db2.has('import1');
            const hasImport2 = db2.has('import2');
            
            return {
                value1,
                value2,
                hasImport1,
                hasImport2
            };
        });

        expect(result.value1).toBe('importValue1');
        expect(result.value2).toEqual({ nested: 'data' });
        expect(result.hasImport1).toBe(true);
        expect(result.hasImport2).toBe(true);
    });

    test('应该正确处理自定义导出选项', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db = new DocumentDB(document);
            
            // 设置测试数据
            db.set('custom1', 'customValue1');
            
            // 使用自定义选项导出
            const customDoc = db.exportDocument({
                title: 'Custom Title',
                charset: 'GBK',
                pretty: true
            });
            
            return {
                customDoc,
                hasCustomTitle: customDoc.includes('Custom Title'),
                hasGBK: customDoc.includes('GBK'),
                hasData: customDoc.includes('data-key="custom1"')
            };
        });

        expect(result.hasCustomTitle).toBe(true);
        expect(result.hasGBK).toBe(true);
        expect(result.hasData).toBe(true);
    });

    test('应该正确处理空数据库的导出', async ({ page }) => {
        const result = await page.evaluate(() => {
            const db = new DocumentDB(document);
            
            // 导出空数据库
            const emptyExport = db.export();
            const emptyDocExport = db.exportDocument();
            
            return {
                emptyExport,
                emptyDocExport,
                hasEmptyDb: emptyExport.includes('id="document-db"'),
                hasEmptyDbInDoc: emptyDocExport.includes('id="document-db"'),
                isEmpty: db.list().length === 0
            };
        });

        expect(result.hasEmptyDb).toBe(true);
        expect(result.hasEmptyDbInDoc).toBe(true);
        expect(result.isEmpty).toBe(true);
    });

    test('应该正确克隆数据库', async ({ page }) => {
        const result = await page.evaluate(() => {
            const originalDb = new DocumentDB(document);
            
            // 设置原始数据
            originalDb.set('clone1', 'cloneValue1');
            originalDb.set('clone2', { clone: 'data' });
            
            // 克隆数据库
            const clonedDb = originalDb.clone();
            
            // 验证克隆的数据
            const clonedValue1 = clonedDb.get('clone1');
            const clonedValue2 = clonedDb.get('clone2');
            const hasClone1 = clonedDb.has('clone1');
            const hasClone2 = clonedDb.has('clone2');
            
            return {
                clonedValue1,
                clonedValue2,
                hasClone1,
                hasClone2
            };
        });

        expect(result.clonedValue1).toBe('cloneValue1');
        expect(result.clonedValue2).toEqual({ clone: 'data' });
        expect(result.hasClone1).toBe(true);
        expect(result.hasClone2).toBe(true);
    });
}); 