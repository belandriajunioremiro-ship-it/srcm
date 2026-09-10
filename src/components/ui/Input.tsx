import { InputHTMLAttributes, ReactNode, useState, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, icon, className = '', ...props }, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== '' && props.value !== null

  return (
    <div className={`relative w-full ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-institutional-navy z-10 pointer-events-none flex items-center justify-center">
          {icon}
        </div>
      )}
      <input
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
        className={`peer w-full bg-white border border-gray-300 rounded-lg outline-none focus:border-institutional-navy focus:ring-1 focus:ring-institutional-navy transition-all px-3 py-3 text-text-main text-sm ${
          icon ? 'pl-10' : 'pl-3'
        } ${props.className || ''}`}
        placeholder={props.placeholder}
      />
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

Input.displayName = 'Input'

export default Input
