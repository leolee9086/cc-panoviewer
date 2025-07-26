import { createViewer } from './viewer-manager.js';
import { storage } from './storage.js';

/**
 * 常用分辨率选项（仅用于导出压缩版页面）
 */
const COMMON_RESOLUTIONS = [
    { label: '原图', width: null, height: null },
    { label: '4K (3840x1920)', width: 3840, height: 1920 },
    { label: '2K (1920x960)', width: 1920, height: 960 },
    { label: '1080p (1440x720)', width: 1440, height: 720 },
    { label: '720p (960x480)', width: 960, height: 480 },
    { label: '480p (640x320)', width: 640, height: 320 },
];

/**
 * 压缩图片到指定分辨率（仅用于导出压缩版页面）
 * @param {string} src - 原始图片base64
 * @param {number|null} width - 目标宽度
 * @param {number|null} height - 目标高度
 * @returns {Promise<string>} - 压缩后的base64
 */
function compressImage(src, width, height) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            let targetWidth = width, targetHeight = height;
            if (!width || !height) {
                targetWidth = img.width;
                targetHeight = img.height;
            }
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = src;
    });
}

/**
 * 生成缩略图（仅在内存中，不写入DB）
 * @param {string} src - 原始图片base64
 * @param {number} width - 缩略图宽度，默认200
 * @param {number} height - 缩略图高度，默认100
 * @returns {Promise<string>} - 缩略图base64
 */
export function createThumbnail(src, width = 200, height = 100) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = src;
    });
}

/**
 * 生成唯一图片ID
 * @returns {string} 唯一ID
 */
function generateImageId() {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 处理图片文件上传
 * @param {File} file - 上传的文件
 */
export async function handleFileUpload(files) {
    const file = files[0]; // 只处理第一个文件
    if (!file) {
        return null;
    }

    if (file.type.startsWith('image/')) {
        return await handleImageFile(file);
    } else if (file.type === 'text/html') {
        return await handleHTMLFile(file);
    } else {
        console.warn("不支持的文件类型:", file.type);
        return null;
    }
}

/**
 * 处理图片文件
 * @param {File} file - 图片文件
 * @returns {Promise<{imageId: string, base64data: string}>} - 包含图片ID和base64数据的Promise
 */
async function handleImageFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64data = e.target.result;
            const imageId = generateImageId();

            // 保存文件元数据
            const metadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                uploadTime: Date.now()
            };

            // 使用事务保存文件数据到DB
            storage.withTransaction(() => {
                storage.setImage(imageId, base64data);
                storage.setImageMetadata(imageId, metadata);
                storage.setCurrentImage(imageId);
                // 添加到图片列表
                storage.addImageToList(imageId, metadata);
                const history = storage.getFile('uploadHistory', []);
                history.push(metadata);
                storage.setFile('uploadHistory', history);
            });
            resolve({ imageId, base64data });
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 处理HTML文件
 * @param {File} file - HTML文件
 * @returns {Promise<{imageId: string, base64data: string}|null>} - 包含图片ID和base64数据的Promise，如果未找到则为null
 */
async function handleHTMLFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const htmlContent = e.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");
            const imageDataElement = doc.querySelector('.images');
            let base64data = null;

            if (imageDataElement) {
                const imageDataText = imageDataElement.textContent;
                if (imageDataText.includes('window.imageData = ')) {
                    try {
                        const match = imageDataText.match(/window\.imageData = "([^"]+)"/);
                        if (match) {
                            base64data = match[1];
                        }
                    } catch (error) {
                        console.warn('无法解析HTML中的图片数据格式:', error);
                    }
                }
            }

            if (base64data) {
                const imageId = generateImageId();
                storage.setImage(imageId, base64data);
                storage.setImageMetadata(imageId, {
                    name: file.name,
                    size: file.size,
                    type: 'text/html',
                    uploadTime: Date.now()
                });
                storage.setCurrentImage(imageId);
                resolve({ imageId, base64data });
            } else {
                console.warn("无法从HTML文件中找到全景图数据");
                resolve(null);
            }
        };
        reader.readAsText(file);
    });
} 