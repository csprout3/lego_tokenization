"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  debounceMs?: number
}

export function TextInput({ 
  value, 
  onChange, 
  label, 
  placeholder,
  debounceMs = 0 
}: TextInputProps) {
  const [localValue, setLocalValue] = useState<string>(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Handle changes with optimized debouncing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (debounceMs <= 0) {
      onChange(newValue);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    }
  }, [onChange, debounceMs]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-1 text-yellow-900">{label}</label>}
      <Textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder || "Enter text to tokenize..."}
        className="w-full p-2 border border-yellow-300 rounded-md bg-yellow-50/70 focus:ring-yellow-500 focus:border-yellow-500"
        rows={3}
      />
    </div>
  )
}

