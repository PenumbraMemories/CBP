<template>
  <div id="app" :class="{ 'dark-mode': isDarkMode }">
    <div class="background-decoration">
      <div class="decoration-circle decoration-1"></div>
      <div class="decoration-circle decoration-2"></div>
      <div class="decoration-circle decoration-3"></div>
    </div>
    <div class="container">
      <header class="app-header" :class="{ 'hidden': isHeaderHidden }">
        <h1><span class="icon">📋</span> 剪切板plus</h1>
        <div class="header-actions">
          <button @click="toggleHeader" class="action-btn toggle-header-btn" :class="{ 'active': isHeaderHidden }" title="隐藏/显示顶部栏">🔽</button>
          <button @click="toggleDarkMode" class="action-btn dark-mode-btn" :class="{ 'active': isDarkMode }" title="深色模式">{{ isDarkMode ? '🌙' : '☀️' }}</button>
          <button @click="toggleAutoHide" class="action-btn pin-btn" :class="{ 'active': !isAutoHideEnabled }" title="锁定窗口（不自动伸缩）">🔄</button>
          <button @click="exportClips" class="action-btn export-btn" title="导出数据">📤</button>
          <button @click="triggerImport" class="action-btn import-btn" title="导入数据">📥</button>
          <input type="file" ref="importFile" accept=".json" style="display: none" @change="importClips">
          <button @click="clearAllClips" class="action-btn clear-btn" title="清空所有">🗑️</button>
        </div>
      </header>
      <button v-if="isHeaderHidden" @click="toggleHeader" class="show-header-btn" title="显示顶部栏">🔼</button>

      <div class="status-section" :class="{ 'hidden': isHeaderHidden }">
        <button @click="toggleMonitoring" class="toggle-btn" :class="{ 'active': isMonitoring }">
          <span class="status-dot" :class="{ 'active': isMonitoring }"></span>
          {{ isMonitoring ? '停止监控' : '开始监控' }}
        </button>
      </div>

      <div class="search-section"> 
 
 
 

        <div class="filter-tabs">
          <button 
            @click="activeFilter = 'all'; noteSearchQuery = ''" 
            :class="{ 'active': activeFilter === 'all' }" 
            class="filter-tab"
          >
            全部 ({{ clips.length }})
          </button>
          <button 
            @click="activeFilter = 'favorites'" 
            :class="{ 'active': activeFilter === 'favorites' }" 
            class="filter-tab"
          >
            收藏 ({{ favoriteCount }})
          </button>
          <button
            @click="activeFilter = 'date'"
            :class="{ 'active': activeFilter === 'date' }"
            class="filter-tab"
          >
            按日期查找
          </button>
          <button
            @click="activeFilter = 'note'"
            :class="{ 'active': activeFilter === 'note' }"
            class="filter-tab"
          >
            按备注查找
          </button>
          <button
            @click="activeFilter = 'content'"
            :class="{ 'active': activeFilter === 'content' }"
            class="filter-tab"
          >
            按内容查询
          </button>
        </div>
        <div v-if="activeFilter === 'date'" class="date-filter">
          <input type="date" v-model="dateFilter" class="date-input">
        </div>
        <div v-if="activeFilter === 'note'" class="note-filter">
          <input type="text" v-model="noteSearchQuery" class="note-input" placeholder="请输入备注关键词...">
        </div>
        <div v-if="activeFilter === 'content'" class="content-filter">
          <input type="text" v-model="searchQuery" class="content-input" placeholder="请输入内容关键词...">
        </div>
      </div>

      <div class="clip-list">
        <div v-for="(clip, index) in filteredClips" :key="index" class="clip-item" :class="{ 'favorite': clip.isFavorite, 'show-actions': clip.showActions }" @click="toggleClipActions(index)">
          <div class="clip-header">
            <span class="clip-time">{{ formatTime(clip.timestamp) }}</span>
            <button @click="toggleFavorite(index)" class="favorite-btn" :class="{ 'active': clip.isFavorite }">
              {{ clip.isFavorite ? '⭐' : '☆' }}
            </button>
          </div>
          <div v-if="clip.type === 'image' && clip.imageData" class="clip-content image-content">
            <img :src="`data:image/png;base64,${clip.imageData}`" alt="剪切板图片" class="clip-image" @click="showImagePreview(clip)">
          </div>
          <div v-else class="clip-content selectable" :class="{ 'expanded': clip.expanded }" v-html="formatContent(clip.content)"></div>
          <div v-if="clip.note" class="clip-note">
            <span class="note-icon">📝</span>
            <span class="note-text">{{ clip.note }}</span>
          </div>
          <div v-if="clip.showActions" class="clip-actions">
            <button @click.stop="toggleExpand(index)" class="expand-btn" :class="{ 'active': clip.expanded }" title="展开/收起">
              {{ clip.expanded ? '🔼' : '🔽' }}
            </button>
            <div class="action-buttons">
              <button @click.stop="showNoteDialog(index)" class="note-btn" title="添加/编辑备注">📝</button>
              <button @click.stop="copyToClipboard(clip)" class="copy-btn" title="复制">📋</button>
              <button @click.stop="deleteClip(index)" class="delete-btn" title="删除">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredClips.length === 0" class="empty-message">
        {{ searchQuery ? '没有找到匹配的剪切板记录' : '暂无剪切板记录' }}
      </div>
    </div>

    <!-- 备注对话框 -->
    <div v-if="noteDialogVisible" class="dialog-overlay" @click="closeNoteDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>添加备注</h3>
          <button @click="closeNoteDialog" class="close-btn">✕</button>
        </div>
        <div class="dialog-content">
          <textarea
            v-model="noteText"
            placeholder="请输入备注内容..."
            class="note-textarea"
            rows="4"
          ></textarea>
        </div>
        <div class="dialog-actions">
          <button @click="closeNoteDialog" class="cancel-btn">取消</button>
          <button @click="saveNote" class="save-btn">保存</button>
        </div>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <div v-if="imagePreviewVisible" class="image-preview-overlay" @click="closeImagePreview">
      <div class="image-preview-container" @click.stop>
        <div class="image-preview-header">
          <h3>图片预览</h3>
          <button @click="closeImagePreview" class="close-btn" title="关闭预览">✕</button>
        </div>
        <div class="image-preview-content" @wheel.prevent="handleImageWheel" @mousedown="handleImageMouseDown">
          <div 
            class="preview-image-wrapper"
            :style="{ 
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }"
          >
            <img 
              :src="`data:image/png;base64,${previewImageData}`" 
              alt="预览图片" 
              class="preview-image"
              @load="resetImagePosition"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, getCurrentInstance, computed } from 'vue';

// 动态获取 ipcRenderer，避免 Webpack 编译错误
const ipcRenderer = window.require('electron').ipcRenderer;

export default {
  name: 'ClipboardApp',
  setup() {
    const { proxy } = getCurrentInstance();

    // 响应式数据
    const clips = ref([]);
    const isMonitoring = ref(true); // Electron 中默认开启监控
    const searchQuery = ref('');
    const noteSearchQuery = ref('');
    const activeFilter = ref('all');
    const dateFilter = ref(new Date().toISOString().slice(0, 10));
    const noteDialogVisible = ref(false);
    const noteText = ref('');
    const currentNoteIndex = ref(-1);
    const importFile = ref(null);
    const imagePreviewVisible = ref(false);
    const previewImageData = ref(null);
    const previewClip = ref(null);
    const isDarkMode = ref(true);
    const isWindowHidden = ref(false);
    const isHeaderHidden = ref(false); // 控制header的显示/隐藏状态
    const isAutoHideEnabled = ref(true); // 自动伸缩功能，默认开启
    let hideTimeout = null;
    let showTimeout = null;

    // 图片预览缩放和拖动相关
    const imageScale = ref(1);
    const imagePosition = ref({ x: 0, y: 0 });
    const isDragging = ref(false);
    const dragStart = ref({ x: 0, y: 0 });
    const positionStart = ref({ x: 0, y: 0 });

    // 计算属性
    const filteredClips = computed(() => {
      let result = clips.value;

      // 应用过滤器
      if (activeFilter.value === 'favorites') {
        result = result.filter(clip => clip.isFavorite);
      }

      // 应用日期筛选
      if (activeFilter.value === 'date' && dateFilter.value) {
        result = result.filter(clip => {
          const clipDate = new Date(clip.timestamp).toISOString().slice(0, 10);
          return clipDate === dateFilter.value;
        });
      }

      // 应用内容搜索
      if (activeFilter.value === 'content' && searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(clip => 
          clip.content.toLowerCase().includes(query)
        );
      }

      // 应用备注搜索
      if (noteSearchQuery.value) {
        const noteQuery = noteSearchQuery.value.toLowerCase();
        result = result.filter(clip =>
          clip.note && clip.note.toLowerCase().includes(noteQuery)
        );
      }

      return result;
    });

    const favoriteCount = computed(() => {
      return clips.value.filter(clip => clip.isFavorite).length;
    });

    // 检测并标记英文内容
    const formatContent = (content) => {
      // 使用正则表达式匹配英文单词
      return content.replace(/([a-zA-Z]+)/g, '<span class="english">$1</span>');
    };

    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '';

      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      // 如果是今天
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }

      // 如果是昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }

      // 如果是本周
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return weekdays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }

      // 其他情况显示完整日期
      return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    // 检测内容是否超过150px
    const checkContentOverflow = (content) => {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = '100%';
      tempDiv.style.maxHeight = '150px';
      tempDiv.style.overflow = 'hidden';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.wordBreak = 'break-word';
      tempDiv.style.padding = '12px';
      tempDiv.style.lineHeight = '1.5';
      tempDiv.style.fontSize = '16px';
      tempDiv.textContent = content;
      document.body.appendChild(tempDiv);
      const isOverflow = tempDiv.scrollHeight > 150;
      document.body.removeChild(tempDiv);
      return isOverflow;
    };

    // 页面加载时从主进程获取数据
    onMounted(async () => {
      // 设置窗口为置顶状态
      ipcRenderer.invoke('set-always-on-top', true);

      // 添加鼠标事件监听器
      document.addEventListener('mouseenter', handleMouseEnter);
      document.addEventListener('mouseleave', handleMouseLeave);
      
      try {
        const savedClips = await ipcRenderer.invoke('get-clips');
        if (savedClips) {
          clips.value = savedClips.map(clip => ({
            ...clip,
            expanded: clip.expanded || false,
            isOverflow: clip.isOverflow !== undefined ? clip.isOverflow : (clip.type === 'image' ? false : checkContentOverflow(clip.content)),
            type: clip.type || 'text',
            imageFilename: clip.imageFilename || null,
            imageData: null,
            showActions: false // 默认不显示操作按钮
          }));
          
          // 加载所有图片数据
          for (const clip of clips.value) {
            if (clip.type === 'image' && clip.imageFilename) {
              clip.imageData = await ipcRenderer.invoke('get-image', clip.imageFilename);
            }
          }
        }
      } catch (error) {
        console.error('获取剪切板数据失败:', error);
      }
      
      // 监听剪切板更新事件
      ipcRenderer.on('clipboard-update', async (event, data) => {
        // 检查是否已存在相同内容
        let exists;
        if (data.type === 'image' && data.imageFilename) {
          // 对于图片，使用imageFilename检查是否已存在
          exists = clips.value.some(clip => 
            clip.type === 'image' && clip.imageFilename === data.imageFilename
          );
        } else {
          // 对于文本，使用content检查是否已存在
          exists = clips.value.some(clip => clip.content === data.content);
        }
        
        if (!exists) {
          // 添加新记录
          const newClip = {
            content: data.content,
            timestamp: data.timestamp,
            isFavorite: false,
            expanded: false,
            isOverflow: data.type === 'image' ? false : checkContentOverflow(data.content),
            type: data.type || 'text',
            imageFilename: data.imageFilename || null,
            imageData: null,
            showActions: false // 默认不显示操作按钮
          };
          
          // 如果是图片，获取图片数据
          if (data.type === 'image' && data.imageFilename) {
            try {
              newClip.imageData = await ipcRenderer.invoke('get-image', data.imageFilename);
              if (!newClip.imageData) {
                console.error('获取图片数据失败:', data.imageFilename);
              }
            } catch (error) {
              console.error('获取图片数据失败:', error);
            }
          }
          
          clips.value.unshift(newClip);
          
          proxy.$message.success('检测到新的剪切板内容并已记录');
        }
      });
    });

    // 组件销毁前移除事件监听
    onBeforeUnmount(() => {
      ipcRenderer.removeAllListeners('clipboard-update');
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      
      // 清除定时器
      if (hideTimeout) clearTimeout(hideTimeout);
      if (showTimeout) clearTimeout(showTimeout);
    });

    // 切换监控状态
    const toggleMonitoring = () => {
      // Electron 中剪切板监控由主进程控制，这里只用于显示状态
      isMonitoring.value = !isMonitoring.value;
      if (isMonitoring.value) {
        proxy.$message.success('剪切板监控已启用');
      } else {
        proxy.$message.info('剪切板监控已禁用');
      }
    };

    // 复制内容到系统剪切板
    const copyToClipboard = (clip) => {
      // 如果是图片类型
      if (clip.type === 'image' && clip.imageData) {
        const { clipboard } = window.require('electron');
        const nativeImage = window.require('electron').nativeImage;
        const imageBuffer = Buffer.from(clip.imageData, 'base64');
        const image = nativeImage.createFromBuffer(imageBuffer);
        clipboard.writeImage(image);
        proxy.$message.success('图片已复制到剪切板');
        return;
      }
      
      // 文本类型
      const content = clip.content;
      // 创建一个临时的textarea元素
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);

      // 选中并复制
      textarea.select();
      document.execCommand('copy');

      // 移除临时元素
      document.body.removeChild(textarea);

      proxy.$message.success('已复制到剪切板');
    };

    // 删除剪切板记录
    const deleteClip = (index) => {
      // 需要找到在原始数组中的索引，而不是在过滤后的数组中
      const clipToDelete = filteredClips.value[index];
      const originalIndex = clips.value.findIndex(clip => 
        clip.content === clipToDelete.content && 
        clip.timestamp === clipToDelete.timestamp
      );

      if (originalIndex !== -1) {
        clips.value.splice(originalIndex, 1);
        saveToLocalStorage();
        proxy.$message.success('已删除记录');
      }
    };

    // 切换收藏状态
    const toggleFavorite = (index) => {
      // 需要找到在原始数组中的索引
      const clipToToggle = filteredClips.value[index];
      const originalIndex = clips.value.findIndex(clip => 
        clip.content === clipToToggle.content && 
        clip.timestamp === clipToToggle.timestamp
      );

      if (originalIndex !== -1) {
        clips.value[originalIndex].isFavorite = !clips.value[originalIndex].isFavorite;
        saveToLocalStorage();

        if (clips.value[originalIndex].isFavorite) {
          proxy.$message.success('已添加到收藏');
        } else {
          proxy.$message.info('已取消收藏');
        }
      }
    };

    // 清空所有剪切板记录
    const clearAllClips = () => {
      if (clips.value.length === 0) {
        proxy.$message.warning('没有可清空的记录');
        return;
      }

      if (confirm('确定要清空所有剪切板记录吗？此操作不可恢复。')) {
        clips.value = [];
        saveToLocalStorage();
        proxy.$message.success('已清空所有记录');
      }
    };

    // 导出剪切板数据
    const exportClips = () => {
      if (clips.value.length === 0) {
        proxy.$message.warning('没有可导出的数据');
        return;
      }

      const dataStr = JSON.stringify(clips.value, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `clipboard-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      proxy.$message.success('数据已导出');
    };

    // 导入剪切板数据
    const importClips = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedClips = JSON.parse(e.target.result);

          if (!Array.isArray(importedClips)) {
            throw new Error('无效的数据格式');
          }

          if (importedClips.length === 0) {
            proxy.$message.warning('导入的文件中没有数据');
            return;
          }

          // 合并导入的数据，避免重复
          let addedCount = 0;
          importedClips.forEach(clip => {
            // 确保导入的数据有所需的属性
            if (!clip.content) return;

            if (!clip.timestamp) {
              clip.timestamp = new Date().toISOString();
            }

            if (clip.isFavorite === undefined) {
              clip.isFavorite = false;
            }

            // 备注字段是可选的，如果没有则设为空字符串
            if (clip.note === undefined) {
              clip.note = '';
            }

            // 确保有expanded属性
            if (clip.expanded === undefined) {
              clip.expanded = false;
            }

            // 检测内容是否超过150px
            if (clip.isOverflow === undefined) {
              clip.isOverflow = checkContentOverflow(clip.content);
            }

            // 检查是否已存在
            const exists = clips.value.some(c => 
              c.content === clip.content
            );

            if (!exists) {
              clips.value.push(clip);
              addedCount++;
            }
          });

          if (addedCount > 0) {
            // 按时间戳排序，最新的在前面
            clips.value.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            saveToLocalStorage();
            proxy.$message.success(`成功导入 ${addedCount} 条记录`);
          } else {
            proxy.$message.info('导入的数据都已存在，没有添加新记录');
          }
        } catch (error) {
          console.error('导入失败:', error);
          proxy.$message.error('导入失败，请检查文件格式是否正确');
        }
      };

      reader.readAsText(file);
      // 清空input，以便可以再次选择同一个文件
      event.target.value = '';
    };

    // 触发文件选择对话框
    const triggerImport = () => {
      if (importFile.value) {
        importFile.value.click();
      }
    };

    // 保存数据到主进程
    const saveToLocalStorage = async () => {
      try {
        // 将响应式对象转换为普通对象，避免 IPC 克隆错误
        const plainClips = JSON.parse(JSON.stringify(clips.value));
        await ipcRenderer.invoke('save-clips', plainClips);
      } catch (error) {
        console.error('保存数据失败:', error);
        proxy.$message.error('保存数据失败');
      }
    };

    // 备注相关方法
    const showNoteDialog = (index) => {
      const clipToEdit = filteredClips.value[index];
      const originalIndex = clips.value.findIndex(clip =>
        clip.content === clipToEdit.content &&
        clip.timestamp === clipToEdit.timestamp
      );

      if (originalIndex !== -1) {
        currentNoteIndex.value = originalIndex;
        noteText.value = clips.value[originalIndex].note || '';
        noteDialogVisible.value = true;
      }
    };

    const closeNoteDialog = () => {
      noteDialogVisible.value = false;
      noteText.value = '';
      currentNoteIndex.value = -1;
    };

    const saveNote = () => {
      if (currentNoteIndex.value !== -1) {
        clips.value[currentNoteIndex.value].note = noteText.value.trim();
        saveToLocalStorage();
        closeNoteDialog();
        proxy.$message.success('备注已保存');
      }
    };

    // 显示图片预览
    const showImagePreview = (clip) => {
      if (clip.type === 'image' && clip.imageData) {
        previewImageData.value = clip.imageData;
        previewClip.value = clip;
        imagePreviewVisible.value = true;
      }
    };

    // 关闭图片预览
    const closeImagePreview = () => {
      imagePreviewVisible.value = false;
      previewImageData.value = null;
      previewClip.value = null;
      // 重置图片位置和缩放
      resetImagePosition();
    };

    // 复制预览图片
    const copyPreviewImage = () => {
      if (previewClip.value && previewClip.value.imageData) {
        const { clipboard } = window.require('electron');
        const nativeImage = window.require('electron').nativeImage;
        const imageBuffer = Buffer.from(previewClip.value.imageData, 'base64');
        const image = nativeImage.createFromBuffer(imageBuffer);
        clipboard.writeImage(image);
        proxy.$message.success('图片已复制到剪切板');
      }
    };

    // 重置图片位置和缩放
    const resetImagePosition = () => {
      imageScale.value = 1;
      imagePosition.value = { x: 0, y: 0 };
    };

    // 处理图片滚轮缩放
    const handleImageWheel = (event) => {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newScale = imageScale.value + delta;

      // 限制缩放范围 0.1 到 10
      if (newScale >= 0.1 && newScale <= 10) {
        imageScale.value = newScale;
      }
    };

    // 处理图片鼠标按下事件
    const handleImageMouseDown = (event) => {
      if (event.button === 0) { // 左键
        isDragging.value = true;
        dragStart.value = { x: event.clientX, y: event.clientY };
        positionStart.value = { ...imagePosition.value };

        // 添加全局鼠标事件
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    };

    // 处理鼠标移动
    const handleMouseMove = (event) => {
      if (isDragging.value) {
        const deltaX = event.clientX - dragStart.value.x;
        const deltaY = event.clientY - dragStart.value.y;

        imagePosition.value = {
          x: positionStart.value.x + deltaX,
          y: positionStart.value.y + deltaY
        };
      }
    };

    // 处理鼠标松开
    const handleMouseUp = () => {
      isDragging.value = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // 切换展开/收起状态
    const toggleExpand = (index) => {
      const clipToToggle = filteredClips.value[index];
      const originalIndex = clips.value.findIndex(clip =>
        clip.content === clipToToggle.content &&
        clip.timestamp === clipToToggle.timestamp
      );

      if (originalIndex !== -1) {
        clips.value[originalIndex].expanded = !clips.value[originalIndex].expanded;
        saveToLocalStorage();
      }
    };

    // 切换自动伸缩状态
    const toggleAutoHide = () => {
      isAutoHideEnabled.value = !isAutoHideEnabled.value;
      if (!isAutoHideEnabled.value) {
        proxy.$message.success('窗口已锁定，不会自动伸缩');
      } else {
        proxy.$message.info('窗口已解锁，将自动伸缩');
      }
    };

    // 切换深色模式
    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value;
      if (isDarkMode.value) {
        document.body.classList.add('dark-mode');
        proxy.$message.success('已切换到深色模式');
      } else {
        document.body.classList.remove('dark-mode');
        proxy.$message.info('已切换到浅色模式');
      }
    };

    // 切换header显示/隐藏状态
    const toggleHeader = () => {
      isHeaderHidden.value = !isHeaderHidden.value;
      if (isHeaderHidden.value) {
        proxy.$message.success('已隐藏顶部栏');
      } else {
        proxy.$message.success('已显示顶部栏');
      }
    };

    // 切换剪切板记录的操作按钮显示/隐藏
    const toggleClipActions = (index) => {
      const clipToToggle = filteredClips.value[index];
      if (!clipToToggle) return;
      
      const originalIndex = clips.value.findIndex(clip =>
        clip.content === clipToToggle.content &&
        clip.timestamp === clipToToggle.timestamp
      );

      if (originalIndex !== -1) {
        // 先关闭所有其他记录的操作按钮
        clips.value.forEach((clip, idx) => {
          if (idx !== originalIndex) {
            clip.showActions = false;
          }
        });
        // 切换当前记录的操作按钮状态
        clips.value[originalIndex].showActions = !clips.value[originalIndex].showActions;
      }
    };

    // 处理鼠标进入窗口
    const handleMouseEnter = () => {
      // 只有在自动伸缩功能启用时才处理
      if (!isAutoHideEnabled.value) return;

      // 清除隐藏定时器
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // 延迟显示窗口
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
      
      showTimeout = setTimeout(() => {
        if (isWindowHidden.value) {
          isWindowHidden.value = false;
          ipcRenderer.invoke('show-window');
        }
      }, 300);
    };

    // 处理鼠标离开窗口
    const handleMouseLeave = () => {
      // 只有在自动伸缩功能启用时才处理
      if (!isAutoHideEnabled.value) return;

      // 清除显示定时器
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      
      // 延迟隐藏窗口
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      
      hideTimeout = setTimeout(() => {
        if (!isWindowHidden.value) {
          isWindowHidden.value = true;
          ipcRenderer.invoke('hide-window');
        }
      }, 1000); // 1秒后隐藏
    };

    return {
      clips,
      isMonitoring,
      searchQuery,
      noteSearchQuery,
      activeFilter,
      dateFilter,
      noteDialogVisible,
      noteText,
      currentNoteIndex,
      filteredClips,
      favoriteCount,
      formatTime,
      formatContent,
      toggleMonitoring,
      copyToClipboard,
      deleteClip,
      toggleFavorite,
      clearAllClips,
      exportClips,
      importClips,
      importFile,
      triggerImport,
      showNoteDialog,
      closeNoteDialog,
      saveNote,
      toggleExpand,
      isAutoHideEnabled,
      toggleAutoHide,
      imagePreviewVisible,
      previewImageData,
      showImagePreview,
      closeImagePreview,
      copyPreviewImage,
      imageScale,
      imagePosition,
      isDragging,
      resetImagePosition,
      handleImageWheel,
      handleImageMouseDown,
      isDarkMode,
      toggleDarkMode,
      isWindowHidden,
      isHeaderHidden,
      toggleHeader,
      toggleClipActions,
      handleMouseEnter,
      handleMouseLeave
    };
  }
}
</script>

<style>
/* 深色模式样式 */
#app.dark-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #e0e0e0;
}

#app.dark-mode .container {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.95), rgba(22, 33, 62, 0.9));
}

#app.dark-mode .app-header {
  background: linear-gradient(90deg, rgba(103, 58, 183, 0.15) 0%, rgba(63, 81, 181, 0.1) 100%), url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="none" width="100" height="100"/><path d="M0,0 L100,100 M100,0 L0,100" stroke="rgba(103, 58, 183, 0.05)" stroke-width="1"/><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(103, 58, 183, 0.03)" stroke-width="1"/></svg>');
  border-bottom: 1px solid rgba(103, 58, 183, 0.2);
}

#app.dark-mode h1 {
  background: linear-gradient(90deg, #a78bfa 0%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

#app.dark-mode .icon {
  background: linear-gradient(90deg, #a78bfa 0%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

#app.dark-mode .clip-item {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.8), rgba(22, 33, 62, 0.7));
  border: 1px solid rgba(103, 58, 183, 0.15);
}

#app.dark-mode .clip-item:hover {
  box-shadow: 0 4px 12px rgba(103, 58, 183, 0.2);
}

#app.dark-mode .clip-content {
  background: rgba(30, 30, 46, 0.5);
  border: 1px solid rgba(103, 58, 183, 0.1);
  color: #e0e0e0;
}

#app.dark-mode .clip-content:hover {
  background: rgba(40, 40, 60, 0.6);
  box-shadow: inset 0 0 0 1px rgba(103, 58, 183, 0.3);
}

#app.dark-mode .clip-time {
  color: #9ca3af;
}

#app.dark-mode .search-input {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.8), rgba(22, 33, 62, 0.7));
  border: 1px solid rgba(103, 58, 183, 0.3);
  color: #e0e0e0;
}

#app.dark-mode .search-input:focus {
  background: linear-gradient(145deg, rgba(40, 40, 60, 0.9), rgba(30, 41, 70, 0.85));
}

#app.dark-mode .filter-tab {
  background: rgba(30, 30, 46, 0.6);
  color: #9ca3af;
  border: 1px solid rgba(103, 58, 183, 0.15);
}

#app.dark-mode .filter-tab.active {
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.25), rgba(63, 81, 181, 0.2));
  color: #a78bfa;
  border-color: rgba(103, 58, 183, 0.4);
}

#app.dark-mode .toggle-btn {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.8), rgba(22, 33, 62, 0.7));
  color: #9ca3af;
  border: 1px solid rgba(103, 58, 183, 0.15);
}

#app.dark-mode .toggle-btn.active {
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.25), rgba(63, 81, 181, 0.2));
  color: #a78bfa;
  border-color: rgba(103, 58, 183, 0.4);
}

#app.dark-mode .status-section {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.8), rgba(22, 33, 62, 0.7));
}

#app.dark-mode .action-btn {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.8), rgba(22, 33, 62, 0.7));
  border: 1px solid rgba(103, 58, 183, 0.15);
}

#app.dark-mode .action-btn:hover {
  background: linear-gradient(145deg, rgba(40, 40, 60, 0.9), rgba(30, 41, 70, 0.85));
}

#app.dark-mode .action-btn.dark-mode-btn.active {
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.25), rgba(63, 81, 181, 0.2));
  box-shadow: 0 2px 8px rgba(103, 58, 183, 0.4);
}

#app.dark-mode .dialog {
  background: linear-gradient(145deg, rgba(30, 30, 46, 0.95), rgba(22, 33, 62, 0.9));
  border: 1px solid rgba(103, 58, 183, 0.2);
}

#app.dark-mode .dialog-header {
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.1), rgba(63, 81, 181, 0.08));
  border-bottom: 1px solid rgba(103, 58, 183, 0.2);
}

#app.dark-mode .dialog-header h3 {
  color: #a78bfa;
}

#app.dark-mode .note-textarea {
  background: rgba(30, 30, 46, 0.5);
  border: 1px solid rgba(103, 58, 183, 0.2);
  color: #e0e0e0;
}

#app.dark-mode .note-textarea:focus {
  background: rgba(40, 40, 60, 0.6);
  border-color: rgba(103, 58, 183, 0.4);
}

#app.dark-mode .image-content {
  background: rgba(30, 30, 46, 0.5);
  border: 1px solid rgba(103, 58, 183, 0.1);
}



#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
  font-size: 18px;
  font-weight: 500;
  width: 100%;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  box-sizing: border-box;
}

/* 隐藏全局滚动条 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden !important;
}

::-webkit-scrollbar {
  width: 0px;
  background: transparent;
}

.background-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  filter: blur(40px);
}

.decoration-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #673AB7, #3F51B5);
  top: -150px;
  right: -100px;
  animation: float 20s infinite ease-in-out;
}

.decoration-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(45deg, #FF4081, #FF80AB);
  bottom: -200px;
  left: -200px;
  animation: float 15s infinite ease-in-out reverse;
}

.decoration-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(45deg, #00BCD4, #4DD0E1);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 25s infinite ease-in-out;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(30px, -30px) rotate(5deg);
  }
  66% {
    transform: translate(-20px, 20px) rotate(-5deg);
  }
}

.container {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.85) 100%);
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  overflow: hidden;
  border: none;
  backdrop-filter: blur(12px);
  max-width: 100%;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  /* 启用硬件加速 */
  transform: translateZ(0);
  will-change: transform;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding: 4px 12px;
  border-bottom: 1px solid rgba(103, 58, 183, 0.1);
  background: linear-gradient(90deg, rgba(103, 58, 183, 0.08) 0%, rgba(63, 81, 181, 0.05) 100%), url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="none" width="100" height="100"/><path d="M0,0 L100,100 M100,0 L0,100" stroke="rgba(103, 58, 183, 0.03)" stroke-width="1"/><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(103, 58, 183, 0.02)" stroke-width="1"/></svg>');
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(103, 58, 183, 0.05);
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 100px;
  opacity: 1;
  will-change: max-height, opacity, padding, margin;
}

.app-header.hidden {
  max-height: 0;
  opacity: 0;
  padding: 0 12px;
  margin-bottom: 0;
  border-bottom: none;
}

.show-header-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 100;
  background: transparent;
  color: rgba(103, 58, 183, 0.4);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.show-header-btn:hover {
  background: transparent;
  color: rgba(103, 58, 183, 0.6);
}

#app.dark-mode .show-header-btn {
  background: transparent;
  color: rgba(167, 139, 250, 0.4);
}

#app.dark-mode .show-header-btn:hover {
  background: transparent;
  color: rgba(167, 139, 250, 0.6);
}

h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(90deg, #673AB7 0%, #3F51B5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  text-shadow: 0 1px 5px rgba(103, 58, 183, 0.15);
  position: relative;
  letter-spacing: -0.5px;
}

.icon {
  margin-right: 6px;
  font-size: 20px;
  background: linear-gradient(90deg, #673AB7 0%, #3F51B5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 1px 2px rgba(103, 58, 183, 0.2));
}

@keyframes float-icon {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 240, 0.7));
  border: 1px solid rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  width: 28px;
  height: 28px;
  backdrop-filter: blur(5px);
  position: relative;
  overflow: hidden;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(240, 240, 240, 0.8));
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
}

.action-btn.pin-btn.active {
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.9), rgba(63, 81, 181, 0.8));
  color: white;
  box-shadow: 0 2px 8px rgba(103, 58, 183, 0.4);
}

.status-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  padding: 4px 12px;
  background: linear-gradient(145deg, rgba(248, 249, 250, 0.9), rgba(233, 236, 239, 0.8)), url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect fill="none" width="60" height="60"/><path d="M30 10 L37.5 22.5 L50 22.5 L40.5 31.5 L45 45 L30 37.5 L15 45 L19.5 31.5 L10 22.5 L22.5 22.5 Z" fill="rgba(103, 58, 183, 0.04)"/><circle cx="30" cy="30" r="25" fill="none" stroke="rgba(103, 58, 183, 0.03)" stroke-width="1"/></svg>');
  border-radius: 0;
  border: none;
  border-bottom: 1px solid rgba(103, 58, 183, 0.1);
  box-shadow: none;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 50px;
  opacity: 1;
  will-change: max-height, opacity, padding, margin;
}

.status-section.hidden {
  max-height: 0;
  opacity: 0;
  padding: 0 12px;
  margin-bottom: 0;
  border-bottom: none;
}

.status-indicator {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #6c757d;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff5252 0%, #d32f2f 100%);
  margin-right: 8px;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(211, 47, 47, 0.5);
  position: relative;
  display: inline-block;
}

.status-dot::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: inherit;
  filter: blur(3px);
  opacity: 0.7;
  z-index: -1;
}

.status-dot.active {
  background: radial-gradient(circle, #69f0ae 0%, #00c853 100%);
  box-shadow: 0 0 20px rgba(0, 200, 83, 0.7);
  animation: pulse 2s infinite;
}

.toggle-btn {
  background: linear-gradient(145deg, #4285f4, #3367d6);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
}

.toggle-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.toggle-btn:hover::before {
  left: 100%;
}

.toggle-btn.active {
  background: linear-gradient(145deg, #6c757d, #5a6268);
  box-shadow: 0 4px 15px rgba(108, 117, 125, 0.4);
}

.toggle-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.25);
}

.search-section {
  margin-bottom: 4px;
  padding: 0 12px;
}

.search-box {
  position: relative;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  padding: 6px 12px 6px 32px;
  border: 1px solid rgba(103, 58, 183, 0.2);
  border-radius: 16px;
  font-size: 12px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(248, 249, 250, 0.7));
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  letter-spacing: 0.3px;
}

.search-input:focus {
  outline: none;
  border-color: rgba(103, 58, 183, 0.5);
  box-shadow: 0 0 0 4px rgba(103, 58, 183, 0.15), 0 4px 20px rgba(0, 0, 0, 0.08);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.85));
  transform: translateY(-2px);
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 12px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 11px;
  color: #6c757d;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.filter-tab::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(103, 58, 183, 0.1), rgba(63, 81, 181, 0.1));
  transition: width 0.3s ease;
}

.filter-tab:hover::before {
  width: 100%;
}

.filter-tab.active {
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.15), rgba(63, 81, 181, 0.15));
  color: #673AB7;
  font-weight: 500;
  border-color: rgba(103, 58, 183, 0.3);
  box-shadow: 0 4px 12px rgba(103, 58, 183, 0.15);
}

.clip-list {
  margin-top: 2px;
  flex: 1;
  padding: 0 12px;
  /* 优化滚动性能 */
  overflow-y: auto;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(103, 58, 183, 0.3) transparent;
  /* 启用硬件加速 */
  transform: translateZ(0);
  will-change: scroll-position;
  /* 平滑滚动 */
  scroll-behavior: smooth;
}

/* 自定义滚动条样式 - Webkit浏览器 */
.clip-list::-webkit-scrollbar {
  width: 6px;
}

.clip-list::-webkit-scrollbar-track {
  background: transparent;
}

.clip-list::-webkit-scrollbar-thumb {
  background: rgba(103, 58, 183, 0.3);
  border-radius: 3px;
}

.clip-list::-webkit-scrollbar-thumb:hover {
  background: rgba(103, 58, 183, 0.5);
}

.clip-item {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 0;
  margin-bottom: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  /* 启用硬件加速 */
  transform: translateZ(0);
}

.clip-item::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(103, 58, 183, 0.05), rgba(63, 81, 181, 0.05));
  transition: width 0.2s ease;
  z-index: 0;
}

.clip-item:hover::before {
  width: 100%;
}

.clip-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.clip-item.show-actions {
  box-shadow: 0 4px 12px rgba(103, 58, 183, 0.15);
  border-color: rgba(103, 58, 183, 0.3);
}

.clip-item.favorite {
  border-left: 4px solid #FFC107;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 248, 225, 0.7));
}

.clip-item > * {
  position: relative;
  z-index: 1;
}

.clip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.clip-time {
  font-size: 12px;
  color: #868e96;
}

.favorite-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
}

.favorite-btn.active {
  color: #fab005;
}

.clip-content {
  flex: 1;
  margin-bottom: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow: hidden;
  line-height: 1.4;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.03);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  font-weight: 500;
  position: relative;
}

.clip-content .english {
  color: #7986CB;
}

.clip-content.expanded {
  max-height: none;
}

.image-content {
  max-height: none;
  padding: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 6px;
}

.clip-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.expand-hint {
  text-align: center;
  color: #673AB7;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.3s;
  opacity: 0.7;
}

.expand-hint:hover {
  opacity: 1;
  color: #3F51B5;
}

.clip-content.selectable {
  cursor: text;
  user-select: text;
}

.clip-content:hover {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(103, 58, 183, 0.2);
}

.clip-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.clip-item.show-actions .clip-actions {
  opacity: 1;
  max-height: 50px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.copy-btn, .delete-btn, .note-btn, .expand-btn {
  padding: 0;
  border: none;
  cursor: pointer;
  font-size: 14px;
  margin-left: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: transparent;
  box-shadow: none;
}

.expand-btn {
  background: transparent;
  color: #3F51B5;
  box-shadow: none;
  font-size: 14px;
  width: 32px;
  height: 32px;
  border: none;
}

.expand-btn:hover {
  transform: scale(1.1);
}

.expand-btn.active {
  transform: scale(1.1);
}

.copy-btn {
  background: linear-gradient(145deg, #e3f2fd, #bbdefb);
  color: #1565C0;
  box-shadow: 0 4px 8px rgba(21, 101, 192, 0.2);
}

.copy-btn:hover {
  transform: scale(1.1);
}

.delete-btn {
  background: linear-gradient(145deg, #ffebee, #ffcdd2);
  color: #C62828;
  box-shadow: 0 4px 8px rgba(198, 40, 40, 0.2);
}

.delete-btn:hover {
  transform: scale(1.1);
}

.empty-message {
  text-align: center;
  padding: 60px 0;
  color: #868e96;
  font-size: 16px;
  background: transparent;
  border-radius: 0;
  margin: 20px 0;
  box-shadow: none;
  position: relative;
  overflow: hidden;
}

.empty-message::before {
  content: "";
  display: block;
  width: 120px;
  height: 120px;
  margin: 0 auto 16px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="120" height="120"><path fill="rgba(103, 58, 183, 0.2)" d="M19 3H14.82C14.4 1.84 13.3 1 12 1C10.7 1 9.6 1.84 9.18 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M12 3C12.55 3 13 3.45 13 4C13 4.55 12.55 5 12 5C11.45 5 11 4.55 11 4C11 3.45 11.45 3 12 3M7 7H17V5H19V19H5V5H7V7Z"/></svg>');
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.7;
}

/* 日期筛选样式 */
.date-filter {
  margin-top: 12px;
}

.date-input {
  width: 200px;
  padding: 10px 15px;
  border: 1px solid rgba(103, 58, 183, 0.2);
  border-radius: 20px;
  font-size: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(248, 249, 250, 0.7));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.date-input:focus {
  outline: none;
  border-color: rgba(103, 58, 183, 0.5);
}

/* 备注筛选样式 */
.note-filter {
  margin-top: 12px;
}

.content-filter {
  margin-top: 12px;
}

.note-input {
  width: 200px;
  padding: 10px 15px;
  border: 1px solid rgba(103, 58, 183, 0.2);
  border-radius: 20px;
  font-size: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(248, 249, 250, 0.7));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.note-input:focus {
  outline: none;
  border-color: rgba(103, 58, 183, 0.5);
}

.content-input {
  width: 200px;
  padding: 10px 15px;
  border: 1px solid rgba(103, 58, 183, 0.2);
  border-radius: 20px;
  font-size: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(248, 249, 250, 0.7));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.content-input:focus {
  outline: none;
  border-color: rgba(103, 58, 183, 0.5);
}

/* 备注相关样式 */
.clip-note {
  display: flex;
  align-items: flex-start;
  margin: 8px 0;
  padding: 8px 12px;
  background: rgba(255, 248, 225, 0.5);
  border-radius: 8px;
  border-left: 3px solid #FFC107;
}

.note-icon {
  margin-right: 8px;
  font-size: 14px;
}

.note-text {
  font-size: 14px;
  color: #666;
  word-break: break-word;
  flex: 1;
}

.note-btn {
  background: linear-gradient(145deg, #fff8e1, #ffecb3);
  color: #FF8F00;
  box-shadow: 0 4px 8px rgba(255, 143, 0, 0.2);
}

.note-btn:hover {
  transform: scale(1.1);
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  /* 启用硬件加速 */
  transform: translateZ(0);
}

.dialog {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  /* 启用硬件加速 */
  transform: translateZ(0);
}

@keyframes dialog-appear {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: linear-gradient(145deg, rgba(103, 58, 183, 0.05), rgba(63, 81, 181, 0.03));
}

/* 图片预览对话框样式 */
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  transform: translateZ(0);
}

.image-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
}

.image-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.image-preview-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.image-preview-header .close-btn {
  background: rgba(255, 82, 82, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 82, 82, 0.3);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-header .close-btn:hover {
  background: rgba(255, 82, 82, 0.4);
  transform: rotate(90deg);
}

.image-preview-content {
  flex: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: transparent;
  position: relative;
  user-select: none;
}

.preview-image-wrapper {
  transition: transform 0.1s ease-out;
  transform-origin: center center;
  will-change: transform;
  max-width: 100%;
  max-height: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: block;
  pointer-events: none;
}



.dialog-header h3 {
  margin: 0;
  color: #673AB7;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

.dialog-content {
  padding: 20px;
}

.note-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(103, 58, 183, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.note-textarea:focus {
  outline: none;
  border-color: rgba(103, 58, 183, 0.5);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  gap: 10px;
}

.cancel-btn, .save-btn {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.cancel-btn {
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.save-btn {
  background: linear-gradient(145deg, #673AB7, #3F51B5);
  color: white;
  box-shadow: 0 2px 4px rgba(103, 58, 183, 0.3);
}

.save-btn:hover {
  background: linear-gradient(145deg, #5e35b1, #3949ab);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .container {
    width: calc(100% - 20px);
  }
}

@media (max-width: 768px) {
  #app {
    padding: 10px;
  }

  .container {
    padding: 16px;
    width: calc(100% - 20px);
  }

  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  h1 {
    font-size: 24px;
  }

  .status-section {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
