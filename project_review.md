## src/scripts/viewer-manager.js 审查意见

### 优点
- **职责明确**: 该模块专注于 Pannellum 查看器的创建和管理，职责单一。
- **模块化导入**: 导入了 `addCustomContextMenuItem`，保持了模块间的职责分离。
- **Pannellum 库加载检查**: 在创建查看器之前检查 `pannellum` 是否已加载，并使用 `setTimeout` 进行重试，这是一种简单的等待机制。

### 建议
- **Pannellum 库加载的统一管理**: 尽管这里有简单的加载检查，但 `pannellum-loader.js` 已经提供了更完善的 `waitForPannellum` 函数。建议在 `createViewer` 中使用 `waitForPannellum` 来确保 Pannellum 库已加载，而不是简单的 `setTimeout` 重试，这样可以避免重复的加载逻辑和潜在的竞态条件。
- **`addHotSpot` 函数的调用**: 在 `file-handler.js` 中，`handleHTMLFile` 函数在创建查看器后调用了 `viewer.addHotSpot()`，但 `viewer-manager.js` 中也导出了 `addHotSpot` 函数。建议统一使用 `viewer-manager.js` 中导出的 `addHotSpot` 函数，以保持一致性。
- **错误处理**: 如果 `pannellum` 库长时间未加载，`setTimeout` 的重试机制可能会导致性能问题或用户体验不佳。可以考虑在 `waitForPannellum` 中设置更明确的超时和错误提示。