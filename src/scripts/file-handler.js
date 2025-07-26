import { createViewer } from './viewer-manager.js';

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
    reader.onload = function (e) {
        const base64data = e.target.result;
        
        // 添加到预览容器
        document.getElementById('previewContainer').innerHTML = `
            <img id="previewImage" src="${base64data}" alt="Preview">
        ` + document.getElementById('previewContainer').innerHTML;
        
        // 创建查看器
        const viewer = createViewer('panorama', {
            "type": "equirectangular",
            "panorama": base64data,
            "autoLoad": true,
            "showControls": true,
            "autoRotate": true,
            "hotSpots": []
        });
        
        // 保存图片数据
        const scriptElement = document.querySelector('.images');
        scriptElement.textContent = 'window.imageData = "' + base64data + '";';
        
        document.getElementById('uploadPrompt').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

/**
 * 处理HTML文件
 * @param {File} file - HTML文件
 */
function handleHTMLFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const htmlContent = e.target.result;
        
        // 尝试解析HTML并查找特定的数据标记
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const imageData = doc.querySelector('.images') ? doc.querySelector('.images').textContent : null;
        
        if (imageData && imageData.startsWith('window.imageData = "')) {
            const base64data = imageData.split('"')[1];
            
            // 添加到预览容器
            document.getElementById('previewContainer').innerHTML = `
                <img id="previewImage" src="${base64data}" alt="Preview">
            ` + document.getElementById('previewContainer').innerHTML;
            
            // 创建查看器
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
            
            document.getElementById('uploadPrompt').style.display = 'none';
        } else {
            document.getElementById('uploadPrompt').textContent = "无法从HTML文件中找到全景图数据";
        }
    };
    reader.readAsText(file);
} 