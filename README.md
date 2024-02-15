# TicksChart

Modern Javascript Lib of interactive Chart with ticks ( TradingView like ).

![Chart preview!](/doc/img/chart-screenshot.png "Chart preview")

Provides a set of classe such `Chart.ts` & `Fectcher.ts`, so they can be used in vanilla project or Vuejs or else,
by providing a dom NodeElement at Chart instanciation.

It is also decoupled from the data fetching, you provides a fetch function called with
start & end index. Checkout examples on [`/demo/vanilla-ts/main.ts`](https://github.com/dmidz/tickschart/blob/develop/demo/vanilla-ts/main.ts)
 or [the Vue example `/scr/Chart.vue`](https://github.com/dmidz/tickschart/blob/develop/src/Chart.vue).

## Features
- Efficient horizontally scrollable chart drawn with HTML Canvas
- Resizable scales to zoom in / out
- Crosshair displaying current ticks infos
- Indicators system easy to expand
- Fetcher helper to easily connect to an API
- many more to come :)

## Quick preview / Dev environment
This repo is based on [Vite, a wonderful environment for smooth JS dev](https://vitejs.dev/), you just clone
this current derived repo and run:

      npm install
      npm run dev
 
You should be immediately able to browse the provided local address such `http://localhost:5173/` and see the Chart in action.

The data comes from a unique file of real past 500 BTC H4 ticks used in loop for the dev ( this why you will see 
 gap at joins ) but it is very easy to plug it to a real API.

// TODO: online demo

## Installation ( as 3rd party )
Install package

      npm install @dmidz/tickschart

## Usage
### Vanilla TS
Check and copy this example [demo/vanilla-ts](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-ts).

Also download a copy of [the 500 ticks sample data file](https://github.com/dmidz/tickschart/blob/develop/public/data/ticks_BTC_4h/1692000000000.json)
into your local public directory such `~/my-project/public/data/1692000000000.json`

Create a simple html file with a #chart div
```html
<!doctype html>
<html lang="en">
<head>
 <meta charset="UTF-8"/>
 <!-- this browser icon is just a minimal 1x1px transparent image -->
 <link rel="icon" type="image/svg+xml" href="data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="/>
 <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
 <title>Ticks Chart Vue Example</title>
</head>
<body>
<div id="app">
 <div id="chart"></div>
</div>
<script type="module" src="main.ts"></script>
</body>
</html>

```
Ensure to have minimal style so your #app takes full available space like:

```css
html, body, #app {
 height: 100%;
}

body {
 display: flex;
 flex-direction: column;
 overflow-x: hidden;
 margin: 0;
 justify-content: flex-start;
 align-items: stretch;
}

* {
 box-sizing: border-box;
}

#app {
 flex: 1 1;
 display: flex;
 flex-direction: column;
 justify-content: flex-start;
 align-items: stretch;
}

#chart {
 flex: 1 1;
 background-color: #191919;
 border: 1px solid #333333;
 color: #cccccc;
 display: flex;
 flex-direction: column;
 overflow: hidden;
 position: relative;
}
/*...*/
```


Then the main.ts file:

```typescript
//_ main.ts
//##### update first line source of import to:
import { Chart, Fetcher, defaultTick, intervalsMs, type CandleTick } from '@dmidz/tickschart';
import './style.css';

//__
//##### update this line with your local public sample data URL:
const sampleTicksURL = `${ window.location.origin }/data/1692000000000.json`;
const { m1, h1, d1 } = intervalsMs;
type DataTick = Record<string, CandleTick>;

//__ settings
let sampleTicks: DataTick | null = null;
const timeScaleMs = h1 * 4;
const ticksPerLoad = 500;
const rangeLoadMs = ticksPerLoad * timeScaleMs;
const xOriginRatio = .75;
const currentTime = new Date( Date.UTC( 2023, 9, 10 ) );

//__
// instanciate a fetcher helper which role is to fetch ticks from your api with time range
// providing a getTick( time ) & getMapTicks( time )
const fetcher = new Fetcher<CandleTick, DataTick>( defaultTick, async ( startTime, limit ) => {

 /*__ this example uses a unique local json file ( 500 ticks ) served in dev mode, replace this by an API call
  with passed params such startTime & limit + other such symbol & timeScale string ( 15m / 4h / d1... ) */

 if ( sampleTicks ){
  return sampleTicks;
 }

 const url = new URL( sampleTicksURL );

 url.search = new URLSearchParams( {// sample of params for API, useless here with local json fetch 
  symbol: 'BTCUSDT',
  interval: '4h',// if API requires interval as a string choice, of course it must corresponds to timeScaleMs value
  startTime: `${ startTime }`,
  limit: `${ limit }`,
 } ).toString();

 const response = await fetch( new Request( url, { method: 'GET' } ) );

 if ( response.ok ){
  try {
   sampleTicks = await response.json();
  } catch ( err ){
   console.error( err );
  }
 }
 return sampleTicks;
}, {
 timeScaleMs,
 ticksPerLoad,
 prefetchMargin: 1,
 cacheSize: 2,
 onLoad: ( time, mightRefresh ) => {
  //__ refresh when new loaded so long indicators ( ex: ma 200 ) have their data progressively without waiting whole loaded
  if ( mightRefresh ){
   chart.refresh();
  }
 },
 // debug: true,
} );

//__
const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, {
 timeZone: 'UTC',
 weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );

const chart = new Chart( document.getElementById( 'chart' ), timeScaleMs, ( index: number ) => {
 /*__ one would normally pass fetcher.getTick directly, but for the only one file sample
			 we can bypass it to always return a tick from the file ( 1692000000000 ) time range */
 return fetcher.getMapTicks( index )?.[ 1692000000000 + index % rangeLoadMs ] || defaultTick;
}, {
 onScalingXChange: async ( scalingX ) => {
  // if ( !init ){ return;}//__ avoid any fetch during initialization
  const fetches = fetcher.fetchTicks( scalingX.scaleIn.min, scalingX.scaleIn.max );
  return Promise.all( fetches );
 },
 crossHairLabelX: ( value ) => {
  const d = new Date( value );
  return `${ dateFormatCrossHair.format( d ) } (UTC)`;
 },
 uiScaleX: {
  stepsRange: [ m1, m1 * 5, m1 * 10, m1 * 15, m1 * 30, h1, h1 * 1.5, h1 * 3, h1 * 6, h1 * 12, d1 ],
  formatLabel: ( value: number ): string => {
   const d = new Date( value );
   if ( !( value % d1 ) ){
    return `${ d.getUTCDate() }`;
   }
   return `${ d.getUTCHours() }:${ `${ d.getUTCMinutes() }`.padStart( 2, '0' ) }`;
  },
 },
 scaleY: {
  precisionIn: .001,//__ might be set from current symbol properties
 },
 autoScaleY: true,
} );

// add one Volume indicator in 'row' mode ( stacked under main chart )
chart.addIndicator( 'Volume', 'row', { maProperty: 'vol', maLength: 14, maType: 'sma' } );
// add 3 MA indicators with different settings in 'layer' mode ( on chart )
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 200, type: 'sma', style: { color: '#ff0000' } } );
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 100, type: 'sma', style: { color: '#ffff00' } } );
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 50, type: 'sma' } );
//    Only 2 types of Indicator ( Volume & MA ) for now, but many more to come, very easy to extend !

// finally init display at the time you wish, originRatio is the displacement of time wanted along the screen width
// ex: time now + .75 will scroll to place now time at 3/4 screen width from left
// ex: time now + 0 will scroll to place now time at screen left
chart.setX( currentTime.getTime(), { render: true, xOriginRatio } );

```

Compile ts file & serve the html page, you should see a chart with BTC H4 ticks.

Once running correctly, you can start customizing, for ex the fetch so it binds to your ticks API.

// TODO: provide demo/node-api example with Binance public market ticks API for ex


### Vanilla JS

Check and copy this example [demo/vanilla-js](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-js).

Also download a copy of [the 500 ticks sample data file](https://github.com/dmidz/tickschart/blob/develop/public/data/ticks_BTC_4h/1692000000000.json)
into your local public directory such `~/my-project/public/data/1692000000000.json`

Serve the html page, you should see a chart with BTC H4 ticks.