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
function createThumbnail(src, width = 200, height = 100) {
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
export function handleFileUpload(file) {
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
    } else if (file && file.type === 'text/html') {
        handleHTMLFile(file);
    } else {
        document.getElementById('uploadPrompt').textContent = "请使用图片或HTML文件";
    }
}

/**
 * 处理图片文件
 * @param {File} file - 图片文件
 */
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64data = e.target.result;
        
        // 生成唯一图片ID
        const imageId = generateImageId();
        
        // 保存文件元数据
        const metadata = {
            name: file.name,
            size: file.size,
            type: file.type,
            uploadTime: Date.now()
        };
        
        // 使用事务保存文件数据到DB
        storage.withTransaction(async () => {
            // 保存原始图片数据
            storage.setImage(imageId, base64data);
            storage.setImageMetadata(imageId, metadata);
            
            // 设置当前图片编号
            storage.setCurrentImage(imageId);
            
            // 保存文件元数据到历史记录
            const history = storage.getFile('uploadHistory', []);
            history.push(metadata);
            storage.setFile('uploadHistory', history);
        });
        
        // 在内存中生成缩略图（不写入DB）
        const thumbnailData = await createThumbnail(base64data);
        
        // 更新预览区显示缩略图
        document.getElementById('previewContainer').innerHTML = `
            <img id="previewImage" src="${thumbnailData}" alt="Preview" style="max-width: 200px; max-height: 100px; cursor: pointer;">
            <button id="uploader">添加图片</button>
        `;
        
        // 创建查看器（使用原图）
        const viewer = createViewer('panorama', {
            "type": "equirectangular",
            "panorama": base64data,
            "autoLoad": true,
            "showControls": true,
            "autoRotate": true,
            "hotSpots": []
        });
        
        // 记录操作历史
        storage.addHistory('file_upload', {
            fileName: file.name,
            fileSize: file.size,
            imageId: imageId
        });
        
        document.getElementById('uploadPrompt').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

/**
 * 处理HTML文件
 * @param {File} file - HTML文件
 */
async function handleHTMLFile(file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
        const htmlContent = e.target.result;
        // 尝试解析HTML并查找特定的数据标记
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const imageData = doc.querySelector('.images') ? doc.querySelector('.images').textContent : null;
        
        let base64data = null;
        if (imageData) {
            // 尝试解析base64数据
            if (imageData.includes('window.imageData = ')) {
                try {
                    // 提取base64字符串
                    const match = imageData.match(/window\.imageData = "([^"]+)"/);
                    if (match) {
                        base64data = match[1];
                    }
                } catch (e) {
                    // 如果解析失败，尝试其他格式
                    console.warn('无法解析图片数据格式');
                }
            }
        }
        
        if (base64data) {
            // 生成唯一图片ID
            const imageId = generateImageId();
            
            // 保存到DB
            storage.setImage(imageId, base64data);
            storage.setImageMetadata(imageId, {
                name: file.name,
                size: file.size,
                type: 'text/html',
                uploadTime: Date.now()
            });
            storage.setCurrentImage(imageId);
            
            // 在内存中生成缩略图（不写入DB）
            const thumbnailData = await createThumbnail(base64data);
            
            // 更新预览区显示缩略图
            document.getElementById('previewContainer').innerHTML = `
                <img id="previewImage" src="${thumbnailData}" alt="Preview" style="max-width: 200px; max-height: 100px; cursor: pointer;">
                <button id="uploader">添加图片</button>
            `;
            
            // 创建查看器（使用原图）
            const viewer = createViewer('panorama', {
                "type": "equirectangular",
                "panorama": base64data,
                "sceneFadeDuration": 1000,
                "autoLoad": true,
                "showControls": true,
                "autoRotate": true,
                "hotSpots": [{
                    "pitch": 14.1,
                    "yaw": 1.5,
                    "type": "info",
                    "text": "Baltimore Museum of Art",
                    "URL": "https://artbma.org/"
                }]
            });
            
            // 记录操作历史
            storage.addHistory('html_file_upload', {
                fileName: file.name,
                fileSize: file.size,
                imageId: imageId
            });
            
            document.getElementById('uploadPrompt').style.display = 'none';
        } else {
            document.getElementById('uploadPrompt').textContent = "无法从HTML文件中找到全景图数据";
        }
    };
    reader.readAsText(file);
} 