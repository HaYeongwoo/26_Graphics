import { defineConfig } from 'vite';

// base: './' 로 두면 dev 서버와 build 결과(상대경로) 모두에서 동작한다.
export default defineConfig({
  base: './',
  server: { open: true, port: 5173 },
});
