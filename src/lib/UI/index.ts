import InputBase from './InputBase.ts';
import InputText, { type Options as TextOptions } from './InputText.ts';
import InputNumber, { type Options as NumberOptions } from './InputNumber.ts';
import InputColor, { type Options as ColorOptions } from './InputColor.ts';
import InputSelect, { type Options as SelectOptions } from './InputSelect.ts';
import Dialog from './Dialog.ts';
import Popover from './Popover.ts';

const inputs = {
	text: InputText,
	number: InputNumber,
	color: InputColor,
	select: InputSelect,
} as const;

export type InputOptions = {
	text: TextOptions,
	number: NumberOptions,
	color: ColorOptions,
	select: SelectOptions,
}

export type InputTypes = keyof typeof inputs;

export { Dialog, Popover, inputs, InputBase, InputText, InputNumber, InputColor, InputSelect };