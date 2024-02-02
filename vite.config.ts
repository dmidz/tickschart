import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

const res = ( path: string ) => resolve( __dirname, path );

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve( __dirname, 'src' ),
    }
  },
  plugins: [
    vue(),
    dts({// gently generates *.d.ts files at build :)
      pathsToAliases: false,
      rollupTypes: true,
      include: [ 'src/lib/**/*.ts', 'src/types.d.ts' ],
    }),
  ],
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
        index: res( 'src/lib/index.ts' ),
      },
      name: 'TicksChart',
      formats: [ 'es' ],
      // fileName: 'tickschart',
    },
    rollupOptions: {
      external: [ 'vue' ],// make sure to externalize deps that shouldn't be bundled into your library
      output: {
        globals: {// Provide global variables to use in the UMD build for externalized deps
          vue: 'Vue',
        },
      },
    },
  },
});
  