import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target:'http://127.0.0.1:8788',
        changeOrigin:true,
        configure(proxy) {
          // This development-only proxy permits just our own Vite origin.
          proxy.on('proxyReq',(proxyReq,request)=>{
            if(request.headers.origin === 'http://127.0.0.1:4174') proxyReq.setHeader('Origin','http://127.0.0.1:8788');
          });
        }
      }
    }
  }
});
