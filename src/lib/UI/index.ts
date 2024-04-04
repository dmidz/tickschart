import InputBase from './InputBase.ts';
import InputNumber, { type Options as NumberOptions } from './InputNumber.ts';
import InputSelect, { type Options as SelectOptions } from './InputSelect.ts';
import Dialog from './Dialog.ts';

const inputs = {
	number: InputNumber,
	select: InputSelect,
} as const;

export type InputOptionsList = {
	number: NumberOptions,
	select: SelectOptions,
}

export type InputTypes = keyof InputOptionsList;

export type InputOptions = InputOptionsList[InputTypes];

export { Dialog, inputs, InputBase, InputNumber, InputSelect };