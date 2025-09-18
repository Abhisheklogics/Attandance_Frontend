
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  
  const env = loadEnv(mode, process.cwd(), "");
  const baseURL = env.VITE_APP_BASE_URL; 
  console.log("Using Backend uRL:", baseURL);

  return {
    plugins: [tailwindcss(), react()],
    server: {
      proxy: {
        "/api": {
          target: baseURL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
