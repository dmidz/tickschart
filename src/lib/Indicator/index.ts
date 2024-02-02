import type Base from './Base.ts';
import Volume, { type Options as VolumeOptions } from './Volume.ts';

const indicators = {
	Volume,
} as const;

export default indicators;
export type List = typeof indicators;

export type Indicator = InstanceType<List[keyof List]>;

type Options = {
	Volume: VolumeOptions,
}

export type IOptions<T extends keyof List> = Partial<Options[T]>;
export type { Base };
