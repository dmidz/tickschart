import type Base from './Base.ts';
import Volume from './Volume.ts';
import MA from './MA.ts';

const indicators = {
	Volume,
	MA,
} as const;

export default indicators;
export type List = typeof indicators;

export type Indicator = InstanceType<List[keyof List]>;

export type { Base };
