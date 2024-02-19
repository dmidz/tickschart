# TicksChart

Modern Javascript Lib of interactive Chart with ticks ( TradingView like ).

![Chart preview!](/doc/img/chart-screenshot.png "Chart preview")

Provides a set of classe such `Chart` & `Fectcher`, so they can be used in vanilla JS, TS project or Vuejs or else,
by providing a dom NodeElement at Chart instanciation.

It is also decoupled from the data fetching, you provides a fetch function called with
start & end index. Checkout examples
on [`/demo/vanilla-ts/main.ts`](https://github.com/dmidz/tickschart/blob/develop/demo/vanilla-ts/main.ts)
or [the Vue example `/scr/Chart.vue`](https://github.com/dmidz/tickschart/blob/develop/src/Chart.vue).

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

The data comes from a unique file of real past 500 BTC H4 ticks used in loop for the dev ( this why you will see
gap at joins ) but it is very easy to plug it to a real API.

// TODO: online demo

## Usage

For initial test, before binding to your ticks API, you can download a copy of [this 500 ticks sample data file](https://github.com/dmidz/tickschart/blob/develop/public/data/ticks_BTC_4h/1692000000000.json)
into your local public directory such `~/my-project/public/data/1692000000000.json`

### Vanilla JS

Check and copy this example [demo/vanilla-js](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-js).

```javascript
//__ main.js
import { Chart, Fetcher, defaultTick, intervalsMs } from 'https://cdn.jsdelivr.net/npm/@dmidz/tickschart/+esm';

...
// ! adapt this path to your public sample path ( native fetch needs absolute URL )
const sampleTimeStart = 1692000000000;
const sampleTicksURL = `${ window.location.origin }/data/ticks_BTC_4h/${ sampleTimeStart }.json`;
...
```

Serve your public directory, you should see a chart with BTC H4 ticks.

### Vanilla TS

Install package

      npm install @dmidz/tickschart

Check and copy this example [demo/vanilla-ts](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-ts).

```typescript
//__ main.ts
import { Chart, Fetcher, defaultTick, intervalsMs, type CandleTick } from '@dmidz/tickschart';
...
// ! adapt this path to your public sample path ( native fetch needs absolute URL )
const sampleTimeStart = 1692000000000;
const sampleTicksURL = `${ window.location.origin }/data/ticks_BTC_4h/${ sampleTimeStart }.json`;
...
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

Compile ts file & serve the html page, you should see a chart with BTC H4 ticks.

Once running correctly, you can start customizing, for ex the fetch so it binds to your ticks API.

// TODO: provide demo/node-api example with Binance public market ticks API for ex
