# TicksChart

Modern Javascript Lib of interactive Chart with ticks ( TradingView like ).

![Chart preview!](/doc/img/chart-screenshot.png "Chart preview")

Provides a set of classe such `Chart` & `Fectcher`, so they can be used in vanilla JS, TS project or Vuejs or else,
by providing a dom NodeElement at Chart instanciation.

You can check out the demo here: https://dmidz.github.io/tickschart/

## Features

- Efficient horizontally scrollable chart drawn with HTML Canvas
- Resizable scales to zoom in / out
- Crosshair displaying current ticks infos
- Indicators system easy to expand
- decoupled data Fetcher helper to easily connect to an API
- many more to come :)

## Quick preview / Dev environment

This repo is based on [Vite, a wonderful environment for smooth JS dev](https://vitejs.dev/), just clone this current
derived repo and run:

      npm install
      npm run dev

You should be able to browse the provided local address such `http://localhost:5173/` and see the Chart in action.

The data comes from a unique file of real past 1000 BTC H4 ticks used in loop for the dev ( this why you will see
gap at joins ) but it is very easy to plug it to a real API.

## Usage
- Before bind to your ticks API, you can download a copy of [this 1000 ticks sample data file](https://github.com/dmidz/tickschart/blob/develop/public/data/ticks_BTC_4h/1684800000000-1000.json)
into your local public directory such `~/my-project/public/data/1684800000000-1000.json`
- Assets ( css & svg icons ) are not part of the published lib ( yet ), you
  can [download it here](https://github.com/dmidz/tickschart/tree/develop/public/tickschart/assets) to your local public directory
( and override it in your own css )

### Vanilla JS

Check and copy this example [demo/vanilla-js](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-js).

```javascript
//__ main.js
import { Chart, Fetcher, defaultTick, intervalsMs } from 'https://cdn.jsdelivr.net/npm/@dmidz/tickschart/+esm';

//...
// ! adapt this path to your public sample path
const sampleTimeStart = 1684800000000;
const ticksPerLoad = 1000;// must match the ticks count per fetch
const sampleTicksURL = `/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`;
//...
const fetcher = new Fetcher( defaultTick, fetchAPI, options );

const chart = new Chart( parentElement, tickStep, getTick, options );

// add a Volume indicator in 'row' mode ( stacked under main chart )
chart.addIndicator( 'Volume', 'row', { maProperty: 'vol', maLength: 14, maType: 'sma' } );
// add an MA indicators in 'layer' mode ( on chart )
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 200, type: 'sma', style: { color: '#ff0000' } } );

// finally init display at the time you wish, originRatio is the displacement of time wanted along the screen width
// ex: time now + .75 will scroll to place now time at 3/4 screen width from left
// ex: time now + 0 will scroll to place now time at screen left
chart.setX( Date.now(), { xOriginRatio } );
```

Serve your public directory, you should see a chart with BTC H4 ticks.

### Vanilla TS

Install package

      npm install @dmidz/tickschart

Check and copy this example [demo/vanilla-ts](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-ts).

```typescript
//__ main.ts
import { Chart, Fetcher, defaultTick, intervalsMs } from '@dmidz/tickschart';
// ...
// ! adapt this path to your public sample path
const sampleTimeStart = 1684800000000;
const ticksPerLoad = 1000;// must match the ticks count per fetch
const sampleTicksURL = `/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`;
// ...

```

Compile ts file & serve the html page, you should see a chart with BTC H4 ticks.

Once running correctly, you can start customizing, for ex the fetch so it binds to your ticks API.

// TODO: provide demo/node-api example with Binance public market ticks API for ex
