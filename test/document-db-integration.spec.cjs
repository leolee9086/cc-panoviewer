const { test, expect } = require('@playwright/test');

/**
 * @织: DocumentDB 集成测试套件
 * 测试DocumentDB在项目实际使用场景中的表现
 */

test.describe('DocumentDB 集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1:has-text("DocumentDB 自动化测试")', { timeout: 10000 });
  });

  test('应该能够存储全景图查看器状态', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟全景图查看器状态
      const viewerState = {
        panorama: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        config: {
          type: "equirectangular",
          autoLoad: true,
          showControls: true,
          autoRotate: true,
          autoRotateInactivityDelay: 2000,
          autoRotateStopDelay: 10,
          showZoomCtrl: true,
          showFullscreenCtrl: true,
          showNavCtrl: true,
          showInfoCtrl: true,
          showNavbar: true,
          navbar: [
            'autorotate',
            'zoom',
            'move',
            'download',
            'fullscreen'
          ]
        },
        hotSpots: [
          {
            id: "hotspot1",
            pitch: 0,
            yaw: 0,
            type: "info",
            text: "热点1",
            cssClass: "custom-hotspot"
          },
          {
            id: "hotspot2",
            pitch: 10,
            yaw: 45,
            type: "scene",
            target: "scene2",
            text: "切换到场景2"
          }
        ],
        currentView: {
          pitch: 0,
          yaw: 0,
          fov: 50
        },
        timestamp: Date.now()
      };
      
      // 存储查看器状态
      db.set('viewer-state', viewerState, {
        type: 'json',
        version: '1.0',
        description: '全景图查看器状态',
        category: 'viewer'
      });
      
      // 验证存储
      const retrieved = db.get('viewer-state');
      const stateMatch = JSON.stringify(retrieved) === JSON.stringify(viewerState);
      
      return {
        stateMatch,
        hasPanorama: retrieved.panorama === viewerState.panorama,
        hasConfig: retrieved.config.type === viewerState.config.type,
        hasHotSpots: retrieved.hotSpots.length === viewerState.hotSpots.length,
        hasCurrentView: retrieved.currentView.pitch === viewerState.currentView.pitch
      };
    });
    
    expect(result.stateMatch).toBe(true);
    expect(result.hasPanorama).toBe(true);
    expect(result.hasConfig).toBe(true);
    expect(result.hasHotSpots).toBe(true);
    expect(result.hasCurrentView).toBe(true);
  });

  test('应该能够存储用户偏好设置', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟用户偏好设置
      const userPreferences = {
        theme: 'dark',
        language: 'zh-CN',
        quality: 'high',
        resolution: '4K',
        autoSave: true,
        autoLoad: true,
        showGrid: false,
        showHotspots: true,
        autoRotate: false,
        downloadFormat: 'jpeg',
        downloadQuality: 0.9,
        keyboardShortcuts: {
          'ArrowUp': 'pitch-up',
          'ArrowDown': 'pitch-down',
          'ArrowLeft': 'yaw-left',
          'ArrowRight': 'yaw-right',
          'Space': 'toggle-rotation',
          'Escape': 'reset-view'
        },
        ui: {
          showToolbar: true,
          showStatusBar: true,
          showProgressBar: true,
          toolbarPosition: 'top',
          statusBarPosition: 'bottom'
        },
        performance: {
          enableWebGL: true,
          enableHardwareAcceleration: true,
          maxTextureSize: 4096,
          enableCompression: true
        }
      };
      
      // 存储用户偏好
      db.set('user-preferences', userPreferences, {
        type: 'json',
        version: '1.0',
        description: '用户偏好设置',
        category: 'preferences',
        lastModified: new Date().toISOString()
      });
      
      // 验证存储
      const retrieved = db.get('user-preferences');
      const preferencesMatch = JSON.stringify(retrieved) === JSON.stringify(userPreferences);
      
      return {
        preferencesMatch,
        hasTheme: retrieved.theme === userPreferences.theme,
        hasLanguage: retrieved.language === userPreferences.language,
        hasQuality: retrieved.quality === userPreferences.quality,
        hasKeyboardShortcuts: Object.keys(retrieved.keyboardShortcuts).length === Object.keys(userPreferences.keyboardShortcuts).length,
        hasUI: retrieved.ui.showToolbar === userPreferences.ui.showToolbar,
        hasPerformance: retrieved.performance.enableWebGL === userPreferences.performance.enableWebGL
      };
    });
    
    expect(result.preferencesMatch).toBe(true);
    expect(result.hasTheme).toBe(true);
    expect(result.hasLanguage).toBe(true);
    expect(result.hasQuality).toBe(true);
    expect(result.hasKeyboardShortcuts).toBe(true);
    expect(result.hasUI).toBe(true);
    expect(result.hasPerformance).toBe(true);
  });

  test('应该能够存储图片处理历史', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟图片处理历史
      const processingHistory = {
        originalImage: 'data:image/jpeg;base64,original-data',
        processedImages: [
          {
            id: 'img-1',
            resolution: '4K',
            format: 'jpeg',
            quality: 0.9,
            size: 2048576, // 2MB
            data: 'data:image/jpeg;base64,processed-4k-data',
            timestamp: Date.now() - 3600000 // 1小时前
          },
          {
            id: 'img-2',
            resolution: '2K',
            format: 'jpeg',
            quality: 0.8,
            size: 1024288, // 1MB
            data: 'data:image/jpeg;base64,processed-2k-data',
            timestamp: Date.now() - 1800000 // 30分钟前
          },
          {
            id: 'img-3',
            resolution: '1080p',
            format: 'jpeg',
            quality: 0.7,
            size: 512144, // 500KB
            data: 'data:image/jpeg;base64,processed-1080p-data',
            timestamp: Date.now() - 900000 // 15分钟前
          }
        ],
        metadata: {
          originalName: 'panorama.jpg',
          originalSize: 5242880, // 5MB
          originalFormat: 'jpeg',
          processingDate: new Date().toISOString(),
          processingTime: 15000, // 15秒
          compressionRatio: 0.6
        }
      };
      
      // 存储处理历史
      db.set('processing-history', processingHistory, {
        type: 'json',
        version: '1.0',
        description: '图片处理历史',
        category: 'history'
      });
      
      // 验证存储
      const retrieved = db.get('processing-history');
      const historyMatch = JSON.stringify(retrieved) === JSON.stringify(processingHistory);
      
      return {
        historyMatch,
        hasOriginalImage: retrieved.originalImage === processingHistory.originalImage,
        hasProcessedImages: retrieved.processedImages.length === processingHistory.processedImages.length,
        hasMetadata: retrieved.metadata.originalName === processingHistory.metadata.originalName,
        firstProcessedImage: retrieved.processedImages[0].resolution === '4K',
        lastProcessedImage: retrieved.processedImages[2].resolution === '1080p'
      };
    });
    
    expect(result.historyMatch).toBe(true);
    expect(result.hasOriginalImage).toBe(true);
    expect(result.hasProcessedImages).toBe(true);
    expect(result.hasMetadata).toBe(true);
    expect(result.firstProcessedImage).toBe(true);
    expect(result.lastProcessedImage).toBe(true);
  });

  test('应该能够存储导出配置', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟导出配置
      const exportConfig = {
        singleFile: {
          enabled: true,
          includeImages: true,
          includeStyles: true,
          includeScripts: true,
          minify: true,
          compress: true,
          filename: 'panorama-viewer.html'
        },
        imageExport: {
          format: 'jpeg',
          quality: 0.9,
          resolution: '4K',
          includeMetadata: true,
          filename: 'panorama-{timestamp}.jpg'
        },
        dataExport: {
          format: 'json',
          includeViewerState: true,
          includeUserPreferences: true,
          includeProcessingHistory: true,
          filename: 'panorama-data-{timestamp}.json'
        },
        sharing: {
          generateShareLink: true,
          includeViewerState: true,
          allowDownload: true,
          allowFullscreen: true,
          allowControls: true
        }
      };
      
      // 存储导出配置
      db.set('export-config', exportConfig, {
        type: 'json',
        version: '1.0',
        description: '导出配置',
        category: 'export'
      });
      
      // 验证存储
      const retrieved = db.get('export-config');
      const configMatch = JSON.stringify(retrieved) === JSON.stringify(exportConfig);
      
      return {
        configMatch,
        hasSingleFile: retrieved.singleFile.enabled === exportConfig.singleFile.enabled,
        hasImageExport: retrieved.imageExport.format === exportConfig.imageExport.format,
        hasDataExport: retrieved.dataExport.format === exportConfig.dataExport.format,
        hasSharing: retrieved.sharing.generateShareLink === exportConfig.sharing.generateShareLink
      };
    });
    
    expect(result.configMatch).toBe(true);
    expect(result.hasSingleFile).toBe(true);
    expect(result.hasImageExport).toBe(true);
    expect(result.hasDataExport).toBe(true);
    expect(result.hasSharing).toBe(true);
  });

  test('应该能够存储会话状态', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟会话状态
      const sessionState = {
        sessionId: 'session-' + Date.now(),
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        currentFile: {
          name: 'panorama.jpg',
          size: 5242880,
          type: 'image/jpeg',
          lastModified: new Date().toISOString()
        },
        viewerState: {
          pitch: 15.5,
          yaw: 45.2,
          fov: 50,
          autoRotate: false,
          showControls: true
        },
        userActions: [
          {
            type: 'load',
            timestamp: Date.now() - 300000,
            data: { filename: 'panorama.jpg' }
          },
          {
            type: 'view-change',
            timestamp: Date.now() - 180000,
            data: { pitch: 10, yaw: 30 }
          },
          {
            type: 'hotspot-click',
            timestamp: Date.now() - 60000,
            data: { hotspotId: 'hotspot1' }
          }
        ],
        performance: {
          loadTime: 1500,
          renderTime: 200,
          memoryUsage: 52428800, // 50MB
          frameRate: 60
        }
      };
      
      // 存储会话状态
      db.set('session-state', sessionState, {
        type: 'json',
        version: '1.0',
        description: '会话状态',
        category: 'session'
      });
      
      // 验证存储
      const retrieved = db.get('session-state');
      const stateMatch = JSON.stringify(retrieved) === JSON.stringify(sessionState);
      
      return {
        stateMatch,
        hasSessionId: retrieved.sessionId === sessionState.sessionId,
        hasCurrentFile: retrieved.currentFile.name === sessionState.currentFile.name,
        hasViewerState: retrieved.viewerState.pitch === sessionState.viewerState.pitch,
        hasUserActions: retrieved.userActions.length === sessionState.userActions.length,
        hasPerformance: retrieved.performance.loadTime === sessionState.performance.loadTime
      };
    });
    
    expect(result.stateMatch).toBe(true);
    expect(result.hasSessionId).toBe(true);
    expect(result.hasCurrentFile).toBe(true);
    expect(result.hasViewerState).toBe(true);
    expect(result.hasUserActions).toBe(true);
    expect(result.hasPerformance).toBe(true);
  });

  test('应该能够支持数据迁移和版本升级', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 模拟旧版本数据
      const oldVersionData = {
        'viewer-config-v1': {
          type: 'equirectangular',
          panorama: 'old-panorama-data',
          autoLoad: true
        },
        'user-settings-v1': {
          theme: 'light',
          quality: 'medium'
        }
      };
      
      // 存储旧版本数据
      Object.entries(oldVersionData).forEach(([key, value]) => {
        db.set(key, value, { version: '1.0' });
      });
      
      // 模拟数据迁移
      const migrationResult = {
        migrated: [],
        errors: [],
        totalItems: 0
      };
      
      // 迁移数据
      const keys = db.list();
      keys.forEach(key => {
        const element = document.querySelector(`[data-key="${key}"]`);
        const version = element.getAttribute('data-version');
        
        if (version === '1.0') {
          try {
            const oldData = db.get(key);
            
            // 迁移逻辑
            if (key === 'viewer-config-v1') {
              const newData = {
                ...oldData,
                showControls: true,
                autoRotate: false,
                hotSpots: []
              };
              db.set('viewer-config-v2', newData, { version: '2.0' });
              migrationResult.migrated.push(key);
            } else if (key === 'user-settings-v1') {
              const newData = {
                ...oldData,
                language: 'zh-CN',
                autoSave: true,
                downloadFormat: 'jpeg'
              };
              db.set('user-settings-v2', newData, { version: '2.0' });
              migrationResult.migrated.push(key);
            }
            
            migrationResult.totalItems++;
          } catch (error) {
            migrationResult.errors.push(key);
          }
        }
      });
      
      // 验证迁移结果
      const v2Config = db.get('viewer-config-v2');
      const v2Settings = db.get('user-settings-v2');
      
      return {
        migrationSuccess: migrationResult.migrated.length === 2,
        migrationErrors: migrationResult.errors.length === 0,
        totalItems: migrationResult.totalItems,
        hasV2Config: v2Config && v2Config.showControls === true,
        hasV2Settings: v2Settings && v2Settings.language === 'zh-CN'
      };
    });
    
    expect(result.migrationSuccess).toBe(true);
    expect(result.migrationErrors).toBe(true);
    expect(result.totalItems).toBe(2);
    expect(result.hasV2Config).toBe(true);
    expect(result.hasV2Settings).toBe(true);
  });

  test('应该能够支持数据备份和恢复', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { DocumentDB } = window;
      const db = new DocumentDB(document);
      
      // 存储重要数据
      const importantData = {
        'viewer-config': { type: 'equirectangular', autoLoad: true },
        'user-preferences': { theme: 'dark', language: 'zh-CN' },
        'processing-history': { items: ['item1', 'item2', 'item3'] },
        'session-state': { sessionId: 'test-session', startTime: new Date().toISOString() }
      };
      
      Object.entries(importantData).forEach(([key, value]) => {
        db.set(key, value, { 
          type: 'json',
          version: '1.0',
          category: 'important'
        });
      });
      
      // 创建备份
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: db.export(),
        metadata: {
          totalItems: db.list().length,
          categories: ['viewer-config', 'user-preferences', 'processing-history', 'session-state']
        }
      };
      
      // 模拟数据丢失
      db.clear();
      
      // 验证数据丢失
      const afterClear = db.list().length === 0;
      
      // 从备份恢复
      const newDb = new DocumentDB(document, '#document-db-restore');
      newDb.import(backup.data);
      
      // 验证恢复
      const restoredData = {
        viewerConfig: newDb.get('viewer-config'),
        userPreferences: newDb.get('user-preferences'),
        processingHistory: newDb.get('processing-history'),
        sessionState: newDb.get('session-state')
      };
      
      return {
        backupCreated: backup.data.length > 0,
        dataLost: afterClear,
        dataRestored: !!(restoredData.viewerConfig && 
                     restoredData.userPreferences && 
                     restoredData.processingHistory && 
                     restoredData.sessionState),
        totalRestored: newDb.list().length === 4
      };
    });
    
    expect(result.backupCreated).toBe(true);
    expect(result.dataLost).toBe(true);
    expect(result.dataRestored).toBe(true);
    expect(result.totalRestored).toBe(true);
  });
}); 