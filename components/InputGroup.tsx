
import React from 'react';

interface InputGroupProps {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  step?: string;
  min?: string;
  helperText?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, name, value, onChange, unit, step = "1", min = "0", helperText }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-slate-700 flex justify-between">
        {label}
        {unit && <span className="text-slate-400 font-normal italic">({unit})</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          step={step}
          min={min}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900 placeholder-slate-400"
        />
      </div>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};

export default InputGroup;
