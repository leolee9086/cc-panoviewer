// @织: 本文件为全景图视频导出功能的基础实现，基于SACAssetsManager项目精简移植
// 依赖：Three.js、WebCodecs API、Muxer
import * as THREE from 'three';
import { Muxer, ArrayBufferTarget, MP4Muxer, MP4ArrayBufferTarget } from './useVideoMuxer.js';

/**
 * @织: 确保分辨率为偶数（H264编码器要求）
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {Object} 调整后的宽度和高度
 */
function ensureEvenDimensions(width, height) {
    const adjustedWidth = width % 2 === 0 ? width : width - 1;
    const adjustedHeight = height % 2 === 0 ? height : height - 1;
    
    if (adjustedWidth !== width || adjustedHeight !== height) {
        console.warn(`分辨率已调整为偶数: ${width}x${height} -> ${adjustedWidth}x${adjustedHeight}`);
    }
    
    return { width: adjustedWidth, height: adjustedHeight };
}

// 常量配置对象
const Constants = {
    DEFAULT_VALUES: {
        WIDTH: 1920,
        HEIGHT: 1080,
        FPS: 30,
        DURATION: 10,
        FORMAT: 'mp4'
    },
    RENDERER_CONFIG: {
        ANTIALIAS: true,
        PRESERVE_DRAWING_BUFFER: true,
        POWER_PREFERENCE: "high-performance",
        ALPHA: true,
        PRECISION: "highp",
        STENCIL: false,
        DEPTH: true,
        LOGARITHMIC_DEPTH_BUFFER: true,
        SAMPLES: 8
    },
    CAMERA_CONFIG: {
        PORTRAIT_FOV: 75,  // 竖向视频使用更小的FOV以获得更好的效果
        LANDSCAPE_FOV: 75
    },
    SPHERE_CONFIG: {
        RADIUS: 500,
        WIDTH_SEGMENTS: 120,
        HEIGHT_SEGMENTS: 80
    }
};

// 编码器配置
const ENCODER_CONFIG = {
    MP4_BITRATE: 8_000_000,
    WEBM_BITRATE: 10_000_000,
    QUALITY: 0.95,
    KEYFRAME_INTERVAL: {
        mp4: (fps) => fps * 2,
        webm: () => 1
    }
};

// MP4 Muxer 创建函数
function createMP4Muxer(width, height, fps, bitrate, keyFrameInterval, quality) {
    const target = new MP4ArrayBufferTarget();
    const config = {
        target,
        fastStart: 'in-memory',
        video: {
            codec: 'avc',
            width,
            height,
            bitrate,
            hardwareAcceleration: 'prefer-hardware',
            avc: { format: 'avc' },
            keyFrameInterval,
        }
    };
    
    const mp4 = new MP4Muxer(config);
    return mp4;
}

// WebM Muxer 创建函数
function createWebMMuxer(width, height, fps, bitrate, quality) {
    const target = new ArrayBufferTarget();
    const config = {
        target,
        video: {
            codec: 'vp8',
            width,
            height,
            bitrate,
            hardwareAcceleration: 'prefer-hardware',
        }
    };
    
    const webm = new Muxer(config);
    return webm;
}

// 主要的 Muxer 创建函数
function createMuxer({
    format,
    width,
    height,
    fps,
    bitrate,
    keyFrameInterval,
    quality
}) {
    return format === 'mp4'
        ? createMP4Muxer(width, height, fps, bitrate, keyFrameInterval, quality)
        : createWebMMuxer(width, height, fps, bitrate, quality);
}

// 统一的进度更新函数
function updateProgress({
    frameCounter,
    totalFrames,
    thumbnailDataURL,
    progressCallback,
    stage = '渲染中...'
}) {
    if (!progressCallback) return;
    
    // 确保进度值在0到1之间
    const progress = Math.min(1, Math.max(0, frameCounter / totalFrames));
    
    progressCallback({
        progress,
        currentFrame: frameCounter,
        totalFrames,
        stage,
        frameImage: thumbnailDataURL
    });
}

/**
 * @织: 预计算球面轨迹
 * @param {Object} options - 轨迹计算选项
 * @returns {Array} 相机位置数组
 */
export function computeSphereTrajectory({
    totalFrames,
    startLon = 0,
    endLon = 360,
    startLat = 0,
    endLat = 0,
    rotations = 1,
    smoothness = 0.8
}) {
    const positions = [];
    // 优化：使用简单线性插值替代非线性插值，确保帧的均匀分布
    const totalRotation = (endLon - startLon) * rotations;
    const latDelta = endLat - startLat;
    
    for (let frameCounter = 0; frameCounter < totalFrames; frameCounter++) {
        // 使用线性插值确保帧间的确定性
        const linearProgress = frameCounter / (totalFrames - 1);
        
        // 对于需要缓入缓出效果的情况，可以使用确定性的三次插值
        const progress = computeEaseInOutCubic(linearProgress);
        
        positions.push({
            currentLon: startLon + progress * totalRotation,
            currentLat: startLat + progress * latDelta,
            progress: linearProgress // 保存线性进度，便于调试
        });
    }
    
    // 添加调试信息
    console.log('预计算了', positions.length, '个相机位置');
    
    return positions;
}

/**
 * @织: 三次缓动函数
 * @param {number} t - 时间参数 (0-1)
 * @returns {number} 缓动后的值
 */
function computeEaseInOutCubic(t) {
    // 标准三次缓入缓出函数：t^2 * (3 - 2t)
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * @织: 获取当前帧位置
 * @param {Array} positions - 相机位置数组
 * @param {number} frameIndex - 帧索引
 * @returns {Object} 当前帧位置信息
 */
export function getCurrentFramePosition(positions, frameIndex) {
    return positions[Math.min(frameIndex, positions.length - 1)];
}

/**
 * @织: 更新相机位置
 * @param {Object} camera - Three.js相机对象
 * @param {Object} position - 位置信息
 * @returns {Object} 更新后的相机
 */
export function updateCameraPosition(camera, { currentLon, currentLat }) {
    const phi = THREE.MathUtils.degToRad(90 - currentLat);
    const theta = THREE.MathUtils.degToRad(currentLon);
    
    // 优化：使用球面坐标定位相机，确保定位的确定性
    const radius = 1; // 固定相机半径为1
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    
    return camera;
}

/**
 * @织: 捕获帧数据
 * @param {Object} renderer - Three.js渲染器
 * @param {Object} scene - Three.js场景
 * @param {Object} camera - Three.js相机
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {boolean} flipY - 是否翻转Y轴
 * @param {Object} watermarkOptions - 水印选项（可选）
 * @returns {Promise<Object>} 帧数据
 */
export async function captureFrame(renderer, scene, camera, width, height, flipY = false, watermarkOptions = null) {
    // 创建离屏渲染目标，修复过曝问题并优化性能
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        colorSpace: THREE.SRGBColorSpace,
        // 添加伽马校正设置
        generateMipmaps: false,
        // 优化：禁用不需要的缓冲区
        stencilBuffer: false,
        depthBuffer: true
    });
    
    try {
        // 设置渲染目标
        renderer.setRenderTarget(renderTarget);
        
        // 执行渲染
        renderer.render(scene, camera);
        
        // 读取像素数据
        const buffer = new Uint8Array(width * height * 4);
        renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
        
        // 创建ImageData对象
        let imageData;
        
        if (flipY) {
            // 如果需要翻转Y轴
            const flippedPixels = new Uint8ClampedArray(width * height * 4);
            for (let y = 0; y < height; y++) {
                const srcOffset = y * width * 4;
                const dstOffset = (height - y - 1) * width * 4;
                flippedPixels.set(buffer.subarray(srcOffset, srcOffset + width * 4), dstOffset);
            }
            imageData = new ImageData(flippedPixels, width, height);
        } else {
            // 不翻转Y轴
            imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
        }
        
        // 创建缩略图
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imageData, 0, 0);
        
        // 优化：添加水印支持（如果提供）
        if (watermarkOptions) {
            // 处理文字水印
            if (watermarkOptions.text && watermarkOptions.text.enabled) {
                // 这里可以添加文字水印处理逻辑
                console.log('文字水印功能待实现');
            }
            
            // 处理图片水印
            if (watermarkOptions.image && watermarkOptions.image.enabled) {
                // 这里可以添加图片水印处理逻辑
                console.log('图片水印功能待实现');
            }
        }
        
        // 生成缩略图数据URL (压缩比例较高以节省内存)
        const thumbnailCanvas = document.createElement('canvas');
        const thumbCtx = thumbnailCanvas.getContext('2d');
        thumbnailCanvas.width = 160;
        thumbnailCanvas.height = 90;
        thumbCtx.drawImage(canvas, 0, 0, width, height, 0, 0, 160, 90);
        const thumbnailDataURL = thumbnailCanvas.toDataURL('image/jpeg', 0.6);
        
        return {
            imageData: canvas,
            thumbnailDataURL
        };
    } finally {
        // 清理资源
        renderer.setRenderTarget(null);
        renderTarget.dispose();
    }
}

/**
 * @织: 视频编码器管理器
 */
class VideoEncoderManager {
    constructor(options) {
        const { width, height, fps, format } = options;
        
        // 确保分辨率为偶数（H264编码器要求）
        const { width: adjustedWidth, height: adjustedHeight } = ensureEvenDimensions(width, height);
        
        this.width = adjustedWidth;
        this.height = adjustedHeight;
        this.fps = fps;
        this.format = format;
        
        // 计算编码器配置
        this.bitrate = this.format === 'mp4' 
            ? ENCODER_CONFIG.MP4_BITRATE 
            : ENCODER_CONFIG.WEBM_BITRATE;
        
        this.keyFrameInterval = ENCODER_CONFIG.KEYFRAME_INTERVAL[this.format](this.fps);
        this.quality = ENCODER_CONFIG.QUALITY;
        
        // 初始化编码器和混流器
        this.initializeMuxer({
            format: this.format,
            width: this.width,
            height: this.height,
            fps: this.fps,
            bitrate: this.bitrate,
            keyFrameInterval: this.keyFrameInterval,
            quality: this.quality
        });
        
        this.initializeEncoder(this.bitrate, this.keyFrameInterval, this.quality);
        
        // 优化：添加编码器状态监控
        this.encodingQueue = [];
        this.isProcessingQueue = false;
        this.frameBuffer = [];
        this.currentFrameIndex = 0;
        this.totalFrames = 0;
    }

    initializeMuxer(config) {
        this.muxer = createMuxer(config);
    }

    initializeEncoder(bitrate, keyFrameInterval, quality) {
        const codec = this.format === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08';
        console.log('codec', codec);
        
        this.videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                // 确保按顺序添加到muxer
                this.muxer.addVideoChunk(chunk, meta);
            },
            error: (e) => console.error('VideoEncoder error:', e)
        });

        this.videoEncoder.configure({
            codec,
            width: this.width,
            height: this.height,
            bitrate,
            framerate: this.fps,
            quality,
            latencyMode: 'quality',
        });
    }

    async processFrames(totalFrames, frameGenerator) {
        this.totalFrames = totalFrames;
        
        console.log(`开始分批处理总共${totalFrames}帧...`);
        
        // 优化：根据分辨率和性能动态调整批次大小
        const batchSize = this.width >= 3000 ? 30 : (this.width >= 2000 ? 60 : 120);
        console.log(`分辨率${this.width}x${this.height}，使用批次大小: ${batchSize}`);
        
        const frameDuration = 1000000 / this.fps; // 微秒单位
        let lastThumbnail = null;
        
        // 分批处理所有帧
        for (let startFrame = 0; startFrame < totalFrames; startFrame += batchSize) {
            const endFrame = Math.min(startFrame + batchSize, totalFrames);
            console.log(`处理批次 ${startFrame} 到 ${endFrame-1}，共 ${endFrame - startFrame} 帧`);
            
            // 第一步：渲染当前批次的所有帧
            const batchFrames = [];
            
            for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
                // 计算精确时间戳
                const timestamp = Math.round(frameIndex * frameDuration);
                
                // 渲染当前帧
                const frameData = await frameGenerator(frameIndex);
                lastThumbnail = frameData.thumbnailDataURL;
                
                // 存储帧数据和时间戳
                batchFrames.push({
                    frameIndex,
                    timestamp,
                    duration: frameDuration,
                    imageData: frameData.imageData,
                    thumbnailDataURL: frameData.thumbnailDataURL
                });
            }
            
            // 第二步：立即编码当前批次的所有帧
            for (let i = 0; i < batchFrames.length; i++) {
                const frame = batchFrames[i];
                
                try {
                    // 创建 VideoFrame - 优化：支持多种图像数据类型
                    let videoFrame;
                    
                    if (frame.imageData instanceof HTMLCanvasElement) {
                        // 如果是Canvas元素，直接从Canvas创建VideoFrame
                        videoFrame = new VideoFrame(frame.imageData, {
                            timestamp: frame.timestamp,
                            duration: frame.duration
                        });
                    } else if (frame.imageData instanceof ImageData) {
                        // 如果是ImageData对象，从ImageData创建VideoFrame
                        videoFrame = new VideoFrame(frame.imageData, {
                            timestamp: frame.timestamp,
                            duration: frame.duration
                        });
                    } else if (frame.imageData instanceof ImageBitmap) {
                        // 如果是ImageBitmap，从ImageBitmap创建VideoFrame
                        videoFrame = new VideoFrame(frame.imageData, {
                            timestamp: frame.timestamp,
                            duration: frame.duration
                        });
                    } else {
                        // 默认处理Canvas
                        videoFrame = new VideoFrame(frame.imageData, {
                            timestamp: frame.timestamp,
                            duration: frame.duration
                        });
                    }
                    
                    // 确定是否是关键帧
                    const isKeyFrame = frame.frameIndex % this.keyFrameInterval === 0;
                    
                    // 优化：更智能的编码器队列管理
                    while (this.videoEncoder.encodeQueueSize > 3) {
                        await new Promise(resolve => setTimeout(resolve, 2));
                    }
                    
                    // 编码当前帧
                    this.videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
                    videoFrame.close();
                } catch (frameError) {
                    console.error(`处理第${frame.frameIndex}帧时出错:`, frameError);
                    // 继续处理下一帧
                }
                
                // 优化：及时释放资源
                if (frame.imageData && typeof frame.imageData.close === 'function') {
                    frame.imageData.close();
                }
                
                // 计算总体进度
                const progress = frame.frameIndex / totalFrames;
                updateProgress({
                    frameCounter: frame.frameIndex,
                    totalFrames,
                    thumbnailDataURL: frame.thumbnailDataURL,
                    progressCallback: this._progressCallback,
                    stage: '处理中...'
                });
            }
            
            // 清空当前批次的帧数据，帮助垃圾回收
            batchFrames.length = 0;
            
            // 优化：给系统留出更多时间进行垃圾回收
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // 确保所有帧都被处理
        await this.videoEncoder.flush();
        console.log('所有帧处理完成');
        
        // 最终进度更新
        updateProgress({
            frameCounter: totalFrames,
            totalFrames,
            thumbnailDataURL: lastThumbnail,
            progressCallback: this._progressCallback,
            stage: '编码完成'
        });
        
        return true;
    }

    // 添加进度回调设置方法
    setProgressCallback(callback) {
        this._progressCallback = callback;
    }

    async finalize() {
        // 确保编码器已刷新
        await this.videoEncoder.flush();
        
        this.muxer.finalize();
        const buffer = this.muxer.target.buffer;
        const mimeType = this.format === 'mp4' ? 'video/mp4' : 'video/webm';
        return new Blob([buffer], { type: mimeType });
    }
}

/**
 * @织: 全景图视频生成器
 */
export class PanoramaVideoGenerator {
    /**
     * @param {number} width - 视频宽度
     * @param {number} height - 视频高度
     */
    constructor(width = Constants.DEFAULT_VALUES.WIDTH, height = Constants.DEFAULT_VALUES.HEIGHT) {
        this.width = width;
        this.height = height;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.progressCallback = null;
        this.videoFormat = 'mp4';
    }

    /**
     * 初始化渲染器
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: Constants.RENDERER_CONFIG.ANTIALIAS,
            preserveDrawingBuffer: Constants.RENDERER_CONFIG.PRESERVE_DRAWING_BUFFER,
            powerPreference: Constants.RENDERER_CONFIG.POWER_PREFERENCE,
            alpha: Constants.RENDERER_CONFIG.ALPHA,
            precision: Constants.RENDERER_CONFIG.PRECISION,
            stencil: Constants.RENDERER_CONFIG.STENCIL,
            depth: Constants.RENDERER_CONFIG.DEPTH,
            logarithmicDepthBuffer: Constants.RENDERER_CONFIG.LOGARITHMIC_DEPTH_BUFFER
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(1);
        
        // 修复过曝问题：设置正确的颜色空间和伽马校正
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    /**
     * 设置场景
     * @param {string} imageUrl - 全景图URL
     */
    async setupScene(imageUrl) {
        this.scene = new THREE.Scene();
        const geometry = new THREE.SphereGeometry(
            Constants.SPHERE_CONFIG.RADIUS,
            Constants.SPHERE_CONFIG.WIDTH_SEGMENTS,
            Constants.SPHERE_CONFIG.HEIGHT_SEGMENTS
        );
        geometry.scale(-1, 1, 1);
        const textureLoader = new THREE.TextureLoader();
        const texture = await new Promise((resolve, reject) => {
            textureLoader.load(imageUrl, resolve, undefined, reject);
        });
        
        // 修复过曝问题：设置纹理的颜色空间
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.encoding = THREE.SRGBColorSpace;
        
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        this.scene.add(sphere);
        
        // 根据视频方向设置相机
        this.setupCamera();
    }

    /**
     * 设置相机
     */
    setupCamera() {
        const aspect = this.width / this.height;
        const isPortrait = this.height > this.width;
        const fov = isPortrait ? Constants.CAMERA_CONFIG.PORTRAIT_FOV : Constants.CAMERA_CONFIG.LANDSCAPE_FOV;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    }

    /**
     * 设置进度回调
     * @param {Function} callback - 进度回调函数
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    /**
     * 更新相机和渲染器设置
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    updateCameraAndRenderer(width, height) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height);
        
        // 重新设置相机
        this.setupCamera();
    }

    /**
     * 开始录制
     * @param {Object} options - 录制选项
     * @returns {Promise<Blob>} 视频Blob
     */
    async startRecording(options = {}) {
        const {
            duration = Constants.DEFAULT_VALUES.DURATION,
            fps = Constants.DEFAULT_VALUES.FPS,
            startLon = 0,
            endLon = 360,
            startLat = 0,
            endLat = 0,
            rotations = 1,
            smoothness = 0.8,
            width = this.width,
            height = this.height,
            format = 'mp4',
            orientation = 'landscape'
        } = options;

        this.videoFormat = format;
        this.updateCameraAndRenderer(width, height);

        const totalFrames = Math.ceil(fps * duration);
        this.duration = duration;
        this.fps = fps;

        const encoderManager = new VideoEncoderManager({
            width: this.width,
            height: this.height,
            fps: this.fps,
            format: this.videoFormat
        });
        
        // 传递进度回调
        encoderManager.setProgressCallback(this.progressCallback);

        // 根据视频方向调整轨迹参数
        let trajectoryOptions = {
            totalFrames,
            startLon,
            endLon,
            startLat,
            endLat,
            rotations,
            smoothness
        };

        // 竖向视频使用更合适的轨迹参数
        if (orientation === 'portrait') {
            // 竖向视频通常需要更慢的旋转和更小的纬度变化
            trajectoryOptions.rotations = Math.min(rotations, 1.5);
            trajectoryOptions.endLat = Math.min(endLat, 30); // 限制纬度变化
        }

        const cameraPositions = computeSphereTrajectory(trajectoryOptions);

        try {
            const frameGenerator = async (frame) => {
                const { currentLon, currentLat } = getCurrentFramePosition(cameraPositions, frame);
                updateCameraPosition(this.camera, { currentLon, currentLat });
                
                const frameData = await captureFrame(
                    this.renderer,
                    this.scene,
                    this.camera,
                    this.width,
                    this.height,
                    true, // 修改为true，强制Y轴翻转以修正视频上下颠倒问题
                    null // 暂时不添加水印
                );

                // 渲染阶段的进度只占总进度的50%
                const renderProgress = frame / totalFrames * 0.5;
                updateProgress({
                    frameCounter: Math.floor(renderProgress * totalFrames),
                    totalFrames,
                    thumbnailDataURL: frameData.thumbnailDataURL,
                    progressCallback: this.progressCallback,
                    stage: '渲染帧...'
                });

                return frameData;
            };

            await encoderManager.processFrames(totalFrames, frameGenerator);
            return await encoderManager.finalize();
        } catch (error) {
            console.error('视频生成错误:', error);
            throw error;
        }
    }

    /**
     * 释放资源
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}

/**
 * @织: 保存视频Blob
 * @param {Blob} blob - 视频Blob
 * @param {string} format - 视频格式
 * @param {string} filename - 文件名
 */
export async function saveVideoBlob(blob, format = 'mp4', filename = 'panorama-video') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
} 