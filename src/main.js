import { createApp } from 'vue'
import App from './App.vue'
import MessageToast from './components/message.vue'

// 创建应用实例
const app = createApp(App)

// 创建消息组件实例
let messageInstance = null;
const createMessageInstance = () => {
  if (!messageInstance) {
    const mountNode = document.createElement('div')
    document.body.appendChild(mountNode)
    messageInstance = createApp(MessageToast).mount(mountNode)
  }
  return messageInstance
}

// 添加全局消息方法
app.config.globalProperties.$message = {
  info(text) {
    createMessageInstance().show({ text, type: 'info' })
  },
  success(text) {
    createMessageInstance().show({ text, type: 'success' })
  },
  warning(text) {
    createMessageInstance().show({ text, type: 'warning' })
  },
  error(text) {
    createMessageInstance().show({ text, type: 'error' })
  }
}

// 挂载应用
app.mount('#app')
