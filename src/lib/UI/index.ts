import InputBase from './InputBase.ts';
import InputText, { type Options as TextOptions } from './InputText.ts';
import InputNumber, { type Options as NumberOptions } from './InputNumber.ts';
import InputSelect, { type Options as SelectOptions } from './InputSelect.ts';
import Dialog from './Dialog.ts';

const inputs = {
	text: InputText,
	number: InputNumber,
	select: InputSelect,
} as const;

export type InputOptionsList = {
	text: TextOptions,
	number: NumberOptions,
	select: SelectOptions,
}

export type InputTypes = keyof InputOptionsList;

export type InputOptions = InputOptionsList[InputTypes];

export { Dialog, inputs, InputBase, InputText, InputNumber, InputSelect };