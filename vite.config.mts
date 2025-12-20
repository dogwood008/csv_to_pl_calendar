import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  root: "public",
  base: "./",
  publicDir: false,
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "data/dummy_kabucom.csv",
          dest: "data",
        },
      ],
      watch: {
        reloadPageOnChange: true,
      },
    }),
  ],
  server: {
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
