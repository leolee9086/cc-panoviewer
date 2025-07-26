/**
 * @织: DocumentDB - XML风格的HTML页面数据库
 * data-属性用于存储meta信息，元素内容用于存储实际数据（如JSON/base64等）
 */
export class DocumentDB {
    /**
     * @param {Document} document - 目标document对象
     * @param {string} rootSelector - 数据库根元素选择器
     */
    constructor(document, rootSelector = '#document-db') {
        this.document = document;
        this.root = this.getOrCreateRoot(rootSelector);
    }

    /**
     * 设置数据
     * @param {string} key
     * @param {any} value
     * @param {object} options
     */
    set(key, value, options = {}) {
        const { type = 'auto', version = '1.0', ...meta } = options;
        const detectedType = type === 'auto' ? this.detectType(value) : type;
        const element = this.getOrCreateElement(key);
        element.setAttribute('data-type', detectedType);
        element.setAttribute('data-version', version);
        element.setAttribute('data-created', new Date().toISOString());
        Object.entries(meta).forEach(([k, v]) => {
            element.setAttribute(`data-${k}`, v);
        });
        this.setElementContent(element, value, detectedType);
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
     * 删除数据
     * @param {string} key
     */
    delete(key) {
        const element = this.root.querySelector(`[data-key="${key}"]`);
        if (element) element.remove();
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
     * 清空所有数据
     */
    clear() {
        const elements = this.root.querySelectorAll('[data-key]');
        elements.forEach(el => el.remove());
    }

    /**
     * 导出数据库（返回根元素outerHTML）
     */
    export() {
        return this.root.outerHTML;
    }

    /**
     * 导入数据库（用新HTML替换根元素内容）
     * @param {string} htmlData
     */
    import(htmlData) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const dbElement = doc.querySelector('#document-db');
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
        return new DocumentDB(newDocument);
    }

    // 私有方法
    getOrCreateRoot(selector) {
        let root = this.document.querySelector(selector);
        if (!root) {
            root = this.document.createElement('div');
            root.id = 'document-db';
            root.style.display = 'none';
            this.document.body.appendChild(root);
        }
        return root;
    }

    getOrCreateElement(key) {
        let element = this.root.querySelector(`[data-key="${key}"]`);
        if (!element) {
            element = this.document.createElement('div');
            element.setAttribute('data-key', key);
            this.root.appendChild(element);
        }
        return element;
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
        switch (type) {
            case 'json':
                element.textContent = JSON.stringify(value);
                break;
            case 'base64':
            case 'string':
                element.textContent = value;
                break;
            case 'number':
            case 'boolean':
                element.textContent = String(value);
                break;
            case 'null':
                element.textContent = '';
                break;
            default:
                element.textContent = JSON.stringify(value);
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