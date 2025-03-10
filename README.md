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

You should be able to browse the provided local address such `http://localhost:5174/` and watch the Chart ( vuejs version ) in action.

The data comes from a unique file of real past 1000 BTC H4 ticks used in loop for the dev ( this is why you will see
gap at joins ) but it is very easy to plug it to a real API.

## Usage

### Vanilla JS

Check and copy this example [demo/vanilla-js](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-js).

```javascript
//__ main.js
import { Chart, Fetcher, defaultTick, intervalsMs } from 'https://cdn.jsdelivr.net/npm/@dmidz/tickschart@1/+esm';
//...
// ! adapt this path to your public sample path or API url
const ticksURL = `https://dmidz.github.io/tickschart/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`;
//...
const fetcher = new Fetcher( defaultTick, fetchAPI, options );

const chart = new Chart( parentElement, tickStep, getTick, options );

//__ add some indicators
chart.addIndicator( new indicator.list.Volume( { maLength: 14, maType: 'ema' } ) );
chart.addIndicator( new indicator.list.MA( { ma2: { length: 200, style: { color: '#ff0000' } } } ) );

// finally init display at the time you wish, originRatio is the displacement of time wanted along the screen width
// ex: time now + .75 will scroll to place now time at 3/4 screen width from left
// ex: time now + 0 will scroll to place now time at screen left
chart.setX( Date.now(), { xOriginRatio } );
```

Serve your public directory or run:

      npm run dev

Navigate to `http://localhost:5174/demo/vanilla-js/index.html`

### Vanilla TS

Install package

      npm install @dmidz/tickschart

Check and copy this example [demo/vanilla-ts](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-ts).

```typescript
//__ main.ts
import { Chart, Fetcher, defaultTick, intervalsMs } from '@dmidz/tickschart';
// ...
// ! adapt this path to your public sample path or API url
const ticksURL = `https://dmidz.github.io/tickschart/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`;
// ...

```

Compile ts file & serve the html page, you should see a chart with BTC H4 ticks. Or run:

      npm run dev

and navigate to `http://localhost:5174/demo/vanilla-ts/index.html`

### API binding

Once running correctly, you can start customizing, for ex the fetch so it binds to your ticks API.

Create an .env file at project root and define these used variables:
```
# if set, will run in API mode ( instead json sample file mode )
VITE_API_BASE=http://localhost:3000
# optional: this will be added to API ticks request.query.token
VITE_API_TOKEN="some-long-pwd-to-easily-pass-your-api-protection"
```
Checkout src/Chart.vue sample to fully understand how to bind to your
API and customize your ticks full URL.