/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

const res = ( path: string ) => resolve( __dirname, path );

// https://vitejs.dev/config/
export default defineConfig( ( { command, mode } ) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv( mode, process.cwd()/*, ''*/ );

  const base = env.VITE_API_BASE || 'http://localhost';
  const apiURL = new URL( base );

  return {
    resolve: {
      alias: {
        '@': res( 'src' ),
        '@dmidz/tickschart': res( 'dist' ),// trick to compile demo/vanilla-ts using real world package path
        '@public': res( 'public/tickschart' ),
      },
      // preserveSymlinks: true,
    },
    plugins: [
      vue(),
      dts( {// gently generates *.d.ts files at build :)
        pathsToAliases: false,
        rollupTypes: true,
        include: [ 'src/lib/**/*.ts', 'src/types.d.ts' ],
      } ),
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
    test: {
      environment: 'happy-dom',
    },
    server: {
      host: apiURL.hostname,
      proxy: {
        '/api': {
          target: base,
          changeOrigin: true,
          rewrite: ( path ) => path.replace( /^\/api/, '' ),
          secure: false,
          // configure: ( proxy, _options ) => {
            //   proxy.on( 'error', ( err, _req, _res ) => {
            //     console.log( 'proxy error', err );
            //   } );
            //   proxy.on( 'proxyReq', ( proxyReq, req, _res ) => {
            //     console.log( 'Sending Request to the Target:', req.method, req.url );
            //   } );
            //   proxy.on( 'proxyRes', ( proxyRes, req, _res ) => {
            //     console.log( 'Received Response from the Target:', { ur: req.url, headers: proxyRes.headers } );
            //   } );
          // },
        },
        // '/socket.io': {
        //   target: base,
        //   changeOrigin: true,
        //   ws: true
        // },
      }
    },
    // optimizeDeps: {
    //   esbuildOptions: {
    //     tsconfig: 'tsconfig.json'
    //   }
    // },
  }
} )
;
  