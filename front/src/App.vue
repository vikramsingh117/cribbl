<template>
  <div id="app">
    <TelegramAuth />
  </div>
</template>

<script>
import TelegramAuth from './components/TelegramAuth.vue';
import './style.css';

export default {
  name: 'App',
  components: {
    TelegramAuth
  }
};
</script>
