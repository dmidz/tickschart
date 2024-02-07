# TicksChart

Modern Javascript Lib of interactive Chart with ticks ( TradingView like ).

![Chart preview!](/doc/img/chart-screenshot.png "Chart preview")

Provides a set of classe such `Chart.ts` & `Fectcher.ts`, so they can be used in vanilla project or Vuejs or else,
by providing a dom NodeElement at Chart instanciation.

It is also decoupled from the data fetching, you provides a fetch function called with
start & end index. Checkout examples on `/scr/Chart.vue` or `/demo` directory.

## Features
- Efficient horizontablly scrollable chart drawn with HTML Canvas
- Resizable scales to zoom in / out
- Crosshair displaying current ticks infos
- Indicators system easy to expand ( only under chart for now, soon on chart )
- Fetcher helper to easily connect to an API
- many more to come :)

## Preview or Dev base
// TODO: online demo

This repo is based on Vite, a great environment for smooth JS dev, just clone
this repo and run:

      npm install
      npm run dev
 
You should be immediately able to browse the provided local address such `http://localhost:5173/` and see the Chart in action.

The data comes from a unique file of real past 500 BTC H4 ticks used in loop for the dev ( this why you will see 
 gap at joins ) but it is very easy to plug it to a real API.

## Installation ( as 3rd party )
Install package

      npm install @dmidz/tickschart

## Usage
### Vanilla TS
You can check and copy this example [demo/vanilla-ts](https://github.com/dmidz/tickschart/tree/develop/demo/vanilla-ts).

Also download a copy of [the sample data file](https://github.com/dmidz/tickschart/blob/develop/public/data/ticks_BTC_4h/1692000000000.json)
into your local public directory such `/my-project/public/data/1692000000000.json`

      //_ main.ts
      // update first line source of import to:
      import { Chart, Fetcher, defaultTick, intervalsMs, type CandleTick } from '@dmidz/tickschart';
      ...
      // update this line with your local public sample data URL:
      const sampleTicksURL = `${ window.location.origin }/data/1692000000000.json`;

Serve the html page, you should see a chart with BTC H4 ticks.

Once running correctly, you can customize the fetch so it binds to your ticks API.


### Vanilla JS
( Same than Vanilla TS, use js file and remove TS parts )

// TODO: demo/vanilla-js


