
import type { Base } from './index';
export type ComputeFunc = ( index: number ) => number;

//______
export default class Computation<ComputeKey extends string> {
	
	constructor(
		private indicator: InstanceType<typeof Base>,
	){
	}
	
	sma( prop: ComputeKey, length: number = 3 ): ComputeFunc {
		if ( !length ){
			throw new Error( 'length must be != 0');
		}

		const sum = this.sum( prop, length );
		return ( index ) => sum( index ) / length;
	}

	sum( prop: ComputeKey, length: number = 3 ): ComputeFunc {
		if ( !length ){
			throw new Error( 'length must be != 0' );
		}
		
		return ( index ): number => {
			// console.log('sum', { index, length } );
			return this.indicator.eachTick( index, length,
				( value, i ) => value + this.indicator.computed( i, prop ) );
		};

		/*__ TODO: use a cache instead sumPrev ( param cacheOver ) which will cache res and use it for further calc
		*     then it needs cache cleanup... */

		// return ( tick: Tick, sumPrev?: number ): number => {
		// 	let res = 0;
		// 	const index = +tick[ this.tickIndex ];
		// 	// console.log('sum', { index, sumPrev } );
		// 	if( typeof sumPrev !== 'undefined' ){
		// 		const minus = this.getTick( index+this.tickStep );
		// 		const plus = this.getTick( index-this.tickStep*(length-1) );
		// 		res = sumPrev - ComputedFunc.asNumber( minus?.[ prop ] ) + ComputedFunc.asNumber( plus?.[ prop ] );
		// 	}else{
		// 		res = this.each( index, length, ( c, t ) => c + ComputedFunc.asNumber( t[ prop ] ) );
		// 	}
		//	
		// 	return res;
		// };
	}

	static asNumber( value?: any, _default = 0 ): number {
		return +value || _default;
	}
}

/*
	//__ math
	private avoidLoop( index: number, length: number, debug?: any ): boolean {
		if ( index < this.xMin - this.tickStep * length * 3 ){
			console.warn( 'Infinite Loop detected', index, new Date( index ).toUTCString(), debug );
			return true;
		}
		return false;
	}

	mult( tick: Tick, prop: keyof Comp, value: number = 1 ): number {
		return this.computedProp( tick[ this.options.tickKey ], prop ) * value;
	}

	sma( tick: Tick, prop: keyof Comp, length: number = 1 ): number{
		if ( !length ){
			console.warn( 'length must be > 0' );
			return 0;
		}
		
		// const cp = {
		// 	calc( tick: Tick ){
		// 		return this.sum( tick, prop, length ) / length;
		// 	}
		// }
		
		return this.sum( tick, prop, length ) / length;
	}

	sum( tick: Tick, prop: keyof Comp, length: number = 1 ): number {
		const index = tick[ this.options.tickKey ];
		const debug = true;//index < 1700197200000;//prop === 'sma';//index === 1697227200000;//1696795200000 || index === 1696809600000;
		const d = new Date( index ).toUTCString();
		const cacheKey = `sum${ prop as string }`;
		const cache = this.cacheGet( index, 0, this.cacheIntern ) || {};
		if ( typeof cache[ cacheKey ] !== 'undefined' ){		return cache[ cacheKey ];}
		if ( this.avoidLoop( index, length, prop ) ){	return 0;}
		// if ( this.noCompute ){		return this.computedProp( index, prop );}
		//__ compute = firstIndex || this.computeKeys.get( prop as keyof Computed)
		const isComputeKey = !!this.computeKeys.get( prop as keyof Computed );
		const noCompute = !(index === this.firstIndex );
		const prevIndex = index - this.tickStep;
		const prevCache = this.cacheGet( prevIndex, 0, this.cacheIntern ) || {};
		let prevSum: number = prevCache[ cacheKey ];
		debug && console.warn( `   sum`, prop, prevSum, index, d, { noCompute, isComputeKey } );
		const firstIndex = index - length * this.tickStep;
		const firstValue = this.computedProp( firstIndex, prop, 0, noCompute );
		if ( typeof prevSum === 'undefined' ){
			prevSum = firstValue;
			let current = firstIndex + this.tickStep;
			debug && console.log( '     //// prevSum start', prop, prevSum, index, d );
			while ( current < index ){
				// console.log( '   p', this.cacheGet( current, 0, this.cacheIntern )?.[ `sum${ k as string }` ] );
				prevSum += this.computedProp( current, prop, 0, noCompute );
				current += this.tickStep;
			}
			prevCache[ cacheKey ] = prevSum;
			this.cacheSet( prevIndex, prevCache, this.cacheIntern );
		}
		const res = prevSum - firstValue + this.computedProp( index, prop );
		debug && console.log( '     prevSum end', prop, prevSum, firstValue, res, index, d );
		cache[ cacheKey ] = res;
		this.cacheSet( index, cache, this.cacheIntern );
		return res;
	}
	
	ema( tick: Tick, prop: keyof Comp, length: number = 1 ): number {
		const index = tick[ this.options.tickKey ];
		const debug = index < 1700197200000;//prop === 'sma';//index === 1697227200000;//1696795200000 || index === 1696809600000;
		const d = new Date( index ).toUTCString();
		const cacheKey = `ema${ prop as string }`;
		const cache = this.cacheGet( index, 0, this.cacheIntern ) || {};
		if ( typeof cache[ cacheKey ] !== 'undefined' ){	return cache[ cacheKey ];}
		// if ( this.noCompute ){	return this.computedProp( index, prop );}
		// if ( this.avoidLoop( index, length, prop ) ){	return 0;}
		debug && this.debug( `   ema`, prop, index, d );
		// this.noCompute = index !== this.firstIndex;
		const prevIndex = index - this.tickStep;
		const prevCache = this.cacheGet( prevIndex, 0, this.cacheIntern ) || {};
		let prevEma = prevCache[ cacheKey ];
		const alpha = 2 / ( length + 1 );
		const inv = 1 - alpha;
		if( typeof prevEma === 'undefined' ){
			const firstIndex = index - length * this.tickStep;// - this.tickStep;
			prevEma = this.sma( tick, prop, length );
			let current = firstIndex + this.tickStep;
			while ( current < index ){
				prevEma = this.computedProp( current, prop ) * alpha + prevEma * inv;
				current += this.tickStep;
			}
			prevCache[ cacheKey ] = prevEma;
			this.cacheSet( prevIndex, prevCache, this.cacheIntern );
		}
		// this.noCompute = false;
		const res = this.computedProp( index, prop ) * alpha + prevEma * inv;
		cache[ cacheKey ] = res;
		this.cacheSet( index, cache, this.cacheIntern );
		return res;
	}

*/

//_________ test;
/*
const ticks: MyTick[] = [];
let i = 0;
while( i < 10 ){
	ticks.push({
		time: i++,
		volume: 10,
	});
}
console.log('ticks', ticks );
const cp = new Computation<MyTick>('time', 1, ( index ) => ticks[index] );
const sumFct = cp.sum( 'volume' )
const sum9 = sumFct( ticks[ticks.length-1]);
const sum8 = sumFct( ticks[ticks.length-2]/!*, sum9*!/ );
// const sma = cp.sma( 'volume' )( ticks[ticks.length-1]);

console.log('res', { sum9, sum8/!*, sma*!/ } );*/
