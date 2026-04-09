<template>
  <div v-if="visible" :class="['message', type]" class="fade-in">
    {{ text }}
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'MessageToast',
  setup() {
    const visible = ref(false);
    const text = ref('');
    const type = ref('info');
    let timer = null;

    const show = (options) => {
      if (typeof options === 'string') {
        text.value = options;
        type.value = 'info';
      } else {
        text.value = options.text;
        type.value = options.type || 'info';
      }

      visible.value = true;

      // 清除之前的定时器
      if (timer) {
        clearTimeout(timer);
      }

      // 设置新的定时器，3秒后自动关闭
      timer = setTimeout(() => {
        visible.value = false;
      }, 3000);
    };

    return {
      visible,
      text,
      type,
      show
    };
  }
}
</script>

<style scoped>
.message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  z-index: 1000;
  min-width: 200px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.message.info {
  background-color: #3498db;
}

.message.success {
  background-color: #2ecc71;
}

.message.warning {
  background-color: #f39c12;
}

.message.error {
  background-color: #e74c3c;
}

.fade-in {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
