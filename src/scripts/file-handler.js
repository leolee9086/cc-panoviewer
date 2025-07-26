import { createViewer } from './viewer-manager.js';
import { storage } from './storage.js';

/**
 * 常用分辨率选项
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
 * 压缩图片到指定分辨率
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
        
        // 保存文件元数据
        const metadata = {
            name: file.name,
            size: file.size,
            type: file.type,
            uploadTime: Date.now()
        };
        
        // 使用事务保存文件数据
        storage.withTransaction(async () => {
            // 保存文件元数据
            const history = storage.getFile('uploadHistory', []);
            history.push(metadata);
            storage.setFile('uploadHistory', history);
            storage.setFile('current', metadata);
            
            // 保存原始图片数据
            storage.setImage('original', base64data);
        });
        
        // 生成多分辨率压缩图
        const compressedList = await Promise.all(
            COMMON_RESOLUTIONS.map(async (item) => ({
                label: item.label,
                base64: item.width ? await compressImage(base64data, item.width, item.height) : base64data
            }))
        );
        
        // 保存压缩版本到缓存
        storage.setFile('compressedCache', compressedList);
        
        // 预览区提供分辨率选择
        let selectHtml = '<select id="resolutionSelect">';
        compressedList.forEach((item, idx) => {
            selectHtml += `<option value="${idx}">${item.label}</option>`;
        });
        selectHtml += '</select>';
        document.getElementById('previewContainer').innerHTML = `
            <div style="margin-bottom:8px;">选择分辨率：${selectHtml}</div>
            <img id="previewImage" src="${compressedList[0].base64}" alt="Preview">
        ` + document.getElementById('previewContainer').innerHTML;
        
        // 选择分辨率时切换预览
        document.getElementById('resolutionSelect').addEventListener('change', function () {
            const idx = this.value;
            document.getElementById('previewImage').src = compressedList[idx].base64;
            // 保存当前选择的图片数据
            storage.setImage('current', compressedList[idx].base64);
        });
        
        // 创建查看器
        const viewer = createViewer('panorama', {
            "type": "equirectangular",
            "panorama": compressedList[0].base64,
            "autoLoad": true,
            "showControls": true,
            "autoRotate": true,
            "hotSpots": []
        });
        
        // 保存当前图片数据
        storage.setImage('current', compressedList[0].base64);
        
        // 记录操作历史
        storage.addHistory('file_upload', {
            fileName: file.name,
            fileSize: file.size,
            resolution: 'original'
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
            // 保存到统一存储
            storage.setImage('original', base64data);
            storage.setImage('current', base64data);
            
            // 生成多分辨率压缩图
            const compressedList = await Promise.all(
                COMMON_RESOLUTIONS.map(async (item) => ({
                    label: item.label,
                    base64: item.width ? await compressImage(base64data, item.width, item.height) : base64data
                }))
            );
            
            // 保存压缩版本到缓存
            storage.setFile('compressedCache', compressedList);
            
            // 预览区提供分辨率选择
            let selectHtml = '<select id="resolutionSelect">';
            compressedList.forEach((item, idx) => {
                selectHtml += `<option value="${idx}">${item.label}</option>`;
            });
            selectHtml += '</select>';
            
            // 从统一存储获取当前图片数据
            const currentImageData = storage.getImage('current');
            document.getElementById('previewContainer').innerHTML = `
                <div style="margin-bottom:8px;">选择分辨率：${selectHtml}</div>
                <img id="previewImage" src="${currentImageData}" alt="Preview">
            ` + document.getElementById('previewContainer').innerHTML;
            
            // 选择分辨率时切换预览
            document.getElementById('resolutionSelect').addEventListener('change', function () {
                const idx = this.value;
                const selectedImageData = compressedList[idx].base64;
                document.getElementById('previewImage').src = selectedImageData;
                // 保存当前选择的图片数据
                storage.setImage('current', selectedImageData);
            });
            
            // 创建查看器
            const viewer = createViewer('panorama', {
                "type": "equirectangular",
                "panorama": currentImageData,
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
                resolution: 'original'
            });
            
            document.getElementById('uploadPrompt').style.display = 'none';
        } else {
            document.getElementById('uploadPrompt').textContent = "无法从HTML文件中找到全景图数据";
        }
    };
    reader.readAsText(file);
} 