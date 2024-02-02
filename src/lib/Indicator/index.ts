import type Base from './Base.ts';
import Volume, { type Options as VolumeOptions } from './Volume.ts';
// import VolumeImpulse, { type Options as VolumeImpulseOptions } from './VolumeImpulse';

const indicators = {
	Volume,
	// VolumeImpulse,
} as const;

export default indicators;
export type List = typeof indicators;

export type Indicator = InstanceType<List[keyof List]>;
// export type Indicator = InstanceType<typeof Base>;

type Options = {
	Volume: VolumeOptions,
	// VolumeImpulse: VolumeImpulseOptions,
}

export type IOptions<T extends keyof List> = Partial<Options[T]>;
export type { Base };
