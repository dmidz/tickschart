
export type ComputeFunc = ( index: number, prevValue?: number ) => number;

//______
export default class Computation<ComputeKey extends string> {
	
	constructor(
		private tickStep: number,
		private computed: ( index: number, prop: ComputeKey, delta?: number ) => number,
	){
	}
	
	setTickStep( tickStep: number ){
		this.tickStep = tickStep;
	}

	ema( prop: ComputeKey, length: number = 3, debug = false ): ComputeFunc {
		if ( length <= 0 ){
			throw new Error( 'length must be > 0' );
		}
		
		const alpha = 2 / ( length + 1 );
		// const inv = 1 - alpha;
		const sma = this.sma( prop, length, debug );

		const ema = ( index: number, prevValue: number | undefined ) => {
			let prevEma = prevValue as unknown as number;
			if( typeof prevEma === 'undefined' ){
				// prevEma = sma( index - this.tickStep );
				let k = index - this.tickStep * length * 2;
				prevEma = sma( k );
				while( k < index ){
					k += this.tickStep;
					prevEma = ema( k, prevEma );
				}
			}
			return (this.computed( index, prop ) - prevEma) * alpha + prevEma;
			// return this.computed( index, prop ) * alpha + prevEma * inv;
		};
		return ema;
	}

	sma( prop: ComputeKey, length: number = 3, debug = false ): ComputeFunc {
		if ( length <= 0 ){
			throw new Error( 'length must be > 0');
		}

		const sum = this.sum( prop, length, debug );

		return ( index, prevValue ) => {
			let res: number;
			if( typeof prevValue === 'undefined'){
				res = sum( index ) / length;
			}else{
				res = ( prevValue * length - this.computed( index, prop, length ) + this.computed( index, prop ) ) / length;
			}
			return res;
		}
	}

	sum( prop: ComputeKey, length: number = 3, debug = false ): ComputeFunc {
		if ( length <= 0 ){
			throw new Error( 'length must be > 0' );
		}
		
		return ( index, prevValue ): number => {
			let res: number;
			if ( typeof prevValue === 'undefined' ){
				res = this.reduce( index, length, ( value, i ) => value + this.computed( i, prop ) );
			}else{
				res = prevValue - this.computed( index, prop, length ) + this.computed( index, prop );
			}
			return res;
		};
	}

	reduce ( from: number, length: number, op: ( v: number, i: number ) => number, initial = 0 ): number{
		let res = initial;
		let i = -Math.abs( length );
		while ( i++ < 0 ){
			res = op( res, from + i * this.tickStep );
		}
		return res;
	}

	static asNumber( value?: any, _default = 0 ): number {
		return +value || _default;
	}
}

