import { SelectHTMLAttributes, ReactNode, useState, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  icon?: ReactNode
  options: { label: string; value: string | number }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, icon, options, className = '', ...props }, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== '' && props.value !== null

  return (
    <div className={`relative w-full ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-institutional-navy z-10 pointer-events-none flex items-center justify-center">
          {icon}
        </div>
      )}
      <select
        {...props}
        ref={ref}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
        className={`peer w-full bg-white border border-gray-300 rounded-lg outline-none focus:border-institutional-navy focus:ring-1 focus:ring-institutional-navy transition-all px-3 py-3 text-text-main text-sm appearance-none ${
          icon ? 'pl-10' : 'pl-3'
        } ${props.className || ''}`}
      >
        <option value="" disabled hidden></option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronDown size={16} />
      </div>
      <label
        className={`absolute bg-white px-1 transition-colors duration-200 ease-in-out pointer-events-none z-10
          -top-2 left-2.5 text-xs
          ${isFocused ? 'text-institutional-navy' : 'text-institutional-slate'}
        `}
      >
        {label}
      </label>
    </div>
  )
})

Select.displayName = 'Select'

export default Select
