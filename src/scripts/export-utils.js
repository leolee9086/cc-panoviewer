/**
 * @织: 导出工具函数
 * 基于数据库操作构建新文件，支持图片选择和压缩分辨率
 */
import { storage } from './storage.js';
import { DocumentDB } from './document-db.js';
import { getCleanDocumentClone } from './download-utils.js';

/**
 * 压缩图片到指定分辨率
 * @param {string} src - 图片数据（base64格式）
 * @param {number} width - 目标宽度
 * @param {number} height - 目标高度
 * @returns {Promise<string>} 压缩后的图片数据
 */
function compressImage(src, width, height) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = src;
    });
}

/**
 * 获取图片的实际尺寸
 * @param {string} imageData - 图片数据（base64格式）
 * @returns {Promise<{width: number, height: number}>} 图片尺寸
 */
function getImageDimensions(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        img.src = imageData;
    });
}

/**
 * 导出选中的图片到新页面
 * @param {Array} selectedImages - 选中的图片列表
 * @param {string} fileName - 文件名（不含扩展名）
 * @returns {Promise<void>}
 */
export async function exportSelectedImages(selectedImages, fileName = 'panoviewer') {
    // 获取选中的图片
    const imagesToExport = selectedImages.filter(img => img.selected);
    
    if (imagesToExport.length === 0) {
        throw new Error('没有选择任何图片');
    }
    
    // 获取干净的document克隆
    const cleanDocument = getCleanDocumentClone();
    if (!cleanDocument) {
        throw new Error('干净的document克隆未初始化，无法进行页面导出');
    }
    
    // 创建临时document
    const tempDocument = cleanDocument.cloneNode(true);
    
    // 在临时document中创建新的DocumentDB实例
    const tempDb = new DocumentDB(tempDocument, 'cc-panoviewer-db');
    
    // 清理临时数据库
    tempDb.clear();
    
    // 处理每张选中的图片
    const processedImages = [];
    
    for (const imageItem of imagesToExport) {
        let imageData = storage.getImage(imageItem.imageId);
        
        if (!imageData) {
            console.warn(`图片 ${imageItem.imageId} 数据不存在，跳过`);
            continue;
        }
        
        // 如果需要压缩
        if (imageItem.compression.enabled) {
            const { width, height } = imageItem.compression.resolution;
            imageData = await compressImage(imageData, width, height);
        }
        
        // 存储到临时数据库
        tempDb.set(`image.${imageItem.imageId}`, imageData, { type: 'base64' });
        
        // 复制元数据
        const metadata = storage.getImageMetadata(imageItem.imageId);
        if (metadata) {
            tempDb.set(`image.${imageItem.imageId}.metadata`, metadata);
        }
        
        processedImages.push(imageItem.imageId);
    }
    
    // 设置图片列表和当前图片
    tempDb.set('imageList', processedImages);
    tempDb.set('currentImage', processedImages[0] || null);
    
    // 复制一些基础配置
    const currentConfig = storage.getConfig('viewer.settings');
    if (currentConfig) {
        tempDb.set('config.viewer.settings', currentConfig);
    }
    
    // 生成HTML内容
    const htmlContent = tempDocument.documentElement.outerHTML;
    
    // 创建下载
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 记录导出历史
    storage.addHistory('export_selected_images', {
        fileName: `${fileName}.html`,
        fileSize: blob.size,
        imageCount: processedImages.length,
        compressedCount: imagesToExport.filter(img => img.compression.enabled).length,
        originalCount: imagesToExport.filter(img => !img.compression.enabled).length,
        timestamp: Date.now()
    });
    
    return {
        fileName: `${fileName}.html`,
        fileSize: blob.size,
        imageCount: processedImages.length
    };
}

/**
 * 获取图片列表用于导出选择
 * @returns {Promise<Array>} 图片列表
 */
export async function getImagesForExport() {
    const imageList = storage.getImageList();
    const imageDetails = storage.getImageListDetails();
    
    const images = [];
    
    for (const detail of imageDetails) {
        const imageData = storage.getImage(detail.id);
        if (!imageData) continue;
        
        // 获取图片实际尺寸
        const dimensions = await getImageDimensions(imageData);
        
        // 计算文件大小（base64估算）
        const originalSize = Math.round((imageData.length * 3) / 4);
        
        images.push({
            imageId: detail.id,
            name: detail.metadata.name || `图片_${detail.id}`,
            originalSize: originalSize,
            originalWidth: dimensions.width,
            originalHeight: dimensions.height,
            selected: true, // 默认全选
            compression: {
                enabled: false,
                resolution: { width: 1920, height: 960 }
            }
        });
    }
    
    return images;
}

/**
 * 生成默认文件名
 * @param {Array} selectedImages - 选中的图片列表
 * @returns {string} 默认文件名
 */
export function generateDefaultFileName(selectedImages) {
    const selectedCount = selectedImages.filter(img => img.selected).length;
    
    if (selectedCount === 0) {
        return 'panoviewer_empty';
    } else if (selectedCount === 1) {
        const img = selectedImages.find(img => img.selected);
        if (img.compression.enabled) {
            const { width, height } = img.compression.resolution;
            return `panoviewer_${width}x${height}`;
        } else {
            return 'panoviewer_original';
        }
    } else {
        return `panoviewer_${selectedCount}images`;
    }
}

/**
 * 估算压缩后的文件大小
 * @param {number} originalSize - 原始文件大小（字节）
 * @param {number} originalWidth - 原始宽度
 * @param {number} originalHeight - 原始高度
 * @param {number} targetWidth - 目标宽度
 * @param {number} targetHeight - 目标高度
 * @returns {number} 估算的压缩后文件大小
 */
export function estimateCompressedSize(originalSize, originalWidth, originalHeight, targetWidth, targetHeight) {
    const originalPixels = originalWidth * originalHeight;
    const compressedPixels = targetWidth * targetHeight;
    const compressionRatio = compressedPixels / originalPixels;
    return Math.round(originalSize * compressionRatio);
} 