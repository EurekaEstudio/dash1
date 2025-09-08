import React from 'react';

type Preset = '7d' | '30d' | '90d';
interface Props {
  onSelect: (preset: Preset) => void;
  selected: string | null;
}

const presets: { id: Preset, label: string }[] = [
  { id: '7d', label: '7 Días' },
  { id: '30d', label: '30 Días' },
  { id: '90d', label: '90 Días' },
];

const DatePresetPicker: React.FC<Props> = ({ onSelect, selected }) => {
  return (
    <div className="flex items-center space-x-2">
      {presets.map(preset => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            selected === preset.id
              ? 'bg-primary-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default DatePresetPicker;
