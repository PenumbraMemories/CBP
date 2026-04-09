'use strict'

import { app, protocol, BrowserWindow, clipboard, ipcMain, screen } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fs from 'fs'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 数据存储路径
let userDataPath;
let clipsDataPath;
let imagesPath;
let clips = [];
let lastClipboardContent = '';
let lastClipboardImage = null;
let mainWindow = null;

// 初始化数据存储路径
function initDataPath() {
  userDataPath = app.getPath('userData');
  clipsDataPath = path.join(userDataPath, 'clips.json');
  imagesPath = path.join(userDataPath, 'images');
  
  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  // 确保图片目录存在
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }

  // 加载已保存的数据
  loadClipsData();
}

// 加载剪切板数据
function loadClipsData() {
  try {
    if (fs.existsSync(clipsDataPath)) {
      const data = fs.readFileSync(clipsDataPath, 'utf-8');
      clips = JSON.parse(data);
    }
  } catch (error) {
    console.error('加载剪切板数据失败:', error);
    clips = [];
  }
}

// 保存剪切板数据
function saveClipsData() {
  try {
    fs.writeFileSync(clipsDataPath, JSON.stringify(clips, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存剪切板数据失败:', error);
  }
}

// 保存图片到文件
function saveImageToFile(imageBuffer) {
  const timestamp = Date.now();
  const filename = `${timestamp}.png`;
  const filepath = path.join(imagesPath, filename);
  
  try {
    fs.writeFileSync(filepath, imageBuffer);
    return filename;
  } catch (error) {
    console.error('保存图片失败:', error);
    return null;
  }
}

// 监控剪切板变化
function startClipboardMonitoring() {
  // 初始化时获取当前剪切板内容
  lastClipboardContent = clipboard.readText();
  lastClipboardImage = clipboard.readImage();
  
  // 每秒检查一次剪切板变化
  setInterval(() => {
    const currentContent = clipboard.readText();
    const currentImage = clipboard.readImage();
    const hasImage = !currentImage.isEmpty();
    
    // 如果剪切板内容有变化且不为空
    if (currentContent && currentContent !== lastClipboardContent) {
      lastClipboardContent = currentContent;
      
      // 检查是否已存在相同内容
      const exists = clips.some(clip => clip.content === currentContent);
      
      if (!exists) {
        // 添加新记录
        clips.unshift({
          content: currentContent,
          timestamp: new Date().toISOString(),
          isFavorite: false,
          expanded: false,
          isOverflow: false,
          type: 'text'
        });
        
        // 保存到文件
        saveClipsData();
        
        // 通知渲染进程更新UI
        if (mainWindow) {
          mainWindow.webContents.send('clipboard-update', {
            content: currentContent,
            timestamp: new Date().toISOString(),
            type: 'text'
          });
        }
      }
    }
    
    // 处理图片变化
    if (hasImage) {
      const currentImageBuffer = currentImage.toPNG();
      const lastImageBuffer = lastClipboardImage ? lastClipboardImage.toPNG() : null;
      
      // 比较图片是否变化
      if (!lastImageBuffer || !currentImageBuffer.equals(lastImageBuffer)) {
        lastClipboardImage = currentImage;
        
        // 保存图片
        const imageFilename = saveImageToFile(currentImageBuffer);
        
        if (imageFilename) {
          // 添加图片记录
          clips.unshift({
            content: '图片',
            timestamp: new Date().toISOString(),
            isFavorite: false,
            expanded: false,
            isOverflow: false,
            type: 'image',
            imageFilename: imageFilename
          });
          
          // 保存到文件
          saveClipsData();
          
          // 通知渲染进程更新UI
          if (mainWindow) {
            mainWindow.webContents.send('clipboard-update', {
              content: '图片',
              timestamp: new Date().toISOString(),
              type: 'image',
              imageFilename: imageFilename
            });
          }
        }
      }
    }
  }, 1000);
}

async function createWindow() {
  // 获取屏幕尺寸
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: Math.min(1200, screenHeight), // 设置窗口高度为600或屏幕高度的较小值
    x: screenWidth - 500, // 将窗口定位到屏幕最右边
    y: 0,
    frame: false, // 隐藏窗口标题栏和菜单栏
    backgroundColor: '#000000', // 设置窗口背景色为黑色，避免暗色模式下的白边
    transparent: false, // 禁用透明背景，提高性能
    alwaysOnTop: true, // 设置窗口默认为置顶状态
    webPreferences: {
      
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    mainWindow.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  
  // 初始化数据路径
  initDataPath();
  
  // 启动剪切板监控
  startClipboardMonitoring();
  
  createWindow()
})

// IPC 通信处理
ipcMain.handle('get-clips', () => {
  return clips;
});

ipcMain.handle('get-image', (event, filename) => {
  const filepath = path.join(imagesPath, filename);
  try {
    const imageBuffer = fs.readFileSync(filepath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('获取图片失败:', error);
    return null;
  }
});

ipcMain.handle('save-clip', (event, clip) => {
  // 检查是否已存在相同内容
  const exists = clips.some(c => c.content === clip.content);
  
  if (!exists) {
    clips.unshift(clip);
    saveClipsData();
    return true;
  }
  return false;
});

ipcMain.handle('delete-clip', (event, index) => {
  if (index >= 0 && index < clips.length) {
    const clip = clips[index];
    
    // 如果是图片类型，删除对应的图片文件
    if (clip.type === 'image' && clip.imageFilename) {
      const imagePath = path.join(imagesPath, clip.imageFilename);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('删除图片文件失败:', error);
      }
    }
    
    clips.splice(index, 1);
    saveClipsData();
    return true;
  }
  return false;
});

ipcMain.handle('toggle-favorite', (event, index) => {
  if (index >= 0 && index < clips.length) {
    clips[index].isFavorite = !clips[index].isFavorite;
    saveClipsData();
    return true;
  }
  return false;
});

ipcMain.handle('update-clip-note', (event, index, note) => {
  if (index >= 0 && index < clips.length) {
    clips[index].note = note;
    saveClipsData();
    return true;
  }
  return false;
});

ipcMain.handle('clear-all-clips', () => {
  // 删除所有图片文件
  clips.forEach(clip => {
    if (clip.type === 'image' && clip.imageFilename) {
      const imagePath = path.join(imagesPath, clip.imageFilename);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('删除图片文件失败:', error);
      }
    }
  });
  
  clips = [];
  saveClipsData();
  return true;
});

ipcMain.handle('save-clips', (event, newClips) => {
  clips = newClips;
  saveClipsData();
  return true;
});

// 处理窗口置顶请求
ipcMain.handle('set-always-on-top', (event, isAlwaysOnTop) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
    return true;
  }
  return false;
});

// 缓动函数 - 使动画更加平滑
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 更平滑的缓动函数
function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// 处理窗口隐藏请求 - 使用动画实现整个窗口的平滑移动
ipcMain.handle('hide-window', () => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    const [width, height] = mainWindow.getSize();
    const targetY = -height + 1; // 只保留顶部5像素可见
    const startY = y;
    const distance = targetY - startY;
    const totalFrames = 8; // 进一步减少帧数，加快反应速度
    const duration = 10; // 进一步缩短动画时间，使反应更快
    const frameInterval = duration / totalFrames; // 每帧间隔
    let frame = 0;
    
    const animate = () => {
      frame++;
      const progress = frame / totalFrames;
      // 使用线性缓动，使动画反应更快
      const easedProgress = progress;
      const currentY = Math.round(startY + distance * easedProgress);
      
      if (frame >= totalFrames) {
        mainWindow.setPosition(x, targetY);
      } else {
        mainWindow.setPosition(x, currentY);
        setTimeout(animate, frameInterval);
      }
    };
    
    animate();
    return true;
  }
  return false;
});

// 处理窗口显示请求 - 使用动画实现整个窗口的平滑移动
ipcMain.handle('show-window', () => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    const [width, height] = mainWindow.getSize();
    const targetY = 0; // 恢复到原始位置
    const startY = y;
    const distance = targetY - startY;
    const totalFrames = 8; // 进一步减少帧数，加快反应速度
    const duration = 10; // 进一步缩短动画时间，使反应更快
    const frameInterval = duration / totalFrames; // 每帧间隔
    let frame = 0;
    
    const animate = () => {
      frame++;
      const progress = frame / totalFrames;
      // 使用线性缓动，使动画反应更快
      const easedProgress = progress;
      const currentY = Math.round(startY + distance * easedProgress);
      
      if (frame >= totalFrames) {
        mainWindow.setPosition(x, targetY);
      } else {
        mainWindow.setPosition(x, currentY);
        setTimeout(animate, frameInterval);
      }
    };
    
    animate();
    return true;
  }
  return false;
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
