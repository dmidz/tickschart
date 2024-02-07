import { expect, test } from 'vitest';
import Computation from './Computation.ts';
import { defaultTick, type GetTick } from '../index';

type Tick = {
	vol: number;
	// high: number,
}

type CK = KeyOfString<Tick>;

const tickStep = 1;
const ticks: Tick[] = [];
for(let i = 1; i <= 10; i++ ){
	ticks.push( { vol: i*10 });
}
console.log('ticks', ticks );

const getTick: GetTick<Tick> = ( _index: number ) => ticks[ _index ] || defaultTick;

function computed ( index: number, prop: CK, delta = 0 ): number {
	const _index = index - delta * tickStep;
	const tick = getTick( _index );
	return Computation.asNumber( tick[ prop as keyof Tick ] );
}

const computation = new Computation( 1, computed )

test( 'Sum', () => {
	const sum = computation.sum( 'vol', 3 );
	const sum4 = sum( 4 );
	expect( sum4 ).toBe( 50+40+30 );
	const sum5 = sum( 5 );
	expect( sum5 ).toBe( 60+50+40 );
	//__ sum with passed previous value ( less calc ) should match sum without previous value
	const sumPrev = sum( 5, sum4 );
	expect( sumPrev ).toBe( sum5 );
} );
