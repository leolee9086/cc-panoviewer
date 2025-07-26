/**
 * @织: DocumentDB - XML风格的HTML页面数据库
 * data-属性用于存储meta信息，元素内容用于存储实际数据（如JSON/base64等）
 * 支持事务性操作，使用最轻量的DOM元素优化性能
 */
export class DocumentDB {
    /**
     * @param {Document} document - 目标document对象
     * @param {string} rootId - 数据库根元素ID
     */
    constructor(document, rootId = 'document-db') {
        this.document = document;
        this.rootId = rootId;
        this.root = this.getOrCreateRoot(rootId);
        this.transactionStack = [];
        this.isInTransaction = false;
    }

    /**
     * 开始事务
     * @returns {string} 事务ID
     */
    beginTransaction() {
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transaction = {
            id: transactionId,
            operations: [],
            snapshot: this.createSnapshot(),
            startTime: Date.now()
        };
        this.transactionStack.push(transaction);
        this.isInTransaction = true;
        return transactionId;
    }

    /**
     * 提交事务
     * @param {string} transactionId - 事务ID
     * @returns {boolean} 是否成功
     */
    commitTransaction(transactionId) {
        const transaction = this.findTransaction(transactionId);
        if (!transaction) return false;

        // 执行所有操作
        for (const operation of transaction.operations) {
            this.executeOperation(operation);
        }

        // 移除事务
        this.removeTransaction(transactionId);
        return true;
    }

    /**
     * 回滚事务
     * @param {string} transactionId - 事务ID
     * @returns {boolean} 是否成功
     */
    rollbackTransaction(transactionId) {
        const transaction = this.findTransaction(transactionId);
        if (!transaction) return false;

        // 恢复快照
        this.restoreSnapshot(transaction.snapshot);

        // 移除事务
        this.removeTransaction(transactionId);
        return true;
    }

    /**
     * 设置数据（支持事务）
     * @param {string} key
     * @param {any} value
     * @param {object} options
     */
    set(key, value, options = {}) {
        const { type = 'auto', version = '1.0', ...meta } = options;
        const detectedType = type === 'auto' ? this.detectType(value) : type;
        
        if (this.isInTransaction) {
            // 在事务中，记录操作但不立即执行
            const currentTransaction = this.transactionStack[this.transactionStack.length - 1];
            currentTransaction.operations.push({
                type: 'set',
                key,
                value,
                detectedType,
                version,
                meta
            });
        } else {
            // 直接执行
            this.executeSet(key, value, detectedType, version, meta);
        }
    }

    /**
     * 获取数据
     * @param {string} key
     * @param {any} defaultValue
     */
    get(key, defaultValue = null) {
        const element = this.root.querySelector(`[data-key="${key}"]`);
        if (!element) return defaultValue;
        const type = element.getAttribute('data-type');
        const content = element.textContent.trim();
        return this.parseElementContent(content, type);
    }

    /**
     * 删除数据（支持事务）
     * @param {string} key
     */
    delete(key) {
        if (this.isInTransaction) {
            // 在事务中，记录操作但不立即执行
            const currentTransaction = this.transactionStack[this.transactionStack.length - 1];
            currentTransaction.operations.push({
                type: 'delete',
                key
            });
        } else {
            // 直接执行
            this.executeDelete(key);
        }
    }

    /**
     * 检查数据是否存在
     * @param {string} key
     */
    has(key) {
        return this.root.querySelector(`[data-key="${key}"]`) !== null;
    }

    /**
     * 列出所有数据键
     */
    list() {
        const elements = this.root.querySelectorAll('[data-key]');
        return Array.from(elements).map(el => el.getAttribute('data-key'));
    }

    /**
     * 清空所有数据（支持事务）
     */
    clear() {
        if (this.isInTransaction) {
            // 在事务中，记录操作但不立即执行
            const currentTransaction = this.transactionStack[this.transactionStack.length - 1];
            currentTransaction.operations.push({
                type: 'clear'
            });
        } else {
            // 直接执行
            this.executeClear();
        }
    }

    /**
     * 导出数据库（返回根元素outerHTML）
     */
    export() {
        return this.root.outerHTML;
    }

    /**
     * 导出完整文档（返回包含数据库的完整HTML文档）
     * 只用DOM API，不用字符串拼接和formatHTML
     * @param {object} options - 导出选项
     * @param {string} options.title - 文档标题
     * @param {string} options.charset - 字符编码
     * @param {boolean} options.pretty - 是否格式化输出（忽略，始终结构化）
     */
    exportDocument(options = {}) {
        const {
            title = 'DocumentDB Export',
            charset = 'UTF-8',
        } = options;

        // 创建新文档
        const newDoc = document.implementation.createHTMLDocument(title);
        // 设置charset
        let metaCharset = newDoc.querySelector('meta[charset]');
        if (!metaCharset) {
            metaCharset = newDoc.createElement('meta');
            metaCharset.setAttribute('charset', charset);
            newDoc.head.insertBefore(metaCharset, newDoc.head.firstChild);
        } else {
            metaCharset.setAttribute('charset', charset);
        }
        // 设置title
        newDoc.title = title;
        // 添加样式
        const style = newDoc.createElement('style');
        style.textContent = `
#${this.rootId} { display: none !important; }
#${this.rootId} [data-key] { display: none !important; }
`;
        newDoc.head.appendChild(style);
        // 复制body内容
        newDoc.body.innerHTML = this.document.body.innerHTML;
        // 确保数据库元素存在且不可见
        let dbRoot = newDoc.getElementById(this.rootId);
        if (!dbRoot) {
            dbRoot = newDoc.createElement('span');
            dbRoot.id = this.rootId;
            dbRoot.style.display = 'none';
            newDoc.body.appendChild(dbRoot);
        }
        // 用当前数据库内容覆盖
        dbRoot.innerHTML = this.root.innerHTML;
        // 返回完整HTML（含DOCTYPE）
        return '<!DOCTYPE html>\n' + newDoc.documentElement.outerHTML;
    }


    /**
     * 导入数据库（用新HTML替换根元素内容）
     * @param {string} htmlData
     */
    import(htmlData) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const dbElement = doc.getElementById(this.rootId);
        if (dbElement) {
            this.clear();
            dbElement.querySelectorAll('[data-key]').forEach(element => {
                const key = element.getAttribute('data-key');
                const type = element.getAttribute('data-type');
                const content = element.textContent.trim();
                const value = this.parseElementContent(content, type);
                this.set(key, value, { type });
            });
        }
    }

    /**
     * 克隆数据库（返回新DocumentDB实例）
     */
    clone() {
        const newDocument = this.document.cloneNode(true);
        return new DocumentDB(newDocument, this.rootId);
    }

    /**
     * 获取事务状态
     */
    getTransactionStatus() {
        return {
            isInTransaction: this.isInTransaction,
            activeTransactions: this.transactionStack.length,
            transactionIds: this.transactionStack.map(tx => tx.id)
        };
    }

    // 私有方法 - 事务相关
    findTransaction(transactionId) {
        return this.transactionStack.find(tx => tx.id === transactionId);
    }

    removeTransaction(transactionId) {
        const index = this.transactionStack.findIndex(tx => tx.id === transactionId);
        if (index !== -1) {
            this.transactionStack.splice(index, 1);
            this.isInTransaction = this.transactionStack.length > 0;
        }
    }

    createSnapshot() {
        const snapshot = {};
        const elements = this.root.querySelectorAll('[data-key]');
        elements.forEach(element => {
            const key = element.getAttribute('data-key');
            const type = element.getAttribute('data-type');
            const content = element.textContent.trim();
            const value = this.parseElementContent(content, type);
            snapshot[key] = { value, type };
        });
        return snapshot;
    }

    restoreSnapshot(snapshot) {
        this.executeClear();
        Object.entries(snapshot).forEach(([key, { value, type }]) => {
            this.executeSet(key, value, type, '1.0', {});
        });
    }

    executeOperation(operation) {
        switch (operation.type) {
            case 'set':
                this.executeSet(operation.key, operation.value, operation.detectedType, operation.version, operation.meta);
                break;
            case 'delete':
                this.executeDelete(operation.key);
                break;
            case 'clear':
                this.executeClear();
                break;
        }
    }

    // 私有方法 - 优化的DOM操作
    getOrCreateRoot(rootId) {
        let root = this.document.getElementById(rootId);
        if (!root) {
            // 使用更轻量的span元素而不是div
            root = this.document.createElement('span');
            root.id = rootId;
            // 使用display: none完全避免回流和重绘
            root.style.display = 'none';
            // 使用DocumentFragment减少重绘
            const fragment = this.document.createDocumentFragment();
            fragment.appendChild(root);
            this.document.body.appendChild(fragment);
        }
        return root;
    }

    getOrCreateElement(key) {
        let element = this.root.querySelector(`[data-key="${key}"]`);
        if (!element) {
            // 使用更轻量的span元素而不是div
            element = this.document.createElement('span');
            element.setAttribute('data-key', key);
            // 设置display: none避免回流和重绘
            element.style.display = 'none';
            // 批量DOM操作，减少重绘
            this.root.appendChild(element);
        }
        return element;
    }

    executeSet(key, value, detectedType, version, meta) {
        const element = this.getOrCreateElement(key);
        
        // 批量设置属性，减少DOM操作
        const attributes = {
            'data-type': detectedType,
            'data-version': version,
            'data-created': new Date().toISOString()
        };
        
        // 添加meta属性
        Object.entries(meta).forEach(([k, v]) => {
            attributes[`data-${k}`] = v;
        });

        // 一次性设置所有属性
        Object.entries(attributes).forEach(([attr, value]) => {
            element.setAttribute(attr, value);
        });

        this.setElementContent(element, value, detectedType);
    }

    executeDelete(key) {
        const element = this.root.querySelector(`[data-key="${key}"]`);
        if (element) element.remove();
    }

    executeClear() {
        // 使用更高效的方式清空
        const elements = this.root.querySelectorAll('[data-key]');
        if (elements.length > 0) {
            // 批量移除，减少重绘
            const fragment = this.document.createDocumentFragment();
            elements.forEach(el => fragment.appendChild(el));
            // fragment被丢弃时元素自动从DOM中移除
        }
    }

    detectType(value) {
        if (typeof value === 'string') {
            if (value.startsWith('data:image/')) return 'base64';
            if (value.startsWith('{') || value.startsWith('[')) return 'json';
            return 'string';
        }
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (value === null) return 'null';
        if (value === undefined) return 'null';
        return 'json';
    }

    setElementContent(element, value, type) {
        let content = '';
        switch (type) {
            case 'json':
                content = JSON.stringify(value);
                break;
            case 'base64':
            case 'string':
                content = value;
                break;
            case 'number':
            case 'boolean':
                content = String(value);
                break;
            case 'null':
                content = '';
                break;
            default:
                content = JSON.stringify(value);
        }
        
        // 避免不必要的textContent设置
        if (element.textContent !== content) {
            element.textContent = content;
        }
    }

    parseElementContent(content, type) {
        switch (type) {
            case 'json':
                try {
                    return JSON.parse(content);
                } catch {
                    return content;
                }
            case 'number':
                return Number(content);
            case 'boolean':
                return content === 'true';
            case 'null':
                return null;
            case 'base64':
            case 'string':
            default:
                return content;
        }
    }
} 