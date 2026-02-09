import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const erpTarget = env.VITE_ERP_TARGET ||"https://erp.qcstyro.com"; //"http://qc-styro.local:8000";// 

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/erp": {
          target: erpTarget,
          changeOrigin: true,
          secure: erpTarget.startsWith("https"),
          rewrite: (path) => path.replace(/^\/erp/, ""),
        },
      },
    },
    plugins: [
      react()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
