<template>
    <div id="uploadPrompt" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2>全景图浏览器</h2>
        <p>拖拽全景图文件到此处，或点击选择文件</p>
        <input type="file" id="fileInput" accept="image/*,.html" style="display: none;" @change="handleFileChange">
        <button @click="triggerFileInput" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">选择文件</button>
    </div>
</template>

<script setup>
import { handleFileUpload } from '../scripts/file-handler.js';

// 定义emit
const emit = defineEmits(['file-uploaded']);

// 方法
const triggerFileInput = () => {
    document.getElementById('fileInput').click();
};

const handleFileChange = async (event) => {
    const result = await handleFileUpload(event.target.files);
    if (result) {
        emit('file-uploaded', result); // 文件处理完成后发出事件，并传递结果
    }
};
</script>

<style scoped>
/* 这里可以添加组件特有的样式 */
</style>