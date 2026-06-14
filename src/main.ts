import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';
import TDesignChat from '@tdesign-vue-next/chat';
import App from './App.vue';

import 'tdesign-vue-next/es/style/index.css';
import '@tdesign-vue-next/chat/es/style/index.css';

createApp(App).use(TDesign).use(TDesignChat).mount('#app');
