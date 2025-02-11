export * from './Base.ts';
import Base from './Base.ts';
export { Base };

import MA from './MA.ts';
import Volume from './Volume.ts';
import VolumeImpulse from './VolumeImpulse.ts';
import OBV from './OBV.ts';

const list = {
	MA,
	Volume,
	VolumeImpulse,
	OBV,
} as const;

export { list };
export type List = typeof list;
