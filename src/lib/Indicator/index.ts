import type Base from './Base.ts';
import { type Settings } from './Base.ts';
import MA from './MA.ts';
import Volume from './Volume.ts';
import VolumeImpulse from './VolumeImpulse.ts';
import OBV from './OBV.ts';

const indicators = {
	MA,
	Volume,
	VolumeImpulse,
	OBV,
} as const;

export default indicators;
export type List = typeof indicators;

export type Indicator = InstanceType<List[keyof List]>;

export type { Base, Settings };
